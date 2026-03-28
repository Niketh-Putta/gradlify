import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getFoundersSprintInfo, getNextSprintLabel } from "@/lib/foundersSprint";

interface FoundersSprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FoundersSprintModal({ open, onOpenChange }: FoundersSprintModalProps) {
  const { isActive, daysLeft } = getFoundersSprintInfo();
  const dayLabel = daysLeft === 1 ? "day" : "days";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-left">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{isActive ? "Sprint is live" : "Next Sprint Incoming"}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {isActive
              ? `Sprint ends in ${daysLeft} ${dayLabel}. Mocks + Challenge only — climb the leaderboard now.`
              : getNextSprintLabel()}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link
            to="/sprint"
            className="text-sm font-semibold text-muted-foreground border-b border-muted-foreground/40 transition-colors hover:text-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Learn more →
          </Link>
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link to="/connect">View leaderboard</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
