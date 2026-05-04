import { ReferralInviteDialog } from '@/components/ReferralInviteDialog';

export function ReferralCard() {
  return (
    <section className="space-y-3">
      <h2 className="ml-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Referrals
      </h2>
      <ReferralInviteDialog
        accent="maths"
        triggerClassName="rounded-2xl border-primary/15 bg-card/95 px-4 py-3 shadow-sm"
      />
    </section>
  );
}
