// Deno Edge Function – robust CORS + tolerant JSON + safe OpenAI call.
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { AI_FEATURE_ENABLED } from "../shared/featureFlags.ts";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const requestSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty").max(5000, "Prompt too long (max 5000 characters)").optional(),
  question: z.string().min(1).max(5000).optional(),
  examBoard: z.string().optional(),
  sessionId: z.string().optional(),
  images: z.array(z.object({
    dataUrl: z.string().min(20)
  })).max(2, "Too many images (max 2)").optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string().max(5000, "Message content too long (max 5000 characters)")
  })).max(20, "Too many messages (max 20)").optional()
}).refine(data => data.prompt || data.question || data.messages || data.images, {
  message: "Either prompt, question, messages, or images must be provided"
});

type AiRole = "system" | "user" | "assistant";
type AiMessage = {
  role: AiRole;
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

type OpenAIResponse = {
  choices?: Array<{ message?: { content?: string | null }; text?: string | null }>;
  [key: string]: unknown;
};

function normalizeRole(role: string): AiRole {
  const r = String(role || "").toLowerCase().trim();
  if (r === "assistant" || r === "ai") return "assistant";
  if (r === "system") return "system";
  return "user";
}

function buildSystemPrompt(examBoard?: string | null): AiMessage {
  const boardLabel = examBoard && examBoard !== "Unsure" ? ` ${examBoard}` : "";
  return {
    role: "system",
    content:
      `You are Gradlify Study Buddy, a GCSE${boardLabel} Maths tutor. ` +
      "Use correct maths notation, clear step-by-step explanations, and concise answers. " +
      "Maintain conversation context across messages. " +
      "If the user's request is ambiguous, ask a short clarifying question. " +
      "When helpful, end with one brief follow-up question to check understanding.",
  };
}

function coerceMessages(messages: Array<{ role: string; content: string }>): AiMessage[] {
  const out: AiMessage[] = [];
  for (const m of messages) {
    const content = String(m?.content ?? "").trim();
    if (!content) continue;
    out.push({ role: normalizeRole(String(m?.role ?? "user")), content });
  }
  return out;
}

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const h = new Headers(JSON_HEADERS);
  if (origin) h.set("Access-Control-Allow-Origin", origin);
  return h;
}

function ok(body: unknown, headers: Headers) {
  return new Response(JSON.stringify(body), { status: 200, headers });
}

const CHAT_IMAGES_BUCKET = "chat-uploads";

async function ensureChatUploadsBucket(supabase: ReturnType<typeof createClient>) {
  try {
    const { data: existing, error: getErr } = await supabase.storage.getBucket(CHAT_IMAGES_BUCKET);
    if (getErr || !existing) {
      const { error: createErr } = await supabase.storage.createBucket(CHAT_IMAGES_BUCKET, { public: true });
      if (createErr) {
        console.warn("Could not create chat-uploads bucket:", createErr.message);
      }
      return;
    }
    if (!existing.public) {
      const { error: updateErr } = await supabase.storage.updateBucket(CHAT_IMAGES_BUCKET, { public: true });
      if (updateErr) {
        console.warn("Could not set chat-uploads bucket public:", updateErr.message);
      }
    }
  } catch (err) {
    console.warn("Exception ensuring chat-uploads bucket:", err);
  }
}

function parseDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1];
  const b64 = match[2];
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { bytes, contentType };
  } catch {
    return null;
  }
}

