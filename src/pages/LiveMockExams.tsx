import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, FileText, Hourglass, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";

const LIVE_MOCK = {
  slug: "live-11plus-english-mock-2026-05-09-1700",
  startsAtIso: "2026-05-09T16:00:00.000Z",
  displayDate: "Saturday 9 May 2026",
  displayTime: "5:00 PM BST",
};

type SignupRow = {
  id: string;
  registered_at: string;
};

export default function LiveMockExams() {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState(false);
  const [signup, setSignup] = useState<SignupRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSignup = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("live_mock_exam_signups" as never)
        .select("id, registered_at")
        .eq("user_id", user.id)
        .eq("mock_slug", LIVE_MOCK.slug)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to load live mock signup", error);
      } else {
        setSignup((data as SignupRow | null) ?? null);
      }
      setLoading(false);
    };

    void loadSignup();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSignup = async () => {
    const email = user.email?.trim().toLowerCase();

    if (!user.id || !email) {
      toast.error("We could not find an email for this account.");
      return;
    }

    setSigningUp(true);
    const { data, error } = await supabase
      .from("live_mock_exam_signups" as never)
      .upsert(
        {
          user_id: user.id,
          email,
          mock_slug: LIVE_MOCK.slug,
          mock_starts_at: LIVE_MOCK.startsAtIso,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mock_slug,user_id" },
      )
      .select("id, registered_at")
      .single();

    setSigningUp(false);

    if (error) {
      console.error("Failed to sign up for live mock", error);
      toast.error("Could not sign you up. Please try again.");
      return;
    }

    setSignup(data as SignupRow);
    toast.success("You are signed up for the live mock exam.");
  };

  const isSignedUp = Boolean(signup);
  const detailRows = [
    { label: "Date", value: LIVE_MOCK.displayDate, icon: CalendarDays },
    { label: "Start", value: LIVE_MOCK.displayTime, icon: Clock3 },
    { label: "Duration", value: "60 minutes", icon: Hourglass },
    { label: "Questions", value: "60", icon: FileText },
  ];

  return (
    <main className="min-h-screen bg-[#fbfaf6] px-3 py-4 text-slate-950 sm:px-5 sm:py-5">
      <section className="mx-auto w-full max-w-3xl rounded-[22px] border border-slate-200/85 bg-[linear-gradient(135deg,#ffffff_0%,#fbfdff_52%,#fffdf8_100%)] px-4 py-4 shadow-[0_18px_52px_rgba(15,23,42,0.07)] sm:px-6 sm:py-5">
        <div className="flex items-center justify-end border-b border-slate-200 pb-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.55)]" />
            Live mock
          </span>
        </div>

        <div className="pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
            QE Boys / Henrietta Barnett style
          </p>
          <h1 className="mt-3 font-gradlify text-3xl font-semibold leading-none text-slate-950 sm:text-4xl">
            11+ English mock exam
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            A 60-minute selective English paper covering comprehension and SPaG.
          </p>
        </div>

        <div className="mt-5 rounded-[18px] border border-slate-200 bg-white/72 p-3 shadow-[0_12px_34px_rgba(15,23,42,0.045)]">
          <div className="grid gap-2 sm:grid-cols-2">
            {detailRows.map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl bg-[linear-gradient(90deg,#f9fbff_0%,#ffffff_100%)] px-3 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-[0_8px_18px_rgba(37,99,235,0.07)]">
                  <item.icon className="h-5 w-5 stroke-[2.4]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">
                    {item.label}
                  </div>
                  <div className="mt-1 truncate font-gradlify text-lg font-semibold leading-none text-slate-950 sm:text-xl">
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#fbfdff_0%,#ffffff_56%,#f8fbff_100%)] px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-[0_10px_24px_rgba(37,99,235,0.08)]">
                {isSignedUp ? <Check className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="font-gradlify text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">
                  {isSignedUp ? "You are signed up" : "Reserve your place"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {isSignedUp ? "You are registered for this mock." : "We will use your account email."}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSignup}
              disabled={loading || signingUp || isSignedUp}
              className="h-11 w-full rounded-full bg-blue-600 px-7 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.18)] hover:bg-blue-700 disabled:opacity-75 sm:w-[220px]"
            >
              {loading || signingUp ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {loading ? "Checking..." : "Signing up..."}
                </span>
  ) : isSignedUp ? (
    <span className="inline-flex items-center gap-2">
      You are signed up
      <Check className="h-4 w-4" />
    </span>
  ) : (
                <span className="inline-flex items-center gap-2">
                  Sign up
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
