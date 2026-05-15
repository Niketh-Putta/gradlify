import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useNavigateBackOrHome } from "@/hooks/useNavigateBackOrHome";
import { ForceTheme } from "@/components/ForceTheme";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { normalizeTrack, resolveUserTrack } from "@/lib/track";
import { getFoundersSprintInfo, getNextSprintInfo, SPRINT_START_AT, getSprintEventDisplayLabels } from "@/lib/foundersSprint";

const SPRINT_EVENT_LABELS = getSprintEventDisplayLabels();
const EVENT_START_LABEL = SPRINT_EVENT_LABELS.startLabel;
const EVENT_END_LABEL = SPRINT_EVENT_LABELS.endLabel;

const getSprintCountdown = () => {
  const now = new Date();
  const { isActive, endDate } = getFoundersSprintInfo(now);
  const target = isActive ? endDate : getNextSprintInfo(now).startDate;
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes, isActive, target };
};

const getCountdownToStart = () => {
  const now = new Date();
  const diffMs = Math.max(0, SPRINT_START_AT.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
};

export function SprintHowItWorks() {
  const navigate = useNavigate();
  const goBackOrHome = useNavigateBackOrHome();
  const [searchParams] = useSearchParams();
  const queryTrackParam = searchParams.get("track");

  const [timeLeft, setTimeLeft] = useState(getSprintCountdown);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [countdown, setCountdown] = useState(getCountdownToStart);
  const { profile } = useAppContext();
  const profileTrack = profile?.track ?? null;
  const resolvedTrack = useMemo(() => {
    if (queryTrackParam) {
      return normalizeTrack(queryTrackParam);
    }
    return resolveUserTrack(profileTrack);
  }, [profileTrack, queryTrackParam]);
  const isElevenPlus = resolvedTrack === "11plus";

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getSprintCountdown()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setIsAuthenticated(Boolean(data.session));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isElevenPlus) return undefined;
    const interval = setInterval(() => {
      setCountdown(getCountdownToStart());
    }, 60000);
    return () => clearInterval(interval);
  }, [isElevenPlus]);

  const pad = (value: number) => String(value).padStart(2, "0");
  const handleViewLeaderboard = () => {
    if (isAuthenticated) {
      navigate("/connect");
      return;
    }
    navigate("/?auth=login");
  };

  const { isActive, endDate } = getFoundersSprintInfo();
  const { startDate: nextStartDate } = getNextSprintInfo();
  const nextStartLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(nextStartDate);
  const endLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(endDate);
  const endWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(endDate);
  const endFullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(endDate);
  if (isElevenPlus) {
    return (
      <ForceTheme theme="light">
        <div className="relative min-h-screen bg-gradient-to-b from-[#F6F7FF] via-[#F8F9FF] to-white text-slate-900">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),transparent_55%),radial-gradient(circle_at_80%_20%,_rgba(129,140,248,0.12),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle,_rgba(79,70,229,0.25)_1px,transparent_1px)] bg-[length:24px_24px]" />

          <div className="relative mx-auto max-w-[980px] px-4 pb-14 pt-10 sm:px-6">
            <button
              type="button"
              onClick={goBackOrHome}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E6E8F0] bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900"
            >
              <span aria-hidden="true">&larr;</span>
              Back
            </button>
            <div className="relative overflow-hidden rounded-[28px] border border-[#E6E8F0] bg-gradient-to-br from-[#f7f6ff] via-white to-[#f1f2ff] shadow-[0_24px_60px_-40px_rgba(79,70,229,0.4)]">
              <div className="relative space-y-6 p-6 sm:p-8">
                <section className="rounded-[24px] border border-[#E6E8F0] bg-gradient-to-br from-[#f2f0ff] via-white to-[#eef0ff] p-6 shadow-[0_18px_50px_-28px_rgba(79,70,229,0.35)] backdrop-blur sm:p-10">
                  <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
                    <div className="space-y-4">
                      <div>
                        <p className="inline-flex items-center rounded-full border border-primary-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-600">
                          Limited event: one month
                        </p>
                      </div>
                      <div>
                        <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                          11+ Launch Sprint
                        </h1>
                        <p className="mt-3 max-w-[52ch] text-lg text-slate-600 sm:text-xl">
                          One cash prize: a £100 Amazon gift card, awarded after 30 days to whoever has the highest leaderboard score. Only correct answers from full mock exams count; practice does not. Live now. 11+ only.
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          This sprint is for the 11+ track only. GCSE content and leaderboards remain separate.
                        </p>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p className="text-base">
                          <span className="font-semibold text-slate-900">Sprint begins:</span>{" "}
                          <span className="text-primary-600">{EVENT_START_LABEL}</span>
                        </p>
                        <p className="text-base">
                          <span className="font-semibold text-slate-900">Sprint ends:</span>{" "}
                          <span className="text-primary-600">{EVENT_END_LABEL}</span> - No points are counted after the deadline.
                        </p>
                      </div>
                      <div className="mt-4 flex justify-center lg:justify-start">
                        <button
                          type="button"
                          onClick={handleViewLeaderboard}
                          className="inline-flex items-center justify-center rounded-full bg-[#4f46e5] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(79,70,229,0.65)] transition hover:-translate-y-0.5 hover:bg-[#4338ca]"
                        >
                          Start 11+ Launch Sprint
                        </button>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#E6E8F0] bg-gradient-to-br from-white via-white to-[#eef0ff] p-6 shadow-[0_16px_34px_-20px_rgba(79,70,229,0.35)]">
                      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                        11+ Launch Sprint
                      </p>
                      <p className="mt-3 text-lg font-semibold text-slate-700">Starts in</p>
                      <div className="mt-4 space-y-3 text-slate-900">
                      <div className="flex items-baseline gap-4 text-4xl font-bold tracking-tight">
                        <span>{String(countdown.days).padStart(2, "0")}d</span>
                        <span>{String(countdown.hours).padStart(2, "0")}h</span>
                        <span>{String(countdown.minutes).padStart(2, "0")}m</span>
                      </div>
                      </div>
                      <div className="mt-6 h-2 w-full rounded-full bg-slate-100">
                        <div className="h-full w-[100%] rounded-full bg-primary-500" />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Points freeze at {EVENT_END_LABEL}.</p>
                    </div>
                  </div>
                </section>

                <section id="scoring" className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-700">How it works</h2>
                  <div className="rounded-[16px] border border-[#E6E8F0] bg-gradient-to-br from-white via-white to-[#f0f1ff] p-5 shadow-[0_16px_30px_-22px_rgba(79,70,229,0.3)]">
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                        <span>Only correct answers in full mock exams count toward your sprint leaderboard score.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                        <span>Correct answers from practice questions do <span className="font-semibold text-slate-900">not</span> count. Use practice to learn; only mocks move your score.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                        <span>After the 30-day window ends, whoever has the highest leaderboard score wins the cash prize (subject to verification).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                        <span>Premium users can run more full mock exams per day.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                        <span>Accuracy and consistency in mocks matter.</span>
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Free users have daily limits on mock exams during the sprint. Premium unlocks unlimited attempts.
                    </p>
                  </div>
                </section>

                <section id="compete" className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-700">How to compete</h2>
                  <div className="rounded-[16px] border border-[#E6E8F0] bg-gradient-to-br from-white via-white to-[#f0f1ff] p-5 shadow-[0_16px_30px_-22px_rgba(79,70,229,0.3)]">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
                      <li>Sit full mock exams during the 30-day window.</li>
                      <li>Only correct answers in those mocks add to your leaderboard score.</li>
                      <li>Practice never counts toward the sprint leaderboard. Use it to prepare, then prove it in mocks.</li>
                      <li>When the month ends, the highest score wins the £100 Amazon cash prize (after verification).</li>
                    </ol>
                  </div>
                </section>

                <section id="prizes" className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-700">Prizes</h2>
                  <div className="rounded-[20px] border border-[#E6E8F0] bg-gradient-to-br from-[#f2f0ff] via-white to-[#eef0ff] p-6 shadow-[0_18px_40px_-26px_rgba(79,70,229,0.35)] space-y-4">
                    <div className="overflow-hidden rounded-[16px] border border-[#E6E8F0] bg-white">
                      <div className="relative w-full">
                        <img
                          src="/prizes-11plus.png"
                          alt="11+ sprint prize, £100 Amazon gift card"
                          className="w-full max-h-[520px] min-h-[320px] object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900">One cash prize: £100 Amazon gift card</p>
                      <p className="mt-2 text-sm text-slate-600">
                        One cash prize. After the month closes, the student with the highest mock-only leaderboard score wins (verified by Gradlify).
                      </p>
                      <p className="mt-4 text-xs text-slate-500">Digital gift card sent within 24 hours of sprint end, after verification.</p>
                    </div>
                  </div>
                </section>
                <p className="mt-6 text-xs text-slate-500">
                  Any questions, contact:{" "}
                  <a className="font-semibold text-primary-600 hover:text-primary-700" href="mailto:team@gradlify.com">
                    team@gradlify.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </ForceTheme>
    );
  }

  return (
    <ForceTheme theme="light">
      <div className="relative min-h-screen bg-gradient-to-b from-[#F6F7FF] via-[#F8F9FF] to-white text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),transparent_55%),radial-gradient(circle_at_80%_20%,_rgba(129,140,248,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle,_rgba(79,70,229,0.25)_1px,transparent_1px)] bg-[length:24px_24px]" />

        <div className="relative mx-auto max-w-[980px] px-4 pb-14 pt-10 sm:px-6">
          <button
            type="button"
            onClick={goBackOrHome}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E6E8F0] bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900"
          >
            <span aria-hidden="true">&larr;</span>
            Back
          </button>
          <div className="relative overflow-hidden rounded-[28px] border border-[#E6E8F0] bg-gradient-to-br from-[#f7f6ff] via-white to-[#f1f2ff] shadow-[0_24px_60px_-40px_rgba(79,70,229,0.4)]">
            <div className="relative space-y-6 p-6 sm:p-8">
              <section className="rounded-[24px] border border-[#E6E8F0] bg-gradient-to-br from-[#f2f0ff] via-white to-[#eef0ff] p-6 shadow-[0_18px_50px_-28px_rgba(79,70,229,0.35)] backdrop-blur sm:p-10">
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
                  <div className="space-y-4">
                      <div className="mb-5 flex flex-wrap gap-2">
                        <span className="inline-flex h-7 items-center rounded-full border border-[#E6E8F0] bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          SPRINT 03
                        </span>
                        <span className="inline-flex h-7 items-center rounded-full border border-[#E6E8F0] bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          {isActive ? "LIVE" : "STARTING SOON"}
                        </span>
                        <span className="inline-flex h-7 items-center rounded-full border border-[#E6E8F0] bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          30 DAYS
                        </span>
                        <span className="inline-flex h-7 items-center rounded-full border border-[#E6E8F0] bg-white px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          FREE TO ENTER
                        </span>
                      </div>

                    <div>
                      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                        The Gradlify Sprint - GCSE
                      </h1>
                      <p className="mt-4 max-w-[52ch] text-base text-slate-600 sm:text-lg">
                        {isActive
                          ? "Sprint is live. Sit full mocks. Only correct mock answers move the GCSE sprint leaderboard."
                          : "Sprint starting soon. Use practice to prepare; when we’re live, only full mocks will change your sprint score."}
                      </p>
                      <p className="text-xs text-slate-500">
                        This GCSE sprint is separate from the 11+ Launch Sprint.
                      </p>
                      <div className="mt-5 flex flex-col gap-2 text-sm">
                        <div className="flex flex-wrap gap-3 text-primary-600 text-base font-semibold leading-tight">
                          <span>Starts:</span>
                          <span className="font-bold">{nextStartLabel}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-primary-600 text-base font-semibold leading-tight">
                          <span>Ends:</span>
                          <span className="font-bold">{endLabel}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Runs for 30 days • Free to enter • Daily limits apply throughout the sprint.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleViewLeaderboard}
                        className="inline-flex items-center justify-center rounded-full bg-[#4f46e5] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_-18px_rgba(79,70,229,0.65)] transition hover:-translate-y-0.5 hover:bg-[#4338ca]"
                      >
                        View leaderboard
                      </button>
                      <a className="text-sm font-semibold text-primary-600 hover:text-primary-700" href="#scoring">
                        How scoring works
                      </a>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[#E6E8F0] bg-gradient-to-br from-white via-white to-[#eef0ff] p-6 shadow-[0_16px_34px_-20px_rgba(79,70,229,0.35)]">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                      {isActive ? "Sprint Live" : "Next Sprint"}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-slate-700">
                      {isActive ? `Ends ${endLabel}` : `Starts ${nextStartLabel}`}
                    </p>
                    <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
                      <div className="h-full w-[35%] rounded-full bg-primary-500" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Daily limits reset every 24 hours.</p>
                  </div>
                </div>
              </section>

          <section id="scoring" className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">How it works</h2>
            <div className="rounded-[16px] border border-[#E6E8F0] bg-gradient-to-br from-white via-white to-[#f0f1ff] p-5 shadow-[0_16px_30px_-22px_rgba(79,70,229,0.3)]">
              <p className="text-sm leading-relaxed text-slate-600">
                Your sprint leaderboard score comes only from correct answers in completed full mock exams. Practice mode never contributes. After 30 days, the highest score wins the cash prize.
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-primary-500" />
                  <span>Correct answers in mocks earn leaderboard points; practice questions do not.</span>
                </div>
                <div className="flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-primary-500" />
                  <span>Consistency across the sprint matters more than one-off sessions.</span>
                </div>
                <div className="flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-primary-500" />
                  <span>Premium users can attempt more mock exams per day, so more correct mock answers can count.</span>
                </div>
                <div className="flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-primary-500" />
                  <span>When the sprint ends, the highest mock-based leaderboard score wins.</span>
                </div>
              </div>
                    <p className="mt-4 text-xs text-slate-500">
                      Free users have daily limits on mock exams during the sprint. Premium removes these limits.
                    </p>
                  </div>
                </section>

                <section id="compete" className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-700">How to compete</h2>
                  <div className="rounded-[16px] border border-[#E6E8F0] bg-gradient-to-br from-white via-white to-[#f0f1ff] p-5 shadow-[0_16px_30px_-22px_rgba(79,70,229,0.3)]">
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
                      <li>Sit full mock exams during the 30-day window.</li>
                      <li>Only correct answers in those mocks add to your leaderboard score.</li>
                      <li>Practice never counts toward the sprint leaderboard. Use it to prepare, then prove it in mocks.</li>
                      <li>When the month ends, the highest score wins the £100 Amazon cash prize (after verification).</li>
                    </ol>
                  </div>
                </section>

          <section id="prizes" className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">Prizes</h2>
            <div className="rounded-[20px] border border-[#E6E8F0] bg-gradient-to-br from-[#f2f0ff] via-white to-[#eef0ff] p-6 shadow-[0_18px_40px_-26px_rgba(79,70,229,0.35)] space-y-4">
              <div className="overflow-hidden rounded-[16px] border border-[#E6E8F0]">
                <img
                  src="/prizes.png"
                  alt="Sprint prize, £100 Amazon gift card"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">One cash prize: £100 Amazon gift card</p>
                <p className="mt-2 text-sm text-slate-600">
                  After 30 days, the highest mock-only leaderboard score wins. Only correct answers from full mock exams count; practice does not.
                </p>
                <p className="mt-3 text-xs text-slate-500">Same month-long window as the 11+ sprint; leaderboards stay separate by track.</p>
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-[#E6E8F0] bg-gradient-to-br from-white via-[#f7f6ff] to-[#eef0ff] p-5 shadow-[0_20px_40px_-26px_rgba(79,70,229,0.3)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Beyond the Sprint: Founders' Circle</h3>
                <p className="text-xs text-slate-500">Top consistent performers may be invited.</p>
                <p className="mt-2 text-xs text-slate-500">Consistency during the sprint month is a key signal for invitations.</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Circle members get</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500 marker:text-primary-500">
                  <li>Discounted premium access</li>
                  <li>Early access to new features</li>
                  <li>Shape the development of Gradlify</li>
                </ul>
              </div>
              <a
                className="inline-flex items-center justify-center rounded-full border border-[#E6E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#4f46e5] shadow-sm"
                href="/founders-circle"
              >
                Learn about Founders' Circle &rarr;
              </a>
            </div>
          </section>

          <section className="mt-8 rounded-[20px] border-2 border-dashed border-[#4f46e5]/30 bg-[#4f46e5]/5 p-8 text-center">
            <h2 className="text-2xl font-black tracking-tight text-[#4f46e5]">
              Monthly sprint: £100 Amazon gift card. Highest mock-only score wins.
            </h2>
          </section>
        </div>
      </div>
    </div>
  </div>
</ForceTheme>
  );
}
