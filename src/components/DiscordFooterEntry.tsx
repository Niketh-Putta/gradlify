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
          "group relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 sm:p-7 rounded-[28px] bg-[#090E11] dark:bg-[#030712] border border-[#25d366]/20 transition-all duration-700 w-full shadow-lg hover:shadow-[0_8px_32px_-12px_rgba(37,211,102,0.3)] hover:border-[#25d366]/40",
          className
        )}
      >
        {/* Deep ambient inner glow taking over the card */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#25D366]/5 via-[#25D366]/[0.02] to-transparent pointer-events-none" />
        <div className="absolute -left-32 -top-32 w-64 h-64 bg-[#25D366]/15 blur-[80px] rounded-full pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
        
        <div className="flex items-center gap-5 relative z-10 w-full sm:w-auto">
          {/* Elite WhatsApp Icon Chassis */}
          <div className="w-14 h-14 shrink-0 rounded-[18px] bg-black/60 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_4px_16px_rgba(0,0,0,0.5)] group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),_0_0_20px_rgba(37,211,102,0.3)] transition-all duration-500 overflow-hidden relative">
             <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
             <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="text-[#25d366] transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_2px_8px_rgba(37,211,102,0.4)]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
             </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-[#25D366]" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#25d366] shadow-[0_0_8px_#25d366]" />
              </span>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#25d366]">Free Community</p>
            </div>
            <p className="text-xl sm:text-[22px] font-extrabold text-white tracking-tight leading-none mb-1">
              The Level Field
            </p>
            <p className="text-[13px] font-medium text-slate-400 w-full max-w-sm">
              Daily 11+ practice materials and exam strategies.
            </p>
          </div>
        </div>
        
        <div className="relative z-10 flex cursor-pointer items-center justify-center text-[13px] font-bold tracking-wide text-black px-7 py-3 rounded-xl flex-shrink-0 transition-all duration-300 w-full sm:w-auto text-center overflow-hidden group/btn shadow-[0_4px_16px_rgba(37,211,102,0.2)] hover:shadow-[0_8px_32px_rgba(37,211,102,0.4)] active:scale-[0.98]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#128c47] via-[#25d366] to-[#128c47] bg-[length:200%_auto] bg-[0%_0] group-hover/btn:bg-[100%_0] transition-all duration-500" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
          <span className="relative z-10 mx-1">Join WhatsApp Group</span>
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
        "group relative overflow-hidden flex items-center justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card hover:bg-card/80 transition-all duration-300 w-full shadow-sm hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center gap-4 relative z-10 w-full">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-background/50 border border-border/50 flex items-center justify-center text-[#25d366] group-hover:scale-105 transition-transform duration-300 shadow-inner">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.49" />
           </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight tracking-tight">The Level Field</p>
          <p className="text-xs font-medium text-muted-foreground truncate">Free daily 11+ materials on WhatsApp</p>
        </div>
        <div className="text-xs font-semibold text-muted-foreground bg-background border border-border/50 px-3 py-1.5 rounded-md flex-shrink-0 group-hover:border-[#25D366]/40 group-hover:text-[#25D366] transition-colors shadow-sm">
          Join →
        </div>
      </div>
    </a>
  );
}
