import { useMemo, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { buildReferralUrl } from '@/lib/referrals';
import { useReferralSummary } from '@/hooks/useReferralSummary';
import { cn } from '@/lib/utils';
import { Crown, Gift, Link2, MessageSquare, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';

type ReferralInviteDialogProps = {
  accent?: 'maths' | 'english';
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
};

export function ReferralInviteDialog({
  accent = 'maths',
  className,
  triggerClassName,
  compact = false,
}: ReferralInviteDialogProps) {
  const {
    loading,
    error,
    refresh,
    bonusMockCredits,
    successfulReferrals,
    usedMockCredits,
    code,
  } = useReferralSummary(true);

  const referralInputRef = useRef<HTMLInputElement>(null);
  const referralUrl = useMemo(() => (code ? buildReferralUrl(code) : ''), [code]);
  const accentClass =
    accent === 'english'
      ? {
          border: 'border-amber-500/20 hover:border-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/25',
          iconWrap: 'bg-amber-500/10 text-amber-600 ring-amber-500/20',
          mutedBadge: 'bg-white/90 text-neutral-950 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.65)]',
        }
      : {
          border: 'border-primary/20 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
          iconWrap: 'bg-primary/10 text-primary ring-primary/20',
          mutedBadge: 'bg-white/90 text-neutral-950 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.65)]',
        };

  const copyLink = () => {
    if (!referralUrl) return;
    const clipboardWrite = navigator.clipboard?.writeText(referralUrl);
    const copiedFromSelection = copySelectedInputText(referralInputRef.current);

    if (copiedFromSelection) {
      toast.success('Link copied');
      return;
    }

    if (clipboardWrite) {
      void clipboardWrite
        .then(() => {
          toast.success('Link copied');
        })
        .catch(() => {
          selectReferralInput(referralInputRef.current);
          toast.error('Could not copy link. The link is selected so you can copy it manually.');
        });
      return;
    }

    selectReferralInput(referralInputRef.current);
    toast.error('Could not copy link. The link is selected so you can copy it manually.');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            'group w-full rounded-2xl border bg-card/90 text-left transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.55)]',
            accentClass.border,
            compact ? 'px-3.5 py-2.5' : 'px-4 py-3',
            triggerClassName,
            className
          )}
        >
          <div className="flex items-center gap-3 pr-1">
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', accentClass.iconWrap)}>
              <Gift className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight text-foreground">Get free mocks</div>
              <div className="text-xs leading-5 text-muted-foreground">
                Invite someone and you both get 2 bonus mocks.
              </div>
            </div>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="w-[88vw] max-w-[370px] border-0 bg-white p-3.5 shadow-[0_22px_70px_-40px_rgba(0,0,0,0.6)] sm:p-4">
        <div className="overflow-hidden rounded-[18px] bg-[#f8f5ef]">
          <div className="relative min-h-[124px] p-3.5 sm:p-4">
            <span className={cn('relative z-10 inline-flex rounded-full px-3 py-1 text-xs font-medium', accentClass.mutedBadge)}>
              Earn 2 bonus mocks
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-11 top-3.5 z-10 h-6 w-6 rounded-lg text-neutral-950 hover:bg-white/70"
              onClick={() => void refresh()}
              disabled={loading}
              aria-label="Refresh referral details"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>

            <DialogHeader className="relative z-10 mt-7 space-y-0.5 text-left">
              <DialogTitle className="max-w-[205px] text-[22px] font-bold leading-[1.02] tracking-tight text-neutral-950 sm:text-[24px]">
                Spread the love of learning
              </DialogTitle>
              <DialogDescription className="text-[13px] leading-tight text-neutral-500 sm:text-[14px]">
                earn free credits
              </DialogDescription>
            </DialogHeader>

            <div className="pointer-events-none absolute bottom-2 right-2 h-[78px] w-[128px] overflow-visible">
              <div className="absolute bottom-0 right-0 h-[72px] w-[72px] rounded-[28px] bg-[radial-gradient(circle_at_34%_28%,#9ccaff_0,#3f7df4_46%,#ff9f43_100%)] opacity-95 blur-[0.5px] shadow-[0_18px_34px_-22px_rgba(47,109,246,0.7)]" />
              <div className="absolute bottom-0 right-[46px] h-[70px] w-[70px] rounded-[28px] bg-[radial-gradient(circle_at_35%_28%,#bfe0ff_0,#5b95ff_44%,#ffb15a_100%)] opacity-90 blur-[0.5px] shadow-[0_18px_34px_-24px_rgba(255,138,42,0.55)]" />
              <div className="absolute bottom-[18px] right-[36px] h-7 w-7 rotate-45 rounded-md bg-white/95 shadow-[0_0_18px_rgba(255,255,255,0.95)]" />
              <div className="absolute -inset-2 rounded-[36px] bg-[radial-gradient(circle_at_70%_70%,rgba(248,245,239,0)_0,rgba(248,245,239,0)_54%,rgba(248,245,239,0.72)_82%,rgba(248,245,239,0.95)_100%)]" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs leading-none text-neutral-600">How it works:</p>

          <div className="mt-3 space-y-2.5 text-xs leading-5 text-neutral-950">
            <Bullet icon={<Zap className="h-3.5 w-3.5" />} text="Share your invite link" />
            <Bullet icon={<Crown className="h-3.5 w-3.5" />} text={<>They sign up and <strong>you both get 2 extra mocks</strong></>} />
            <Bullet
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              text={<>Referral mocks sit on top of the normal free-user daily limit</>}
            />
          </div>
        </div>

        <div className="mt-4 text-xs leading-none text-neutral-600">
          <strong className="font-bold text-neutral-700">{loading ? 0 : successfulReferrals}</strong> referred,{' '}
          <strong className="font-bold text-neutral-700">{loading ? 0 : bonusMockCredits}</strong> mocks left,{' '}
          <strong className="font-bold text-neutral-700">{loading ? 0 : usedMockCredits}</strong> used
        </div>

        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[#faf7f1] p-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
            <Input
              ref={referralInputRef}
              value={loading ? 'Loading...' : referralUrl}
              readOnly
              className="h-7 min-w-0 border-0 bg-transparent p-0 text-[11px] text-neutral-950 shadow-none focus-visible:ring-0"
              aria-label="Referral link"
            />
          </div>
          <Button
            onClick={copyLink}
            disabled={!referralUrl || loading}
            data-testid="copy-referral-link"
            className="h-8 shrink-0 rounded-lg bg-neutral-950 px-3.5 text-xs font-medium text-white shadow-[0_10px_22px_-15px_rgba(0,0,0,0.85)] hover:bg-neutral-800"
          >
            Copy link
          </Button>
        </div>

        {error && (
          <p className="mt-3 text-xs text-destructive">
            Could not load referral details right now.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function copySelectedInputText(input: HTMLInputElement | null) {
  if (!input) return false;
  selectReferralInput(input);

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

function selectReferralInput(input: HTMLInputElement | null) {
  if (!input) return;
  input.focus();
  input.select();
  input.setSelectionRange(0, input.value.length);
}

function Bullet({ icon, text }: { icon: ReactNode; text: ReactNode }) {
  return (
    <div className="grid grid-cols-[20px_1fr] items-start gap-3">
      <div className="mt-0.5 text-neutral-950">{icon}</div>
      <div>{text}</div>
    </div>
  );
}
