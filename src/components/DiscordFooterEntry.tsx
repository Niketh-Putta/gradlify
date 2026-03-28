import clsx from "clsx";
import { MessageCircle } from "lucide-react";

const FALLBACK_INVITE_URL = "https://discord.gg/SDxMuVJX";
const INVITE_URL =
  (import.meta.env.VITE_DISCORD_INVITE_URL ?? "").trim() ||
  FALLBACK_INVITE_URL;

interface DiscordFooterEntryProps {
  className?: string;
  variant?: "footer" | "spotlight";
}

export function DiscordFooterEntry({
  className,
  variant = "footer",
}: DiscordFooterEntryProps) {
  if (!INVITE_URL) {
    return null;
  }

  const copy = (
    <>
      <p className="leading-relaxed">
        Sprint announcements, platform updates, and bug reports — all in one
        place.
      </p>
    </>
  );

  if (variant === "spotlight") {
    return (
      <div
        className={clsx(
          "relative overflow-hidden rounded-[32px] border border-indigo-500/40 bg-gradient-to-br from-indigo-600 via-slate-900 to-slate-950 p-6 shadow-[0_30px_45px_rgba(15,23,42,0.55)] text-white",
          className
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_45%)]" />
        </div>
        <div className="relative flex flex-col gap-3 lg:max-w-5xl">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-200">
            <MessageCircle size={18} />
            Gradlify Discord
          </div>
          <p className="text-2xl font-semibold leading-snug">
            Sprint announcements, platform updates, and bug reports — all in one
            place.
          </p>
          <div className="text-sm text-indigo-100">{copy}</div>
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center w-fit rounded-full bg-white/90 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 transition hover:bg-white dark:hover:bg-white"
          >
            Join Discord →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "border-t border-slate-200/70 dark:border-slate-800/70 pt-6",
        className
      )}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-1 text-[13px] sm:text-sm text-slate-500 dark:text-slate-400">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Gradlify Discord
        </p>
        {copy}
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noreferrer"
          className="w-fit pt-1 text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
        >
          Join Discord →
        </a>
      </div>
    </div>
  );
}
