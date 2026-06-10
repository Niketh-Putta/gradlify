import { motion } from "framer-motion";
import { Flame, Medal, Star, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GamificationState } from "@/hooks/useProteinTracker";

type Props = {
  gamification: GamificationState;
  xpProgress: number;
  xpToNext: number;
  className?: string;
};

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function heatColor(protein: number): string {
  if (protein >= 120) return "bg-emerald-500";
  if (protein >= 80) return "bg-teal-400";
  if (protein >= 40) return "bg-amber-400";
  if (protein > 0) return "bg-orange-300";
  return "bg-slate-200 dark:bg-slate-800";
}

export function ProteinGamification({
  gamification,
  xpProgress,
  xpToNext,
  className,
}: Props) {
  const weekDays = getLast7Days();
  const dayLabels = weekDays.map((d) =>
    new Date(d).toLocaleDateString([], { weekday: "narrow" }),
  );
  const xpPercent = xpToNext > 0 ? (xpProgress / xpToNext) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="rounded-3xl border-slate-100 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Level {gamification.level}
            </span>
            <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
              {gamification.xp} XP
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Progress to Level {gamification.level + 1}</span>
              <span>
                {xpProgress}/{xpToNext} XP
              </span>
            </div>
            <Progress
              value={xpPercent}
              className="h-2.5"
              indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 dark:from-orange-950/30 dark:to-amber-950/20">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: gamification.streak > 0 ? [1, 1.08, 1] : 1 }}
                transition={{ repeat: gamification.streak > 0 ? Infinity : 0, duration: 1.8 }}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-900"
              >
                <Flame className={cn("h-5 w-5", gamification.streak > 0 ? "text-orange-500" : "text-slate-300")} />
              </motion.div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{gamification.streak}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Day streak</p>
              </div>
            </div>
            <Trophy className="h-8 w-8 text-amber-400/80" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-slate-100 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date, i) => {
              const protein = gamification.weeklyHeatmap[date] ?? 0;
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-400">{dayLabels[i]}</span>
                  <motion.div
                    initial={{ scaleY: 0.4 }}
                    animate={{ scaleY: 1 }}
                    className={cn("h-10 w-full rounded-lg", heatColor(protein))}
                    title={`${protein}g protein`}
                  />
                  <span className="text-[9px] text-slate-400">{protein > 0 ? `${protein}g` : "—"}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-slate-100 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="h-4 w-4 text-teal-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gamification.badges.length === 0 ? (
            <p className="text-sm text-slate-500">Log meals to earn your first badge.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {gamification.badges.map((badge) => (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.04 }}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                >
                  <span className="text-lg">{badge.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{badge.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
