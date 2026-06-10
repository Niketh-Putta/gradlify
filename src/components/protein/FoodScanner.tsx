import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ImagePlus, Loader2, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MealType } from "@/hooks/useProteinTracker";
import { toast } from "sonner";

type Props = {
  onScan: (imageDataUrl: string, mealType: MealType) => Promise<unknown>;
  analyzing: boolean;
  canScan: boolean;
  scansRemaining: number;
  hasPremiumAccess: boolean;
  onPaywall: () => void;
  className?: string;
};

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function FoodScanner({
  onScan,
  analyzing,
  canScan,
  scansRemaining,
  hasPremiumAccess,
  onPaywall,
  className,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [mealType, setMealType] = useState<MealType>("lunch");

  const handleImage = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (!canScan) {
      onPaywall();
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      await onScan(dataUrl, mealType);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      if (message.includes("limit")) onPaywall();
      else toast.error(message);
    }
  };

  const openCamera = () => {
    if (!canScan) {
      onPaywall();
      return;
    }
    cameraInputRef.current?.click();
  };

  const openUpload = () => {
    if (!canScan) {
      onPaywall();
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setMealType(type)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              mealType === type
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleImage(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleImage(e.target.files?.[0])}
      />

      <div className="flex items-center justify-center gap-4 pb-24">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={openUpload}
          disabled={analyzing}
          className="h-12 w-12 rounded-2xl border-slate-200 dark:border-slate-700"
        >
          <ImagePlus className="h-5 w-5" />
        </Button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.03 }}
          onClick={openCamera}
          disabled={analyzing}
          className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/40",
            analyzing && "opacity-80",
          )}
        >
          {analyzing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Camera className="h-8 w-8" />
          )}
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-emerald-600 shadow-md dark:bg-slate-900">
            <Scan className="h-3.5 w-3.5" />
          </span>
        </motion.button>
      </div>

      <div className="text-center text-xs text-slate-500 dark:text-slate-400">
        {hasPremiumAccess ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Unlimited scans</span>
        ) : (
          <span>
            {scansRemaining === Infinity ? "3" : scansRemaining} free scan
            {scansRemaining === 1 ? "" : "s"} left today
          </span>
        )}
      </div>
    </div>
  );
}
