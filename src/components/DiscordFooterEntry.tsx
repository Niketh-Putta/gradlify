import clsx from "clsx";

const WHATSAPP_URL = "https://chat.whatsapp.com/K8poZzmXNkUIJglRC4Vpqe?mode=gi_t";

interface DiscordFooterEntryProps {
  className?: string;
  variant?: "footer" | "spotlight";
}

export function DiscordFooterEntry({
  className,
  variant = "footer",
}: DiscordFooterEntryProps) {
  if (variant === "spotlight") {
    return (
      <div
        className={clsx(
          "relative overflow-hidden rounded-[28px] p-px bg-white",
          className
        )}
        style={{
          boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,1)',
          border: '1px solid rgba(0,0,0,0.08)'
        }}
      >
        {/* Main card */}
        <div className="relative overflow-hidden rounded-[27px] p-6 sm:p-8 bg-white border border-white">
          {/* Subtle brand glow on the right */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/2 opacity-[0.15]"
            style={{ 
              background: "radial-gradient(circle at right center, #25d366 0%, transparent 70%)" 
            }} 
          />
          <div className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full opacity-10 blur-3xl"
            style={{ background: "#25d366" }} 
          />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
            {/* Left: Content */}
            <div className="flex-1 min-w-0">
              {/* Label row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                  Free WhatsApp Channel
                </span>
              </div>

              {/* Title */}
              <h3 className="text-slate-900 font-bold text-xl sm:text-2xl leading-tight mb-2 tracking-tight">
                The Level Field
              </h3>

              {/* Description */}
              <p className="text-sm leading-relaxed mb-5 text-slate-500 max-w-sm">
                Free daily 11+ practice materials, curated tips and exam strategies - delivered straight to your phone.
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-6">
                {[
                  { label: "Daily materials" },
                  { label: "Free forever" },
                  { label: "11+ focused" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-medium text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.97] text-white"
                style={{
                  background: "linear-gradient(135deg, #25d366, #1da851)",
                  boxShadow: "0 0 0 1px rgba(37,211,102,0.3), 0 4px 16px rgba(37,211,102,0.25), 0 8px 32px rgba(37,211,102,0.15)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
                </svg>
                Join The Level Field
              </a>
            </div>

            {/* Right: Elegant illustration / mesh graphic instead of chat bubbles */}
            <div className="hidden sm:flex shrink-0 w-64 h-48 relative justify-end items-center mr-4">
              {/* Premium geometric layout */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-teal-400/5 to-transparent rounded-3xl border border-emerald-500/10 rotate-3 transform origin-bottom-right transition-transform group-hover:rotate-6" />
              <div className="relative w-56 h-40 bg-white/60 backdrop-blur-xl rounded-2xl border border-white shadow-xl shadow-emerald-900/5 flex flex-col justify-center items-center p-6 -rotate-2 transform overflow-hidden">
                {/* Decorative mesh/grid background inside the pane */}
                <div className="absolute inset-0 opacity-[0.03]" 
                  style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#25d366] to-[#128c47] flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 relative z-10">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
                  </svg>
                </div>
                <div className="h-1.5 w-16 bg-slate-200 rounded-full mb-1.5 relative z-10" />
                <div className="h-1.5 w-10 bg-slate-100 rounded-full relative z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Footer variant - compact
  return (
    <div className={clsx("border-t border-border/50 pt-5", className)}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">🟢 The Level Field</p>
          <p className="text-xs text-muted-foreground mt-0.5">Free daily 11+ materials on WhatsApp</p>
        </div>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
        >
          Join free →
        </a>
      </div>
    </div>
  );
}
