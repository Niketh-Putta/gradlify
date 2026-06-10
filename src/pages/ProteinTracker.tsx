import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { ArrowLeft, Beef, Moon, Settings2, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProteinAuthGate } from "@/components/protein/ProteinAuthGate";
import { ProteinRing } from "@/components/protein/ProteinRing";
import { FoodScanner } from "@/components/protein/FoodScanner";
import { MealLogList } from "@/components/protein/MealLogList";
import { FoodConfirmModal } from "@/components/protein/FoodConfirmModal";
import { ProteinGamification } from "@/components/protein/ProteinGamification";
import { ProteinPaywall } from "@/components/protein/ProteinPaywall";
import { ProteinSettings } from "@/components/protein/ProteinSettings";
import { ProteinWhatsNew } from "@/components/protein/ProteinWhatsNew";
import {
  useProteinTracker,
  type FoodAnalysis,
  type MealEntry,
} from "@/hooks/useProteinTracker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ProteinTracker() {
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const tracker = useProteinTracker();

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingMeal, setPendingMeal] = useState<MealEntry | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<FoodAnalysis | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [goalInput, setGoalInput] = useState(String(tracker.settings.proteinGoal));

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  useEffect(() => {
    setGoalInput(String(tracker.settings.proteinGoal));
  }, [tracker.settings.proteinGoal]);

  useEffect(() => {
    const dark = tracker.settings.darkMode;
    setTheme(dark ? "dark" : "light");
  }, [tracker.settings.darkMode, setTheme]);

  const handleScan = async (imageDataUrl: string, mealType: MealEntry["mealType"]) => {
    try {
      const result = await tracker.scanFood(imageDataUrl, mealType);
      setPendingMeal(result.entry);
      setPendingAnalysis(result.analysis);
      setEditingMeal(null);
      setConfirmOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      if (message.includes("limit")) setPaywallOpen(true);
      else toast.error(message);
    }
  };

  const handleConfirm = (updates: Partial<MealEntry>) => {
    const id = editingMeal?.id ?? pendingMeal?.id;
    if (!id) return;

    if (editingMeal?.confirmed) {
      tracker.updateMeal(id, updates);
      toast.success("Meal updated");
    } else {
      tracker.confirmMeal(id, updates);
      toast.success("Meal logged");
    }

    setPendingMeal(null);
    setPendingAnalysis(null);
    setEditingMeal(null);
  };

  const handleEdit = (meal: MealEntry) => {
    setEditingMeal(meal);
    setPendingMeal(meal);
    setPendingAnalysis(null);
    setConfirmOpen(true);
  };

  const handleQuickConfirm = (meal: MealEntry) => {
    tracker.confirmMeal(meal.id);
    toast.success("Meal confirmed");
  };

  if (tracker.authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!tracker.user) {
    return <ProteinAuthGate redirectPath="/protein" />;
  }

  const macroItems = [
    { label: "Calories", value: tracker.totals.calories, max: 2500, color: "from-amber-400 to-orange-400" },
    { label: "Carbs", value: tracker.totals.carbs, max: 300, color: "from-sky-400 to-blue-400" },
    { label: "Fat", value: tracker.totals.fat, max: 100, color: "from-violet-400 to-purple-400" },
  ];

  return (
    <div
      className={cn(
        "min-h-[100dvh] pb-32",
        tracker.settings.darkMode
          ? "bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white"
          : "bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 text-slate-900",
      )}
    >
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Beef className="h-5 w-5 text-emerald-500" />
            <span className="font-black tracking-tight">Protein Tracker</span>
            {tracker.hasPremiumAccess && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-300">
                {tracker.isFounderEmail ? "Founder" : "Premium"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl"
              aria-label="Open settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-400" />
            )}
            <Switch
              checked={tracker.settings.darkMode}
              onCheckedChange={tracker.setDarkMode}
              aria-label="Toggle dark mode"
            />
          </div>
        </div>
      </header>

      <p className="mx-auto max-w-lg px-4 pt-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {todayLabel}
      </p>

      <main className="mx-auto max-w-lg space-y-6 px-4 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <ProteinRing
            current={tracker.totals.protein}
            goal={tracker.settings.proteinGoal}
          />

          <div className="mt-4 flex items-center gap-2">
            <Label htmlFor="protein-goal" className="text-xs uppercase tracking-wider text-slate-500">
              Daily goal
            </Label>
            <Input
              id="protein-goal"
              type="number"
              min={50}
              max={300}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onBlur={() => tracker.setProteinGoal(Number(goalInput) || tracker.settings.proteinGoal)}
              className="h-8 w-20 rounded-xl text-center text-sm"
            />
            <span className="text-sm text-slate-500">g</span>
          </div>
        </motion.section>

        <section className="space-y-3 rounded-3xl border border-slate-100 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Macros today</h3>
          {macroItems.map((macro) => (
            <div key={macro.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{macro.label}</span>
                <span className="text-slate-500">
                  {Math.round(macro.value)}
                  {macro.label === "Calories" ? " kcal" : "g"}
                </span>
              </div>
              <Progress
                value={Math.min(100, (macro.value / macro.max) * 100)}
                className="h-2"
                indicatorClassName={cn("bg-gradient-to-r", macro.color)}
              />
            </div>
          ))}
        </section>

        <ProteinGamification
          gamification={tracker.gamification}
          xpProgress={tracker.xpProgress}
          xpToNext={tracker.xpToNext}
        />

        <ProteinWhatsNew />

        <MealLogList
          meals={tracker.meals}
          onEdit={handleEdit}
          onConfirm={handleQuickConfirm}
          onRemove={tracker.removeMeal}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/70 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto max-w-lg">
          <FoodScanner
            onScan={handleScan}
            analyzing={tracker.analyzing}
            canScan={tracker.canScan}
            scansRemaining={tracker.scansRemaining}
            hasPremiumAccess={tracker.hasPremiumAccess}
            onPaywall={() => setPaywallOpen(true)}
          />
        </div>
      </div>

      <FoodConfirmModal
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setEditingMeal(null);
            if (pendingMeal && !pendingMeal.confirmed) {
              // keep pending for re-open
            }
          }
        }}
        meal={pendingMeal}
        analysis={pendingAnalysis}
        onConfirm={handleConfirm}
        onRescan={() => {
          setConfirmOpen(false);
          setPendingMeal(null);
          setPendingAnalysis(null);
        }}
      />

      <ProteinPaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        scansUsedToday={tracker.scansUsedToday}
      />

      {tracker.user && (
        <ProteinSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={tracker.user}
          proteinGoal={tracker.settings.proteinGoal}
          darkMode={tracker.settings.darkMode}
          hasPremiumAccess={tracker.hasPremiumAccess}
          isFounderEmail={tracker.isFounderEmail}
          scansUsedToday={tracker.scansUsedToday}
          onProteinGoalChange={tracker.setProteinGoal}
          onDarkModeChange={tracker.setDarkMode}
        />
      )}
    </div>
  );
}
