import { Sparkles } from "lucide-react";
import { latestProteinFeatures, proteinChangelog } from "@/lib/protein/changelog";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function ProteinWhatsNew({ className }: Props) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-300">
          What&apos;s new in Protein Lens
        </h3>
        <span className="ml-auto text-[10px] font-medium text-slate-500">
          Updated {proteinChangelog.updated}
        </span>
      </div>
      <ul className="space-y-2.5">
        {latestProteinFeatures.map((feature) => (
          <li key={feature.title} className="rounded-2xl bg-white/80 px-3 py-2 dark:bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{feature.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{feature.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
