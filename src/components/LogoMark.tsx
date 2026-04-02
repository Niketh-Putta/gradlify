import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";

interface LogoMarkProps {
  className?: string;
  size?: number;
  variant?: "auto" | "light" | "dark";
}

export function LogoMark({ className, size = 40, variant = "auto" }: LogoMarkProps) {
  const { resolvedTheme } = useTheme();
  const inferTheme = () => {
    if (resolvedTheme) return resolvedTheme;
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return "dark";
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };
  const resolvedVariant = variant === "auto" ? (inferTheme() === "dark" ? "dark" : "light") : variant;
  const logoSrc = resolvedVariant === "dark" ? logoDark : logoLight;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logoSrc}
        alt="Gradlify logo"
        className={cn(
          "h-full w-full object-contain rounded-full",
          resolvedVariant === "light" && "mix-blend-multiply"
        )}
        aria-hidden="true"
      />
    </div>
  );
}
