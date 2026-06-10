import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/hooks/useMembership";
import { isAbortLikeError } from "@/lib/errors";
import { analyzeFoodImage } from "@/lib/protein/analyzeFood";
import confetti from "canvas-confetti";

export const FOUNDER_EMAIL = "nikhath13@gmail.com";
export const FREE_DAILY_SCANS = 3;
export const DEFAULT_PROTEIN_GOAL = 150;

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type FoodAnalysis = {
  name: string;
  protein_g: number;
  calories?: number;
  carbs_g?: number;
  fat_g?: number;
  confidence: number;
  is_food: boolean;
  serving_size?: string;
  notes?: string;
  items?: Array<{
    name: string;
    category: string;
    portionGrams: number;
    proteinGrams: number;
    confidence: number;
  }>;
  totalProteinGrams?: number;
  reasoning?: string;
};

export type MealEntry = {
  id: string;
  name: string;
  protein_g: number;
  calories?: number;
  carbs_g?: number;
  fat_g?: number;
  imageUrl?: string;
  confirmed: boolean;
  createdAt: string;
  mealType: MealType;
};

export type ProteinBadge = {
  id: string;
  label: string;
  icon: string;
  earnedAt: string;
};

export type GamificationState = {
  xp: number;
  level: number;
  streak: number;
  lastLogDate: string | null;
  badges: ProteinBadge[];
  weeklyHeatmap: Record<string, number>;
};

export type ProteinSettings = {
  proteinGoal: number;
  darkMode: boolean;
};

type StoredState = {
  meals: MealEntry[];
  gamification: GamificationState;
  settings: ProteinSettings;
  dailyScans: Record<string, number>;
};

const STORAGE_PREFIX = "gradlify:protein";

const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultGamification = (): GamificationState => ({
  xp: 0,
  level: 1,
  streak: 0,
  lastLogDate: null,
  badges: [],
  weeklyHeatmap: {},
});

const defaultSettings = (): ProteinSettings => ({
  proteinGoal: DEFAULT_PROTEIN_GOAL,
  darkMode: false,
});

const xpForLevel = (level: number) => level * 100;

const storageKey = (userId: string | null) =>
  userId ? `${STORAGE_PREFIX}:${userId}` : `${STORAGE_PREFIX}:guest`;

function readStoredState(userId: string | null): StoredState {
  if (typeof window === "undefined") {
    return {
      meals: [],
      gamification: defaultGamification(),
      settings: defaultSettings(),
      dailyScans: {},
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
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      meals: Array.isArray(parsed.meals) ? parsed.meals : [],
      gamification: { ...defaultGamification(), ...parsed.gamification },
      settings: { ...defaultSettings(), ...parsed.settings },
      dailyScans: parsed.dailyScans ?? {},
    };
  } catch {
    return {
      meals: [],
      gamification: defaultGamification(),
      settings: defaultSettings(),
      dailyScans: {},
    };
  }
}

function writeStoredState(userId: string | null, state: StoredState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export async function analyzeFood(imageDataUrl: string): Promise<FoodAnalysis> {
  return analyzeFoodImage(imageDataUrl);
}

function awardBadges(
  gamification: GamificationState,
  totalProtein: number,
  goal: number,
  mealsToday: number,
): ProteinBadge[] {
  const earned = [...gamification.badges];
  const hasBadge = (id: string) => earned.some((b) => b.id === id);
  const now = new Date().toISOString();

  const checks: Array<{ id: string; label: string; icon: string; condition: boolean }> = [
    { id: "first-scan", label: "First Scan", icon: "📸", condition: mealsToday >= 1 },
    { id: "goal-crusher", label: "Goal Crusher", icon: "💪", condition: totalProtein >= goal },
    { id: "streak-3", label: "3-Day Streak", icon: "🔥", condition: gamification.streak >= 3 },
    { id: "streak-7", label: "Week Warrior", icon: "🏆", condition: gamification.streak >= 7 },
    { id: "protein-100", label: "Century Club", icon: "💯", condition: totalProtein >= 100 },
  ];

  for (const check of checks) {
    if (check.condition && !hasBadge(check.id)) {
      earned.push({ id: check.id, label: check.label, icon: check.icon, earnedAt: now });
    }
  }

  return earned;
}

function triggerGoalConfetti() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.65 },
    colors: ["#10b981", "#14b8a6", "#34d399", "#6ee7b7"],
  });
}

