import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MealEntry } from "@/hooks/useProteinTracker";

type Props = {
  meals: MealEntry[];
  onEdit: (meal: MealEntry) => void;
  onConfirm: (meal: MealEntry) => void;
  onRemove: (id: string) => void;
  className?: string;
};

export function MealLogList({ meals, onEdit, onConfirm, onRemove, className }: Props) {
  if (meals.length === 0) {
    return (
      <Card className={cn("rounded-3xl border-dashed border-slate-200 dark:border-slate-700", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <UtensilsCrossed className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">No meals logged yet</p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Tap the camera button to scan your first meal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
          Today&apos;s meals
        </h3>
        <span className="text-xs text-slate-400">{meals.length} logged</span>
      </div>

      <AnimatePresence initial={false}>
        {meals.map((meal) => (
          <motion.div
            key={meal.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card
              className={cn(
                "overflow-hidden rounded-2xl border-slate-100 dark:border-slate-800",
                !meal.confirmed && "border-amber-200/80 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20",
              )}
            >
              <CardContent className="flex gap-3 p-3 sm:p-4">
                {meal.imageUrl ? (
                  <img
                    src={meal.imageUrl}
                    alt={meal.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate font-semibold text-slate-900 dark:text-white">{meal.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {meal.mealType}
                        </Badge>
                        {!meal.confirmed && (
                          <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
                            Needs confirm
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {Math.round(meal.protein_g)}g
                      </p>
                      {meal.calories != null && (
                        <p className="text-[10px] text-slate-400">{Math.round(meal.calories)} kcal</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(meal.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(meal)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!meal.confirmed && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-full bg-emerald-500 px-3 text-xs hover:bg-emerald-600"
                          onClick={() => onConfirm(meal)}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Confirm
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-600"
                        onClick={() => onRemove(meal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
