import { supabase } from "@/integrations/supabase/client";
import { defaultGamification } from "./gamification";
import {
  DEFAULT_PROTEIN_GOAL,
  type ActivityLevel,
  type GamificationState,
  type OfflineProteinState,
  type ProteinMealLog,
  type ProteinProfile,
  type ProteinScanFeedback,
  type ProteinSettings,
} from "./types";

const STORAGE_PREFIX = "gradlify:protein";

const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultSettings = (): ProteinSettings => ({
  proteinGoal: DEFAULT_PROTEIN_GOAL,
  darkMode: false,
  activityLevel: "moderate",
});

function storageKey(userId: string | null) {
  return userId ? `${STORAGE_PREFIX}:${userId}` : `${STORAGE_PREFIX}:guest`;
}

function readOfflineState(userId: string | null): OfflineProteinState {
  if (typeof window === "undefined") {
    return {
      meals: [],
      gamification: defaultGamification(),
      settings: defaultSettings(),
      dailyScans: {},
      pendingSync: false,
    };
  }

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return {
        meals: [],
        gamification: defaultGamification(),
        settings: defaultSettings(),
        dailyScans: {},
        pendingSync: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<OfflineProteinState>;
    return {
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      gamification: { ...defaultGamification(), ...parsed.gamification },
      settings: { ...defaultSettings(), ...parsed.settings },
      dailyScans: parsed.dailyScans ?? {},
      pendingSync: Boolean(parsed.pendingSync),
    };
  } catch {
    return {
      meals: [],
      gamification: defaultGamification(),
      settings: defaultSettings(),
      dailyScans: {},
      pendingSync: false,
    };
  }
}

function writeOfflineState(userId: string | null, state: OfflineProteinState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

function profileToSettings(profile: ProteinProfile): ProteinSettings {
  return {
    proteinGoal: Number(profile.daily_goal_g) || DEFAULT_PROTEIN_GOAL,
    darkMode: false,
    weightKg: profile.weight_kg,
    activityLevel: profile.activity_level as ActivityLevel,
  };
}

function gamificationFromProfile(profile: ProteinProfile): GamificationState {
  return {
    ...defaultGamification(),
    xp: profile.xp,
    level: profile.level,
    streak: profile.streak_count,
  };
}

export async function fetchProteinProfile(userId: string): Promise<ProteinProfile | null> {
  const { data, error } = await supabase
    .from("protein_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProteinProfile | null;
}

export async function upsertProteinProfile(
  userId: string,
  patch: Partial<Pick<ProteinProfile, "daily_goal_g" | "weight_kg" | "activity_level" | "is_premium" | "streak_count" | "xp" | "level">>,
): Promise<ProteinProfile> {
  const { data, error } = await supabase
    .from("protein_profiles")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as ProteinProfile;
}

export async function fetchMealLogs(userId: string, limit = 100): Promise<ProteinMealLog[]> {
  const { data, error } = await supabase
    .from("protein_meal_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ProteinMealLog[];
}

export async function insertMealLog(
  userId: string,
  log: Omit<ProteinMealLog, "id" | "user_id" | "created_at"> & { id?: string },
): Promise<ProteinMealLog> {
  const payload = { user_id: userId, ...log };
  const { data, error } = await supabase
    .from("protein_meal_logs")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    const offline = readOfflineState(userId);
    const fallback: ProteinMealLog = {
      id: log.id ?? crypto.randomUUID(),
      user_id: userId,
      food_name: log.food_name,
      food_category: log.food_category,
      portion_g: log.portion_g,
      protein_g: log.protein_g,
      confidence: log.confidence,
      is_food: log.is_food,
      image_url: log.image_url,
      ai_raw_json: log.ai_raw_json,
      created_at: new Date().toISOString(),
    };
    writeOfflineState(userId, {
      ...offline,
      meals: [fallback, ...offline.meals],
      pendingSync: true,
    });
    return fallback;
  }

  return data as ProteinMealLog;
}

export async function deleteMealLog(userId: string, mealId: string): Promise<void> {
  const { error } = await supabase
    .from("protein_meal_logs")
    .delete()
    .eq("user_id", userId)
    .eq("id", mealId);

  if (error) {
    const offline = readOfflineState(userId);
    writeOfflineState(userId, {
      ...offline,
      meals: offline.meals.filter((m) => m.id !== mealId),
      pendingSync: true,
    });
    return;
  }

  const offline = readOfflineState(userId);
  writeOfflineState(userId, {
    ...offline,
    meals: offline.meals.filter((m) => m.id !== mealId),
  });
}

export async function submitScanFeedback(
  userId: string,
  feedback: Omit<ProteinScanFeedback, "id" | "user_id" | "created_at">,
): Promise<ProteinScanFeedback> {
  const { data, error } = await supabase
    .from("protein_scan_feedback")
    .insert({ user_id: userId, ...feedback })
    .select("*")
    .single();

  if (error) throw error;
  return data as ProteinScanFeedback;
}

export async function loadProteinState(userId: string | null): Promise<OfflineProteinState> {
  const offline = readOfflineState(userId);

  if (!userId) return offline;

  try {
    const [profile, meals] = await Promise.all([
      fetchProteinProfile(userId),
      fetchMealLogs(userId),
    ]);

    if (!profile && meals.length === 0) return offline;

    return {
      meals: meals.length > 0 ? meals : offline.meals,
      gamification: profile ? gamificationFromProfile(profile) : offline.gamification,
      settings: profile ? profileToSettings(profile) : offline.settings,
      dailyScans: offline.dailyScans,
      pendingSync: offline.pendingSync,
    };
  } catch {
    return { ...offline, pendingSync: true };
  }
}

export function persistProteinState(userId: string | null, state: Partial<OfflineProteinState>) {
  const current = readOfflineState(userId);
  writeOfflineState(userId, { ...current, ...state });
}

export function incrementDailyScanCount(userId: string | null): number {
  const state = readOfflineState(userId);
  const today = todayKey();
  const nextCount = (state.dailyScans[today] ?? 0) + 1;
  persistProteinState(userId, {
    dailyScans: { ...state.dailyScans, [today]: nextCount },
  });
  return nextCount;
}

export function getDailyScanCount(userId: string | null): number {
  const state = readOfflineState(userId);
  return state.dailyScans[todayKey()] ?? 0;
}

export async function syncOfflineMeals(userId: string): Promise<number> {
  const offline = readOfflineState(userId);
  if (!offline.pendingSync || offline.meals.length === 0) return 0;

  let synced = 0;
  for (const meal of offline.meals) {
    try {
      await insertMealLog(userId, meal);
      synced += 1;
    } catch {
      break;
    }
  }

  if (synced > 0) {
    writeOfflineState(userId, { ...offline, pendingSync: false });
  }

  return synced;
}

export async function checkUnlimitedScans(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("protein_user_has_unlimited_scans", {
    p_user_id: userId,
  });

  if (error) {
    const profile = await fetchProteinProfile(userId).catch(() => null);
    return Boolean(profile?.unlimited_scans || profile?.is_premium);
  }

  return Boolean(data);
}
