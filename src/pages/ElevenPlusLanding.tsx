import { LandingPage } from "@/components/LandingPage";

interface ElevenPlusLandingProps {
  onAuthAction: (action: "login" | "signup") => void;
  theme?: "dark" | "light";
  onThemeToggle?: () => void;
}

// Structural clone of the GCSE landing page for the 11+ route.
// Intentionally preserves all existing GCSE copy and layout.
export function ElevenPlusLanding({ onAuthAction, theme = "light", onThemeToggle }: ElevenPlusLandingProps) {
  return (
    <LandingPage
      onAuthAction={onAuthAction}
      theme={theme}
      onThemeToggle={onThemeToggle}
      variant="11plus"
    />
  );
}
