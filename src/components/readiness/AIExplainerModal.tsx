import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

interface AIEvent {
  id: number;
  topic: string;
  correct: boolean;
  model_reasoning: string | null;
  created_at: string;
}

interface AIExplainerModalProps {
  event: AIEvent | null;
  onClose: () => void;
}

export function AIExplainerModal({ event, onClose }: AIExplainerModalProps) {
  if (!event) return null;

  return (
    <Dialog open={!!event} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Readiness Update
          </DialogTitle>
          <DialogDescription>
            Your readiness was automatically updated based on AI analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
            <div className={event.correct ? 'text-green-500' : 'text-red-500'}>
              {event.correct ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="font-medium">{event.topic}</div>
              <div className="text-sm text-muted-foreground">
                {event.correct ? 'Correct answer' : 'Incorrect answer'} detected
              </div>
            </div>
            <Badge variant={event.correct ? 'default' : 'destructive'} className="ml-auto">
              {event.correct ? 'Correct' : 'Incorrect'}
            </Badge>
          </div>

          {event.model_reasoning && (
            <div className="space-y-2">
              <div className="font-medium text-sm">AI Analysis:</div>
              <div className="p-4 rounded-lg bg-muted text-sm leading-relaxed">
                {event.model_reasoning}
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Your overall exam readiness has been automatically recalculated to reflect this update.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