export function useProteinTracker() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [gamification, setGamification] = useState<GamificationState>(defaultGamification);
  const [settings, setSettings] = useState<ProteinSettings>(defaultSettings);
  const [dailyScans, setDailyScans] = useState<Record<string, number>>({});
  const [goalCelebratedToday, setGoalCelebratedToday] = useState(false);

  const { isPremium, isFounder, loading: membershipLoading } = useMembership();

  const isFounderEmail = user?.email?.toLowerCase() === FOUNDER_EMAIL.toLowerCase();
  const hasPremiumAccess = isFounderEmail || isFounder || isPremium;

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        const stored = readStoredState(currentUser?.id ?? null);
        setMeals(stored.meals);
        setGamification(stored.gamification);
        setSettings(stored.settings);
        setDailyScans(stored.dailyScans);
      } catch (error) {
        if (!isAbortLikeError(error)) console.error("[useProteinTracker] init error:", error);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      const stored = readStoredState(nextUser?.id ?? null);
      setMeals(stored.meals);
      setGamification(stored.gamification);
      setSettings(stored.settings);
      setDailyScans(stored.dailyScans);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const persist = useCallback(
    (next: Partial<StoredState>) => {
      const merged: StoredState = {
        meals: next.meals ?? meals,
        gamification: next.gamification ?? gamification,
        settings: next.settings ?? settings,
        dailyScans: next.dailyScans ?? dailyScans,
      };
      writeStoredState(user?.id ?? null, merged);
    },
    [dailyScans, gamification, meals, settings, user?.id],
  );

  const todayMeals = useMemo(
    () => meals.filter((m) => m.createdAt.startsWith(todayKey())),
    [meals],
  );

  const totals = useMemo(() => {
    const protein = todayMeals.reduce((sum, m) => sum + m.protein_g, 0);
    const calories = todayMeals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
    const carbs = todayMeals.reduce((sum, m) => sum + (m.carbs_g ?? 0), 0);
    const fat = todayMeals.reduce((sum, m) => sum + (m.fat_g ?? 0), 0);
    return { protein, calories, carbs, fat };
  }, [todayMeals]);

  const scansUsedToday = dailyScans[todayKey()] ?? 0;
  const scansRemaining = hasPremiumAccess
    ? Infinity
    : Math.max(0, FREE_DAILY_SCANS - scansUsedToday);
  const canScan = hasPremiumAccess || scansUsedToday < FREE_DAILY_SCANS;

  const progressPercent = Math.min(100, (totals.protein / settings.proteinGoal) * 100);
  const goalReached = totals.protein >= settings.proteinGoal;

  useEffect(() => {
    if (goalReached && !goalCelebratedToday) {
      triggerGoalConfetti();
      setGoalCelebratedToday(true);
    }
    if (!goalReached) setGoalCelebratedToday(false);
  }, [goalReached, goalCelebratedToday]);

  const updateGamificationOnMeal = useCallback(
    (nextMeals: MealEntry[]) => {
      const today = todayKey();
      const todayCount = nextMeals.filter((m) => m.createdAt.startsWith(today)).length;
      const todayProtein = nextMeals
        .filter((m) => m.createdAt.startsWith(today))
        .reduce((sum, m) => sum + m.protein_g, 0);

      setGamification((prev) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);

        let streak = prev.streak;
        if (prev.lastLogDate === today) {
          // same day
        } else if (prev.lastLogDate === yesterdayKey) {
          streak += 1;
        } else {
          streak = 1;
        }

        const xpGain = 15 + Math.round(todayProtein / 10);
        const xp = prev.xp + xpGain;
        let level = prev.level;
        while (xp >= xpForLevel(level)) {
          level += 1;
        }

        const weeklyHeatmap = { ...prev.weeklyHeatmap, [today]: todayProtein };
        const nextGamification: GamificationState = {
          ...prev,
          xp,
          level,
          streak,
          lastLogDate: today,
          weeklyHeatmap,
          badges: awardBadges(prev, todayProtein, settings.proteinGoal, todayCount),
        };
        persist({ gamification: nextGamification, meals: nextMeals });
        return nextGamification;
      });
    },
    [persist, settings.proteinGoal],
  );

  const incrementScanCount = useCallback(() => {
    const today = todayKey();
    setDailyScans((prev) => {
      const next = { ...prev, [today]: (prev[today] ?? 0) + 1 };
      persist({ dailyScans: next });
      return next;
    });
  }, [persist]);

  const scanFood = useCallback(
    async (imageDataUrl: string, mealType: MealType = "lunch") => {
      if (!canScan) {
        throw new Error("Daily scan limit reached. Upgrade for unlimited scans.");
      }

      setAnalyzing(true);
      try {
        const analysis = await analyzeFood(imageDataUrl);
        if (!analysis.is_food) {
          throw new Error(
            analysis.notes ||
              "That does not look like food. Please photograph your meal and try again.",
          );
        }
        if (!hasPremiumAccess) incrementScanCount();

        const entry: MealEntry = {
          id: crypto.randomUUID(),
          name: analysis.name,
          protein_g: analysis.protein_g,
          calories: analysis.calories,
          carbs_g: analysis.carbs_g,
          fat_g: analysis.fat_g,
          imageUrl: imageDataUrl,
          confirmed: false,
          createdAt: new Date().toISOString(),
          mealType,
        };

        const nextMeals = [entry, ...meals];
        setMeals(nextMeals);
        persist({ meals: nextMeals });
        return { entry, analysis };
      } finally {
        setAnalyzing(false);
      }
    },
    [canScan, hasPremiumAccess, incrementScanCount, meals, persist],
  );

  const confirmMeal = useCallback(
    (id: string, updates?: Partial<MealEntry>) => {
      const nextMeals = meals.map((m) =>
        m.id === id ? { ...m, ...updates, confirmed: true } : m,
      );
      setMeals(nextMeals);
      updateGamificationOnMeal(nextMeals);
      return nextMeals.find((m) => m.id === id) ?? null;
    },
    [meals, updateGamificationOnMeal],
  );

  const updateMeal = useCallback(
    (id: string, updates: Partial<MealEntry>) => {
      const nextMeals = meals.map((m) => (m.id === id ? { ...m, ...updates } : m));
      setMeals(nextMeals);
      persist({ meals: nextMeals });
      return nextMeals.find((m) => m.id === id) ?? null;
    },
    [meals, persist],
  );

  const removeMeal = useCallback(
    (id: string) => {
      const nextMeals = meals.filter((m) => m.id !== id);
      setMeals(nextMeals);
      persist({ meals: nextMeals });
    },
    [meals, persist],
  );

  const setProteinGoal = useCallback(
    (goal: number) => {
      const nextSettings = { ...settings, proteinGoal: Math.max(50, Math.min(300, goal)) };
      setSettings(nextSettings);
      persist({ settings: nextSettings });
    },
    [persist, settings],
  );

  const setDarkMode = useCallback(
    (darkMode: boolean) => {
      const nextSettings = { ...settings, darkMode };
      setSettings(nextSettings);
      persist({ settings: nextSettings });
    },
    [persist, settings],
  );

  const xpProgress = gamification.xp % xpForLevel(gamification.level);
  const xpToNext = xpForLevel(gamification.level);

  return {
    user,
    authLoading,
    membershipLoading,
    analyzing,
    hasPremiumAccess,
    isFounderEmail,
    canScan,
    scansUsedToday,
    scansRemaining,
    meals: todayMeals,
    allMeals: meals,
    totals,
    settings,
    gamification,
    progressPercent,
    goalReached,
    scanFood,
    confirmMeal,
    updateMeal,
    removeMeal,
    setProteinGoal,
    setDarkMode,
    analyzeFood,
    xpProgress,
    xpToNext,
  };
}
