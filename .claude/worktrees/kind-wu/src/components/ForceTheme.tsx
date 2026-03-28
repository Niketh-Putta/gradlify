import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useTheme } from "next-themes";

type ThemeValue = "light" | "dark" | "system";

interface ForceThemeProps {
  theme: ThemeValue;
  children: ReactNode;
}

export function ForceTheme({ theme, children }: ForceThemeProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const previousThemeRef = useRef<ThemeValue | null>(null);

  const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (previousThemeRef.current === null) {
      previousThemeRef.current = (currentTheme as ThemeValue) || "system";
    }
    void setTheme(theme);

    return () => {
      if (previousThemeRef.current) {
        void setTheme(previousThemeRef.current);
      }
    };
  }, [currentTheme, setTheme, theme]);

  return children;
}
