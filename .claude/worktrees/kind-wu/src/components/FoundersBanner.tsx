import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getFoundersSprintInfo, getTrackNextSprintLabel } from "@/lib/foundersSprint";
import type { UserTrack } from "@/lib/track";

interface FoundersBannerProps {
  className?: string;
  track?: UserTrack;
}

export function FoundersBanner({ className, track }: FoundersBannerProps) {
  const { isActive, daysLeft } = getFoundersSprintInfo();
  const dayLabel = daysLeft === 1 ? "day" : "days";
  const nextSprintLabel = getTrackNextSprintLabel(track);
  const sprintLink = track
    ? { pathname: "/sprint", search: `?track=${track}` }
    : "/sprint";

  return (
    <div className={cn("w-full animate-in fade-in-0 duration-500", className)}>
      <div className="border-b border-border/60 bg-muted/60 text-muted-foreground">
        <div className="mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-xs sm:text-sm">
          <span className="text-foreground/80">
            Gradlify Founders&apos; Circle — {nextSprintLabel}.
          </span>
          <Link
            to={sprintLink}
            className="font-semibold text-primary border-b border-primary/40 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Learn more →
          </Link>
          <span className="text-foreground/70">
            {isActive ? `Sprint ends in ${daysLeft} ${dayLabel}. Climb the leaderboard now.` : "Register interest for the next sprint."}
          </span>
        </div>
      </div>
    </div>
  );
}
