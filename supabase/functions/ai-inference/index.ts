// Deno Edge Function – robust CORS + tolerant JSON + safe Gemini call.
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
  prompt: z.string().min(1).max(5000).optional(),
  question: z.string().min(1).max(5000).optional(),
  examBoard: z.string().optional(),
  sessionId: z.string().optional(),
  images: z.array(z.object({
    dataUrl: z.string().min(20)
  })).max(2).optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string().max(5000)
  })).max(20).optional()
}).refine(data => data.prompt || data.question || data.messages || data.images, {
  message: "Either prompt, question, messages, or images must be provided"
});

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
      if (createErr) console.warn("Could not create chat-uploads bucket:", createErr.message);
      return;
    }
    if (!existing.public) {
      await supabase.storage.updateBucket(CHAT_IMAGES_BUCKET, { public: true });
    }
  } catch (err) {
    console.warn("Exception ensuring chat-uploads bucket:", err);
  }
}

function parseDataUrl(dataUrl: string): { bytes: Uint8Array; contentType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1];
  const base64 = match[2];
  try {
    const bin = atob(base64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { bytes, contentType, base64 };
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
  if (error) return null;
  const { data } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(fileName);
  return data?.publicUrl || null;
}

Deno.serve(async (req: Request) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });
  if (!AI_FEATURE_ENABLED) return new Response(JSON.stringify({ error: "Feature unavailable" }), { status: 403, headers });

  let payload;
  try { payload = await req.json(); } catch { return ok({ answer: "Sorry, I couldn't understand the request." }, headers); }

  try {
    const validated = requestSchema.parse(payload);
    const prompt = validated.prompt ?? validated.question ?? null;
    const messages = Array.isArray(validated.messages) ? validated.messages : null;
    const examBoard = typeof validated.examBoard === "string" ? validated.examBoard.trim() : null;
    const images = Array.isArray(validated.images) ? validated.images : [];
    const sessionId = typeof validated.sessionId === "string" ? validated.sessionId : null;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
    if (!GEMINI_API_KEY) {
      return ok({ answer: "🧪 Stub: Gemini key not configured." }, headers);
    }

    let imageUrls: string[] = [];
    let inlineImages: Array<{ mimeType: string, data: string }> = [];

    if (images.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await ensureChatUploadsBucket(supabase);
        const uploads = await Promise.all(
          images.map((img, idx) => uploadChatImage(supabase, img.dataUrl, sessionId, idx))
        );
        imageUrls = uploads.filter(Boolean) as string[];
      }

      for (const img of images) {
        const parsed = parseDataUrl(img.dataUrl);
        if (parsed) inlineImages.push({ mimeType: parsed.contentType, data: parsed.base64 });
      }
    }

    const boardLabel = examBoard && examBoard !== "Unsure" ? ` ${examBoard}` : "";
    const systemPrompt = `You are Gradlify Study Buddy, a GCSE${boardLabel} Maths tutor. Use correct maths notation, clear step-by-step explanations, and concise answers. If asked a generic ambiguous question, ask a short clarifying question. When helpful, end with one brief follow-up question.`;

    const contents = [];

    if (messages) {
      for (const m of messages) {
        let role = m.role.toLowerCase() === "assistant" || m.role.toLowerCase() === "ai" ? "model" : "user";
        if (role === "system") continue; // system prompt goes elsewhere in Gemini
        contents.push({ role, parts: [{ text: m.content }] });
      }
    } else if (prompt) {
      contents.push({ role: "user", parts: [{ text: prompt }] });
    } else if (inlineImages.length > 0) {
      contents.push({ role: "user", parts: [{ text: "Please analyze the attached image(s)." }] });
    }

    if (inlineImages.length > 0) {
      const parts = inlineImages.map(img => ({ inlineData: img }));
      if (contents.length > 0) {
        const last = contents[contents.length - 1];
        if (last.role === "user") {
          last.parts.push(...parts as any[]);
        } else {
          contents.push({ role: "user", parts });
        }
      } else {
        contents.push({ role: "user", parts });
      }
    }

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort("timeout"), 30000);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.2 },
      }),
      signal: ctrl.signal,
    }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));

    clearTimeout(to);

    if (!("ok" in res)) return ok({ answer: "Sorry, I couldn't fetch that just now." }, headers);

    const raw = await (res as any).text();
    let data: any = { raw };
    try { data = JSON.parse(raw); } catch {}

    if (!(res as any).ok) {
      console.error("Gemini API error", { status: (res as any).status, response: raw.slice(0, 1000) });
      return ok({ answer: "Sorry, I couldn't generate an answer just now." }, headers);
    }

    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    return ok({ answer, image_urls: imageUrls }, headers);
  } catch (err) {
    console.error('Validation error:', err);
    return ok({ answer: "Sorry, I couldn't process the request." }, headers);
  }
});
