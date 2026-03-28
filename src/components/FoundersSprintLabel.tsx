import { cn } from "@/lib/utils";
import { getNextSprintLabel, getSprintEndLabel } from "@/lib/foundersSprint";

interface FoundersSprintLabelProps {
  className?: string;
}

export function FoundersSprintLabel({ className }: FoundersSprintLabelProps) {
  const label = getNextSprintLabel();

  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span
        tabIndex={0}
        className="text-xs font-semibold text-primary border-b border-primary/40 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {label}
      </span>
      <span className="text-[10px] text-primary/70">{getSprintEndLabel()}</span>
    </div>
  );
}
