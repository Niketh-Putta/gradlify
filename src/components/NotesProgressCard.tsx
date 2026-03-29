import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookMarked } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { resolveUserTrack } from "@/lib/track";
import { useNotesProgress } from "@/hooks/useNotesProgress";
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";

interface NotesProgressCardProps {
  className?: string;
  id?: string;
  'data-animate'?: boolean;
  isVisible?: boolean;
  onClick?: () => void;
}

export function NotesProgressCard({ className, id, 'data-animate': dataAnimate, isVisible, onClick }: NotesProgressCardProps) {
  const { completedCount, totalNotes, loading } = useNotesProgress();
  const { profile } = useAppContext();
  const { currentSubject } = useSubject();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const focusLabel = userTrack === '11plus' ? '11+ sections' : 'GCSE sections';

  return (
    <Card 
      id={id}
      data-animate={dataAnimate}
      className={`${className} ${onClick ? 'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]' : ''}`}
      style={{ backgroundColor: 'hsl(var(--bg-readiness))' }}
      onClick={onClick}
    >
      <CardHeader className="text-center pb-2 sm:pb-3 px-2 sm:px-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BookMarked className={cn(
             "h-5 w-5",
             currentSubject === 'english' ? "text-amber-500" : "text-primary"
          )} />
          <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-foreground">
            Notes Progress
          </CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          Track your revision across all topics
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-3">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-3 bg-muted rounded-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-6 text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notes Mastered
              </p>
              <p className="text-3xl font-bold text-foreground">
                {completedCount}/{totalNotes}
              </p>
              <p className="text-sm text-muted-foreground">
                Current focus: {focusLabel}
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Start revising notes to track your progress
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
