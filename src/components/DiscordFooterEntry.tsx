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
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className={clsx(
          "group relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-8 rounded-[24px] border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all duration-500 w-full shadow-sm hover:shadow-md hover:border-emerald-500/30",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        {/* Subtle glow behind the icon */}
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex items-center gap-5 sm:gap-6 relative z-10 w-full sm:w-auto">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#25d366] to-[#128c47] flex items-center justify-center shadow-lg shadow-emerald-500/20 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
             </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Free Community</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 mb-1 transition-colors">The Level Field</p>
            <p className="text-sm text-slate-500 dark:text-muted-foreground w-full max-w-sm">Daily 11+ practice materials and exam strategies.</p>
          </div>
        </div>
        
        <div className="relative z-10 text-[13px] font-bold tracking-wide text-white bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-full flex-shrink-0 transition-colors shadow-sm shadow-emerald-500/20 group-hover:shadow-md group-hover:shadow-emerald-500/30 w-full sm:w-auto text-center border-t border-white/20">
          Join WhatsApp Group
        </div>
      </a>
    );
  }

  // Footer variant - cleaner and wider
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "group relative overflow-hidden flex items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all duration-300 w-full",
        className
      )}
    >
      <div className="flex items-center gap-4 relative z-10 w-full">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-[#25d366]/10 flex items-center justify-center text-[#25d366] shrink-0">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
           </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-foreground leading-tight">The Level Field</p>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-muted-foreground truncate">Free daily 11+ materials on WhatsApp</p>
        </div>
        <div className="text-[11px] sm:text-[12px] font-bold text-emerald-600 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full flex-shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/50 transition-colors">
          Join →
        </div>
      </div>
    </a>
  );
}
