import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Minimal live mock landing — the replacement for the old `/live-mock-exams`
 * page. It just announces the mock with a couple of details and sends people
 * into the full exam lobby. This is the page the "Live Mock Exams" tab opens
 * and the page the Back link inside the exam returns to.
 */
export default function LiveMockHub() {
  return (
    <main className="min-h-screen bg-[#faf9f4] text-slate-950">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="overflow-hidden rounded-[24px] border border-orange-200 bg-white shadow-[0_20px_60px_rgba(124,45,18,0.08)]">
          <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-8 text-white sm:px-9 sm:py-10">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
              Live mock exam
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">11+ Maths &amp; English Mock</h1>
            <p className="mt-2 text-sm font-medium text-orange-50 sm:text-base">
              A full, timed 11+ live mock exam.
            </p>
          </div>

          <div className="px-6 py-7 sm:px-9 sm:py-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
              <CalendarDays className="h-4 w-4 text-orange-600" />
              Maths &amp; English · one sitting
            </div>

            <Button
              asChild
              className="mt-6 h-12 w-full rounded-xl bg-orange-600 text-base font-bold text-white hover:bg-orange-700"
            >
              <Link to="/live-mock-exams/local-preview">
                Open mock
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
