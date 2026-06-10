import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FoodAnalysis, MealEntry } from "@/hooks/useProteinTracker";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: MealEntry | null;
  analysis?: FoodAnalysis | null;
  onConfirm: (updates: Partial<MealEntry>) => void;
  onRescan?: () => void;
};

export function FoodConfirmModal({
  open,
  onOpenChange,
  meal,
  analysis,
  onConfirm,
  onRescan,
}: Props) {
  const [name, setName] = useState("");
  const [protein, setProtein] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  useEffect(() => {
    if (!meal) return;
    setName(meal.name);
    setProtein(String(meal.protein_g));
    setCalories(meal.calories != null ? String(meal.calories) : "");
    setCarbs(meal.carbs_g != null ? String(meal.carbs_g) : "");
    setFat(meal.fat_g != null ? String(meal.fat_g) : "");
  }, [meal]);

  const handleConfirm = () => {
    if (!meal) return;
    onConfirm({
      name: name.trim() || meal.name,
      protein_g: Math.max(0, Number(protein) || 0),
      calories: calories ? Math.max(0, Number(calories)) : undefined,
      carbs_g: carbs ? Math.max(0, Number(carbs)) : undefined,
      fat_g: fat ? Math.max(0, Number(fat)) : undefined,
      confirmed: true,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-emerald-100 p-0 overflow-hidden dark:border-emerald-900/40">
        {meal?.imageUrl && (
          <div className="relative h-40 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img src={meal.imageUrl} alt={meal.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Confirm your meal
            </DialogTitle>
            <DialogDescription>
              AI estimated this food — tweak anything that looks off, like Kcal AI.
            </DialogDescription>
          </DialogHeader>

          {analysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              <p className="font-medium">{analysis.is_food ? "Food detected" : "Not food?"}</p>
              {analysis.items && analysis.items.length > 1 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {analysis.items.map((item) => (
                    <li key={`${item.name}-${item.portionGrams}`}>
                      {item.name}: {item.proteinGrams.toFixed(1)}g protein ({item.portionGrams}g)
                    </li>
                  ))}
                </ul>
              )}
              {analysis.serving_size && (
                <p className="text-xs opacity-80">Serving: {analysis.serving_size}</p>
              )}
              {analysis.notes && <p className="mt-1 text-xs opacity-80">{analysis.notes}</p>}
              <p className="mt-1 text-xs opacity-70">
                Confidence: {Math.round((analysis.confidence ?? 0.7) * 100)}%
              </p>
            </motion.div>
          )}

          <div className="mt-5 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="food-name">Food name</Label>
              <Input
                id="food-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grilled chicken & rice"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="protein-g">Protein (g)</Label>
                <Input
                  id="protein-g"
                  type="number"
                  min={0}
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  min={0}
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  min={0}
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600"
              onClick={handleConfirm}
            >
              Save &amp; log meal
            </Button>
            {onRescan && (
              <Button type="button" variant="ghost" className="w-full" onClick={onRescan}>
                Rescan photo
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
