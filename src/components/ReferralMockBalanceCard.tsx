import { useReferralSummary } from '@/hooks/useReferralSummary';
import { cn } from '@/lib/utils';
import { Gift, Sparkles, Users } from 'lucide-react';

type ReferralMockBalanceCardProps = {
  accent?: 'maths' | 'english';
  className?: string;
};

export function ReferralMockBalanceCard({
  accent = 'maths',
  className,
}: ReferralMockBalanceCardProps) {
  const { loading, bonusMockCredits, usedMockCredits } = useReferralSummary(true);
  const accentStyles =
    accent === 'english'
      ? {
          shell: 'border-amber-500/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.88))]',
          icon: 'bg-amber-500/10 text-amber-600 ring-amber-500/15',
          badge: 'bg-amber-500/10 text-amber-700',
          glow: 'from-amber-400/14 via-transparent to-transparent',
        }
      : {
          shell: 'border-primary/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.88))]',
          icon: 'bg-primary/10 text-primary ring-primary/15',
          badge: 'bg-primary/10 text-primary',
          glow: 'from-primary/14 via-transparent to-transparent',
        };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.6)]',
        accentStyles.shell,
        className
      )}
    >
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b', accentStyles.glow)} />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-xl ring-1 ring-inset', accentStyles.icon)}>
              <Gift className="h-3.5 w-3.5" />
            </span>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Referral mocks
            </div>
          </div>
          <p className="mt-2 max-w-[320px] text-xs leading-5 text-muted-foreground">
            Extra mocks on top of free daily mocks.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:w-[250px]">
          <div className="rounded-xl border border-white/70 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Left
            </div>
            <div className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-foreground">
              {loading ? '-' : bonusMockCredits}
            </div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Users className="h-3 w-3" />
              Used
            </div>
            <div className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-foreground">
              {loading ? '-' : usedMockCredits}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
