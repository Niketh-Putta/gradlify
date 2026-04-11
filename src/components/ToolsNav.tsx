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
  "/free-resources",
  "/gcse-maths-grade-boundaries",
  "/free-resources/gcse-maths-topic-weakness-test",
  "/free-resources/gcse-maths-grade-target-planner",
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
      <div className="mx-auto flex w-full max-w-6xl items-center px-3 py-3 sm:px-6">
        <div className="flex flex-1 justify-start">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <LogoMark className="h-8 w-8" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Gradlify</div>
              <div className="max-w-[170px] truncate text-xs text-slate-500 dark:text-slate-400 sm:max-w-none">
                11+ practiced properly.
              </div>
            </div>
          </NavLink>
        </div>

        <div className="flex flex-1 justify-center">
          <Button
            variant="ghost"
            asChild
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <NavLink to="/">Home</NavLink>
          </Button>
        </div>

        <div className="flex flex-1 justify-end" />
      </div>
      {label && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 sm:px-6">
          {label}
        </div>
      )}
    </nav>
  );
}
