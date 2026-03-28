import { Button } from "@/components/ui/button";
import { ArrowUpRight, Download } from "lucide-react";
import { QUADRATICS_GUIDE } from "@/lib/revisionGuide";

export default function RevisionGuideQuadratics() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
              Included with Gradlify
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {QUADRATICS_GUIDE.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {QUADRATICS_GUIDE.subtitle} revision guide.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              Normally reserved for premium users.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild className="gap-2">
              <a href={QUADRATICS_GUIDE.pdfSrc} target="_blank" rel="noreferrer">
                Open in new tab
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild className="gap-2">
              <a href={QUADRATICS_GUIDE.pdfSrc} download>
                Download PDF
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          {/* Keep the viewer tall so the guide feels substantial and print-ready. */}
          <iframe
            title="Quadratic Equations and Graphs revision guide"
            src={`${QUADRATICS_GUIDE.pdfSrc}#view=FitH`}
            className="h-[78vh] min-h-[720px] w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
