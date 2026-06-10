import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  current: number;
  goal: number;
  size?: number;
  className?: string;
};

export function ProteinRing({ current, goal, size = 220, className }: Props) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const offset = circumference - (percent / 100) * circumference;
  const complete = percent >= 100;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200/80 dark:text-slate-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#proteinGradient)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
        <defs>
          <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={complete ? "#34d399" : "#10b981"} />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor={complete ? "#6ee7b7" : "#2dd4bf"} />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <motion.span
          key={Math.round(current)}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          {Math.round(current)}g
        </motion.span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          Protein
        </span>
        <span className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          of {goal}g goal
        </span>
        {complete && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"
          >
            Goal hit
          </motion.span>
        )}
      </div>
    </div>
  );
}
