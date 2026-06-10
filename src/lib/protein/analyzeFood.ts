import { supabase } from "@/integrations/supabase/client";
import { estimateProteinFromDatabase, lookupFood, validateFoodAgainstDatabase } from "./foodDatabase";
import type { FoodAnalysis, FoodAnalysisResult } from "./types";

function parseDataUrl(image: string): { mimeType: string; base64: string } | null {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    if (image.length > 100 && !image.includes(" ")) {
      return { mimeType: "image/jpeg", base64: image };
    }
    return null;
  }
  return { mimeType: match[1], base64: match[2] };
}

function normalizeEdgeResult(data: unknown): FoodAnalysisResult | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  const nested =
    record.result && typeof record.result === "object"
      ? (record.result as Record<string, unknown>)
      : record;

  const isFood = nested.isFood !== false && nested.is_food !== false;
  const itemsRaw = Array.isArray(nested.items) ? nested.items : [];

  const items = itemsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name : "";
      if (!name) return null;
      const portionGrams = Number(row.portionGrams ?? row.portion_g ?? 100) || 100;
      let proteinGrams = Number(row.proteinGrams ?? row.protein_g ?? 0) || 0;
      let confidence = Number(row.confidence) || 0.7;

      const validation = validateFoodAgainstDatabase(name, proteinGrams, portionGrams);
      if (validation.matched) {
        proteinGrams = validation.adjustedProteinGrams;
        confidence = Math.min(1, confidence + validation.confidenceBoost);
      }

      return {
        name,
        category: typeof row.category === "string" ? row.category : "other",
        portionGrams,
        proteinGrams,
        confidence,
      };
    })
    .filter(Boolean) as FoodAnalysisResult["items"];

  const totalProteinGrams =
    Number(nested.totalProteinGrams ?? nested.total_protein_g) ||
    items.reduce((sum, item) => sum + item.proteinGrams, 0);

  return {
    isFood,
    items,
    totalProteinGrams,
    reasoning: typeof nested.reasoning === "string" ? nested.reasoning : "",
  };
}

function resultToLegacyAnalysis(result: FoodAnalysisResult): FoodAnalysis {
  const primary = result.items[0];
  const name = primary?.name ?? (result.isFood ? "Estimated meal" : "Not food");
  const portion = primary?.portionGrams ?? 100;

  return {
    name,
    protein_g: result.totalProteinGrams,
    confidence: primary?.confidence ?? (result.isFood ? 0.7 : 0.9),
    is_food: result.isFood,
    serving_size: `${portion}g`,
    notes: result.reasoning || undefined,
    items: result.items,
    totalProteinGrams: result.totalProteinGrams,
    reasoning: result.reasoning,
  };
}

function fallbackLocalAnalysis(imageLabel = "meal"): FoodAnalysisResult {
  const estimate = estimateProteinFromDatabase(imageLabel);
  if (estimate) {
    return {
      isFood: true,
      items: [
        {
          name: estimate.food.name,
          category: estimate.food.category,
          portionGrams: estimate.portionGrams,
          proteinGrams: estimate.proteinGrams,
          confidence: 0.55,
        },
      ],
      totalProteinGrams: estimate.proteinGrams,
      reasoning: "Local food database fallback — please confirm portion and food name.",
    };
  }

  return {
    isFood: true,
    items: [
      {
        name: "Estimated meal",
        category: "other",
        portionGrams: 150,
        proteinGrams: 25,
        confidence: 0.45,
      },
    ],
    totalProteinGrams: 25,
    reasoning: "Generic fallback estimate — edge function unavailable.",
  };
}

export async function analyzeFoodImage(imageDataUrl: string): Promise<FoodAnalysis> {
  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) {
    throw new Error("Invalid image payload. Expected base64 or data URL.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const headers = sessionData.session?.access_token
    ? { Authorization: `Bearer ${sessionData.session.access_token}` }
    : undefined;

  const { data, error } = await supabase.functions.invoke("analyze-food-protein", {
    body: {
      image: parsed.base64,
      mimeType: parsed.mimeType,
    },
    headers,
  });

  if (!error) {
    const normalized = normalizeEdgeResult(data);
    if (normalized) return resultToLegacyAnalysis(normalized);
  }

  return resultToLegacyAnalysis(fallbackLocalAnalysis());
}

export function validateAnalysisLocally(
  name: string,
  proteinGrams: number,
  portionGrams?: number,
): FoodAnalysis {
  const food = lookupFood(name);
  const validation = validateFoodAgainstDatabase(name, proteinGrams, portionGrams);

  return {
    name: food?.name ?? name,
    protein_g: validation.adjustedProteinGrams,
    confidence: validation.matched ? 0.85 : 0.6,
    is_food: true,
    serving_size: portionGrams ? `${portionGrams}g` : food?.typicalPortionG ? `${food.typicalPortionG}g` : "1 serving",
    notes: validation.matched ? "Validated against local food database." : "No database match.",
  };
}
