import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TopicBreakdown = Record<string, { earned: number; total: number }>;

type PostMockParentReportProps = {
  topicBreakdown: TopicBreakdown;
  correctCount: number;
  totalCount: number;
  percentage: number;
};

export function PostMockParentReport({
  topicBreakdown,
  correctCount,
  totalCount,
  percentage,
}: PostMockParentReportProps) {
  const navigate = useNavigate();

  const { weakTopics, strongTopic } = useMemo(() => {
    const entries = Object.entries(topicBreakdown).map(([topic, { earned, total }]) => ({
      topic,
      pct: total > 0 ? Math.round((earned / total) * 100) : 0,
      earned,
      total,
    }));
    const sorted = [...entries].sort((a, b) => a.pct - b.pct);
    return {
      weakTopics: sorted.filter((t) => t.pct < 70).slice(0, 3),
      strongTopic: [...entries].sort((a, b) => b.pct - a.pct)[0] ?? null,
    };
  }, [topicBreakdown]);

  const primaryWeak = weakTopics[0]?.topic;

  return (
    <div className="card rounded-2xl p-5 mb-4 border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white fade-up fade-up-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 mb-2">
        For parents
      </p>
      <h2 className="text-lg font-bold text-foreground mb-1">
        {correctCount}/{totalCount} correct ({percentage}%)
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {percentage >= 70
          ? 'Strong mock — keep momentum with targeted practice on any weaker topics below.'
          : 'Clear gaps to work on this week — short practice sessions on weak topics add up fast.'}
      </p>

      {strongTopic && (
        <p className="text-sm text-foreground mb-3 flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Strongest area:</span> {strongTopic.topic} ({strongTopic.earned}/{strongTopic.total})
          </span>
        </p>
      )}

      {weakTopics.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <span className="text-amber-600" aria-hidden="true">•</span>
            Focus on these next
          </p>
          <ul className="space-y-1.5 text-sm text-foreground">
            {weakTopics.map((t) => (
              <li key={t.topic} className="flex justify-between gap-2">
                <span>{t.topic}</span>
                <span className="text-muted-foreground tabular-nums">{t.earned}/{t.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          className="flex-1 rounded-xl"
          onClick={() => navigate(primaryWeak ? `/practice-page?topic=${encodeURIComponent(primaryWeak)}` : '/practice-page')}
        >
          Practice weak topics free
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl border-primary/30"
          onClick={() => navigate('/select-subject?intent=plans')}
        >
          Unlimited mocks — £19.99/mo trial
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Tip for parents: one mock per week + 15 minutes on the weakest topic beats hours of unfocused revision.
      </p>
    </div>
  );
}