async function uploadChatImage(supabase: ReturnType<typeof createClient>, dataUrl: string, sessionId?: string | null, index?: number) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const ext = parsed.contentType.split("/")[1] || "png";
  const safeSession = sessionId ? sessionId.replace(/[^a-zA-Z0-9_-]/g, "") : "anon";
  const fileName = `${safeSession}/${Date.now()}-${index ?? 0}.${ext}`;
  const { error } = await supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .upload(fileName, parsed.bytes, { contentType: parsed.contentType, upsert: false });
  if (error) {
    console.warn("Chat image upload failed:", error.message);
    return null;
  }
  const { data } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(fileName);
  return data?.publicUrl || null;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers });
  }
  if (!AI_FEATURE_ENABLED) {
    return new Response(
      JSON.stringify({ error: "Feature unavailable" }),
      { status: 403, headers }
    );
  }

  const start = Date.now();
  let payload: unknown = null;
  try { 
    payload = await req.json(); 
  } catch { 
    return ok({
      answer: "Sorry, I couldn't understand the request."
    }, headers);
  }

  // Validate input
  try {
    const validated = requestSchema.parse(payload);
    
    // Accept many shapes
    const prompt: string | null =
      validated.prompt ?? validated.question ?? null;
    const messages: Array<{ role: string; content: string }> | null =
      Array.isArray(validated.messages) ? validated.messages : null;
    const examBoard = typeof validated.examBoard === "string" ? validated.examBoard.trim() : null;
    const images = Array.isArray(validated.images) ? validated.images : [];
    const sessionId = typeof validated.sessionId === "string" ? validated.sessionId : null;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    // If no key, return a stubbed answer (still 200)
    if (!OPENAI_API_KEY) {
      const text = prompt
        ? `🧪 Stub: You asked → "${prompt}". (OpenAI key not set.)`
        : `🧪 Stub: You sent ${messages!.length} messages. (OpenAI key not set.)`;
      return ok({
        answer: text
      }, headers);
    }

    try {
      let imageUrls: string[] = [];
      let imageSources: string[] = [];
      if (images.length > 0) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        let uploads: Array<string | null> = images.map(() => null);
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await ensureChatUploadsBucket(supabase);
          uploads = await Promise.all(
            images.map((img, idx) => uploadChatImage(supabase, img.dataUrl, sessionId, idx))
          );
        }
        imageUrls = uploads.filter(Boolean) as string[];
        imageSources = uploads
          .map((url, idx) => url ?? images[idx]?.dataUrl)
          .filter(Boolean) as string[];
      }

      // Build a safe request compatible with Chat Completions
      const system = buildSystemPrompt(examBoard);
      const baseMessages: AiMessage[] = messages
        ? [system, ...coerceMessages(messages)]
        : [system, { role: "user", content: String(prompt || "Please analyze the attached image(s).") }];

      if (imageSources.length > 0) {
        const lastIdx = baseMessages.map((m) => m.role).lastIndexOf("user");
        const fallbackText = String(prompt || "Please analyze the attached image(s).");
        const textPart = { type: "text" as const, text: fallbackText };
        const imageParts = imageSources.map((url) => ({ type: "image_url" as const, image_url: { url } }));
        if (lastIdx >= 0) {
          const existing = baseMessages[lastIdx];
          const textContent = typeof existing.content === "string" ? existing.content : fallbackText;
          baseMessages[lastIdx] = {
            ...existing,
            content: [ { type: "text", text: textContent }, ...imageParts ],
          };
        } else {
          baseMessages.push({ role: "user", content: [textPart, ...imageParts] });
        }
      }

      // Ensure we never exceed the API/schema cap.
      const cappedMessages = baseMessages.slice(0, 20);

      // 30s timeout so it never hangs
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort("timeout"), 30000);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: cappedMessages,
          temperature: 0.2,
        }),
        signal: ctrl.signal,
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) } as FetchLikeResponse));

      clearTimeout(to);

      if (!("ok" in res)) {
        // Network-level failure
        return ok({
          answer: "Sorry, I couldn't fetch that just now."
        }, headers);
      }

      const raw = await res.text();
      let data: OpenAIResponse | null = null;
      try { data = JSON.parse(raw) as OpenAIResponse; } catch { data = { raw }; }

      if (!res.ok) {
        const rawSnippet = raw.slice(0, 2000);
        console.error("OpenAI API error", {
          status: res.status,
          model,
          sessionId,
          response: rawSnippet,
        });
        // OpenAI error - return fallback
        return ok({
          answer: "Sorry, I couldn't fetch that just now."
        }, headers);
      }

      const answer =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        "";

      return ok({
        answer,
        image_urls: imageUrls,
      }, headers);
    } catch (err) {
      // Never surface 5xx – always 200 JSON
      return ok({
        answer: "Sorry, I couldn't fetch that just now."
      }, headers);
    }
  } catch (validationError) {
    // Validation error
    console.error('Validation error:', validationError);
    return ok({
      answer: "Sorry, I couldn't understand the request."
    }, headers);
  }
});
