import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/LogoMark";

type ToolsNavProps = {
  label?: string;
  lockTheme?: "light" | "dark";
};

const TOOL_PATHS = [
  "/tools",
  "/free-tools",
  "/gcse-maths-grade-boundaries",
  "/free-tools/gcse-maths-topic-weakness-test",
  "/free-tools/gcse-maths-grade-target-planner",
];

export function ToolsNav({ label, lockTheme }: ToolsNavProps) {
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
  const isDark = (lockTheme ? lockTheme === "dark" : resolvedTheme === "dark") || false;
  const isToolsActive = TOOL_PATHS.some((path) => location.pathname.startsWith(path));

  useIsomorphicLayoutEffect(() => {
    if (!lockTheme) return;
    if (resolvedTheme !== lockTheme) setTheme(lockTheme);
  }, [lockTheme, resolvedTheme, setTheme]);

  const linkBase =
    "text-sm font-medium transition-colors hover:text-slate-900 dark:hover:text-white";
  const activeLink =
    "text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white pb-1";

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:px-6">
        <NavLink to="/" className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
          <div className="rounded-full border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <LogoMark className="h-8 w-8" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Gradlify</div>
            <div className="max-w-[170px] truncate text-xs text-slate-500 dark:text-slate-400 sm:max-w-none">
              Maths. Practised properly.
            </div>
          </div>
        </NavLink>

        <div className="hidden items-center gap-5 lg:flex">
          <NavLink to="/" className={`${linkBase} text-slate-600 dark:text-slate-300`}>
            Gradlify Home
          </NavLink>
          <NavLink
            to="/free-tools"
            className={`${linkBase} ${isToolsActive ? activeLink : "text-slate-600 dark:text-slate-300"}`}
          >
            Free Tools
          </NavLink>
        </div>

        <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
          {!lockTheme && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white sm:inline-flex"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          )}
          <Button
            variant="ghost"
            asChild
            className="px-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:px-2 sm:text-sm"
          >
            <a href="/?auth=login">Log in</a>
          </Button>
          <Button asChild className="rounded-full px-2.5 text-xs font-semibold sm:px-4 sm:text-sm">
            <a href="/gcse?auth=signup">
              <span className="sm:hidden">Start free</span>
              <span className="hidden sm:inline">Start practising free</span>
            </a>
          </Button>
        </div>
      </div>
      {label && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 sm:px-6">
          {label}
        </div>
      )}
    </nav>
  );
}
