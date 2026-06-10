import type { GamificationState, ProteinBadge } from "./types";

export const XP_PER_MEAL_BASE = 15;
export const XP_PER_PROTEIN_GRAM_DIVISOR = 10;

export type BadgeDefinition = {
  id: string;
  label: string;
  icon: string;
  check: (ctx: BadgeContext) => boolean;
};

export type BadgeContext = {
  gamification: GamificationState;
  totalProteinToday: number;
  goal: number;
  mealsToday: number;
  totalMealsAllTime: number;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first-scan",
    label: "First Scan",
    icon: "📸",
    check: ({ mealsToday }) => mealsToday >= 1,
  },
  {
    id: "goal-crusher",
    label: "Goal Crusher",
    icon: "💪",
    check: ({ totalProteinToday, goal }) => totalProteinToday >= goal,
  },
  {
    id: "streak-3",
    label: "3-Day Streak",
    icon: "🔥",
    check: ({ gamification }) => gamification.streak >= 3,
  },
  {
    id: "streak-7",
    label: "Week Warrior",
    icon: "🏆",
    check: ({ gamification }) => gamification.streak >= 7,
  },
  {
    id: "streak-30",
    label: "Monthly Master",
    icon: "🌟",
    check: ({ gamification }) => gamification.streak >= 30,
  },
  {
    id: "protein-100",
    label: "Century Club",
    icon: "💯",
    check: ({ totalProteinToday }) => totalProteinToday >= 100,
  },
  {
    id: "protein-150",
    label: "Power Plate",
    icon: "🥩",
    check: ({ totalProteinToday }) => totalProteinToday >= 150,
  },
  {
    id: "level-5",
    label: "Rising Star",
    icon: "⭐",
    check: ({ gamification }) => gamification.level >= 5,
  },
  {
    id: "level-10",
    label: "Protein Pro",
    icon: "🎖️",
    check: ({ gamification }) => gamification.level >= 10,
  },
  {
    id: "ten-meals",
    label: "Consistent Logger",
    icon: "📊",
    check: ({ totalMealsAllTime }) => totalMealsAllTime >= 10,
  },
];

export function xpForLevel(level: number): number {
  return level * 100;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level)) {
    level += 1;
  }
  return level;
}

export function xpProgressInLevel(xp: number, level: number): { current: number; toNext: number } {
  const toNext = xpForLevel(level);
  return { current: xp % toNext, toNext };
}

export function computeStreak(lastLogDate: string | null, today: string): number {
  if (!lastLogDate) return 1;

  if (lastLogDate === today) return 0; // caller should preserve existing streak

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  return lastLogDate === yesterdayKey ? -1 : 1; // -1 = increment, 1 = reset to 1
}

export function awardBadges(
  gamification: GamificationState,
  ctx: Omit<BadgeContext, "gamification">,
): ProteinBadge[] {
  const earned = [...gamification.badges];
  const hasBadge = (id: string) => earned.some((b) => b.id === id);
  const now = new Date().toISOString();
  const fullCtx: BadgeContext = { gamification, ...ctx };

  for (const badge of BADGE_DEFINITIONS) {
    if (badge.check(fullCtx) && !hasBadge(badge.id)) {
      earned.push({ id: badge.id, label: badge.label, icon: badge.icon, earnedAt: now });
    }
  }

  return earned;
}

export function applyMealGamification(
  gamification: GamificationState,
  totalProteinToday: number,
  goal: number,
  mealsToday: number,
  totalMealsAllTime: number,
  today: string = new Date().toISOString().slice(0, 10),
): GamificationState {
  let streak = gamification.streak;
  if (gamification.lastLogDate === today) {
    // same day — keep streak
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    streak = gamification.lastLogDate === yesterdayKey ? gamification.streak + 1 : 1;
  }

  const xpGain = XP_PER_MEAL_BASE + Math.round(totalProteinToday / XP_PER_PROTEIN_GRAM_DIVISOR);
  const xp = gamification.xp + xpGain;
  const level = levelFromXp(xp);
  const weeklyHeatmap = { ...gamification.weeklyHeatmap, [today]: totalProteinToday };

  const next: GamificationState = {
    ...gamification,
    xp,
    level,
    streak,
    lastLogDate: today,
    weeklyHeatmap,
    badges: awardBadges(gamification, {
      totalProteinToday,
      goal,
      mealsToday,
      totalMealsAllTime,
    }),
  };

  return next;
}

export const defaultGamification = (): GamificationState => ({
  xp: 0,
  level: 1,
  streak: 0,
  lastLogDate: null,
  badges: [],
  weeklyHeatmap: {},
});
