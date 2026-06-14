import { Gauge, Target, TrendingUp } from "lucide-react";

/**
 * Display-only results panel: an INDICATIVE standardised-score estimate, target
 * bands for this mock, and a one-line difficulty note.
 *
 * Important: this is purely presentational. It is computed client-side from the
 * score that is already saved for the attempt. It performs NO database writes
 * and is not part of the mock-taking flow, so it cannot affect in-progress
 * sitters or change anyone's stored score.
 *
 * Standardisation caveat: a true age-standardised score (mean 100, SD 15,
 * adjusted for age in months) needs a large cohort and each child's date of
 * birth. Until that data exists we show a transparent, clearly-labelled
 * ESTIMATE derived from the raw percentage, anchored to this mock's difficulty.
 */

type Subject = "maths" | "english" | "combined";

interface Props {
  subject: Subject;
  /** Raw percentage for this paper (0-100). */
  percentage: number;
  correct: number;
  total: number;
}

/**
 * This mock is pitched at/above real exam level (super-selective end), so the
 * raw→standardised anchor is deliberately generous: ~55% raw maps to ~100
 * (the standardised average). Each ~2.7 raw points ≈ 1 standardised point
 * (15 SD over a ~40-point working band). Clamped to a sane 70-141 range and
 * shown as a ±4 band to signal it is an estimate, not an official score.
 */
function estimateStandardised(pct: number): { center: number; low: number; high: number } {
  const ANCHOR_RAW = 55; // raw % that maps to the standardised mean of 100
  const POINTS_PER_STD = 2.7; // raw % points per 1 standardised point
  const raw = Math.max(0, Math.min(100, pct));
  const center = Math.round(100 + (raw - ANCHOR_RAW) / POINTS_PER_STD);
  const clamp = (n: number) => Math.max(70, Math.min(141, n));
  return {
    center: clamp(center),
    low: clamp(center - 4),
    high: clamp(center + 4),
  };
}

function bandForStandardised(score: number): { label: string; tone: string } {
  if (score >= 120) return { label: "Super-selective range", tone: "text-emerald-700" };
  if (score >= 111) return { label: "Grammar pass range", tone: "text-emerald-700" };
  if (score >= 100) return { label: "Around average, on the cusp", tone: "text-amber-700" };
  if (score >= 90) return { label: "Below average, gaps to close", tone: "text-amber-700" };
  return { label: "Significant gaps, time to build", tone: "text-rose-700" };
}

const SUBJECT_LABEL: Record<Subject, string> = {
  maths: "Maths",
  english: "English",
  combined: "this paper",
};

export default function StandardisedScorePanel({ subject, percentage, correct, total }: Props) {
  const est = estimateStandardised(percentage);
  const band = bandForStandardised(est.center);
  const label = SUBJECT_LABEL[subject];

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-950">
          <Gauge className="h-4 w-4 shrink-0 text-blue-600" />
          Standardised estimate &amp; targets
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          An indicative read on where this {label} score sits versus real 11+ exams. Estimates sharpen as more children sit the mock.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Standardised estimate */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            Estimated standardised score
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-950">{est.center}</span>
            <span className="text-xs font-semibold text-slate-500">
              (~{est.low}–{est.high})
            </span>
          </div>
          <div className={`mt-0.5 text-xs font-semibold ${band.tone}`}>{band.label}</div>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
            Scale: average 100, most grammar passes ~111, super-selectives ~120+. Indicative estimate, not an official age-standardised score.
          </p>
        </div>

        {/* Target bands for this mock */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
            <Target className="h-3.5 w-3.5 text-amber-600" />
            On-track targets (this mock)
          </div>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-700">
            <li className="flex items-center justify-between gap-2">
              <span>Super-selective (QE, HBS, Tiffin)</span>
              <span className="shrink-0 font-bold text-emerald-700">~75%+</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Most grammar / consortium</span>
              <span className="shrink-0 font-bold text-emerald-700">~60–70%</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span>Building, gaps to close</span>
              <span className="shrink-0 font-bold text-amber-700">below 55%</span>
            </li>
          </ul>
          <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
            You scored {correct}/{total} ({Math.round(percentage)}%).
          </p>
        </div>
      </div>

      {/* Difficulty note */}
      <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs leading-5 text-slate-700">
        <span className="font-semibold text-blue-800">Difficulty:</span> this mock is pitched at or slightly above real exam level, closer to the harder super-selective papers (QE, Henrietta Barnett, Tiffin) than the gentler GL papers. A lower raw score here does not mean off-track, the targets above already account for that.
      </p>
    </div>
  );
}
