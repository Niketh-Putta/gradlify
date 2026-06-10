import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crossValidateItem, FOOD_DATABASE_SUMMARY } from "../shared/proteinFoodDatabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const readEnv = (name: string) => Deno.env.get(name)?.trim() || "";

type AnalyzedItem = {
  name: string;
  category: string;
  portionGrams: number;
  proteinGrams: number;
  confidence: number;
};

type AnalysisResponse = {
  isFood: boolean;
  items: AnalyzedItem[];
  totalProteinGrams: number;
  reasoning: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJsonBlock(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;
  try {
    return JSON.parse(objectMatch[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeItems(raw: unknown): AnalyzedItem[] {
  if (!Array.isArray(raw)) return [];
  const items: AnalyzedItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;

    const portionGrams = Math.max(1, Number(row.portionGrams ?? row.portion_g ?? 100) || 100);
    const aiProtein = Math.max(0, Number(row.proteinGrams ?? row.protein_g ?? 0) || 0);
    const confidence = Math.min(1, Math.max(0, Number(row.confidence) || 0.7));

    items.push(crossValidateItem(name, aiProtein, portionGrams, confidence));
  }

  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = readEnv("SUPABASE_URL");
    const supabaseAnonKey = readEnv("SUPABASE_ANON_KEY");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      throw new Error("Please sign in before scanning food.");
    }

    const body = await req.json().catch(() => ({}));
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!image || image.length < 100) {
      throw new Error("Missing or invalid base64 image.");
    }

    const GEMINI_API_KEY = readEnv("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured.");
    }

    const dbSummary = JSON.stringify(FOOD_DATABASE_SUMMARY.slice(0, 40));
    const systemPrompt = `You are a nutrition vision assistant for Gradlify Protein Tracker.
Analyze food photos and return ONLY valid JSON with this exact shape:
{
  "isFood": boolean,
  "items": [
    {
      "name": string,
      "category": string,
      "portionGrams": number,
      "proteinGrams": number,
      "confidence": number
    }
  ],
  "totalProteinGrams": number,
  "reasoning": string
}

Rules:
- Differentiate distinct foods (chicken, rice, broccoli, cake, yogurt, etc.).
- Reject non-food images with isFood=false and empty items.
- Estimate realistic portion grams per visible serving.
- Use categories: meat, poultry, fish, seafood, dairy, eggs, legumes, grains, vegetables, fruits, nuts, snacks, desserts, supplements, other.
- Cross-check protein estimates against known values (sample database excerpt): ${dbSummary}`;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort("timeout"), 35000);

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: "Analyze this meal photo and return JSON only." },
                { inlineData: { mimeType, data: image } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
        signal: ctrl.signal,
      },
    );

    clearTimeout(timeout);

    const rawText = await geminiRes.text();
    if (!geminiRes.ok) {
      console.error("Gemini error", geminiRes.status, rawText.slice(0, 500));
      throw new Error("Food analysis service unavailable.");
    }

    let geminiData: Record<string, unknown> = {};
    try {
      geminiData = JSON.parse(rawText);
    } catch {
      throw new Error("Invalid Gemini response.");
    }

    const modelText =
      (geminiData?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }>)?.[0]
        ?.content?.parts?.[0]?.text ?? "";

    const parsed = extractJsonBlock(modelText);
    if (!parsed) {
      throw new Error("Could not parse food analysis.");
    }

    const isFood = parsed.isFood !== false && parsed.is_food !== false;
    let items = normalizeItems(parsed.items);

    if (isFood && items.length === 0) {
      const fallbackName = typeof parsed.name === "string" ? parsed.name : "Unknown meal";
      const portionGrams = Math.max(1, Number(parsed.portionGrams ?? 150) || 150);
      const aiProtein = Math.max(0, Number(parsed.proteinGrams ?? parsed.totalProteinGrams ?? 0) || 0);
      items = [crossValidateItem(fallbackName, aiProtein, portionGrams, 0.6)];
    }

    const totalProteinGrams = Math.round(
      (Number(parsed.totalProteinGrams) || items.reduce((sum, item) => sum + item.proteinGrams, 0)) * 10,
    ) / 10;

    const response: AnalysisResponse = {
      isFood,
      items,
      totalProteinGrams,
      reasoning:
        typeof parsed.reasoning === "string"
          ? parsed.reasoning
          : isFood
          ? "Vision model estimate cross-validated against embedded food database."
          : "Image does not appear to contain food.",
    };

    return jsonResponse(response as unknown as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze food image.";
    return jsonResponse({ error: message }, 400);
  }
});
