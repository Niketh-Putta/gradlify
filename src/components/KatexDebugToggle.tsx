import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toggleKatexDebugMode, isKatexDebugMode } from '@/components/MathRenderer';
import { Bug, BugOff } from 'lucide-react';

/**
 * Debug toggle for KaTeX rendering
 * Shows original LaTeX, normalized LaTeX, and transformations applied
 * Access via: window.toggleKatexDebug()
 */
export function KatexDebugToggle() {
  const [isDebug, setIsDebug] = useState(isKatexDebugMode());

  const handleToggle = () => {
    const newState = toggleKatexDebugMode();
    setIsDebug(newState);
  };

  return (
    <Button
      onClick={handleToggle}
      variant={isDebug ? "default" : "outline"}
      size="sm"
      className="fixed bottom-4 right-4 z-50 shadow-lg"
      title="Toggle LaTeX debug mode"
    >
      {isDebug ? (
        <>
          <Bug className="w-4 h-4 mr-2" />
          LaTeX Debug ON
        </>
      ) : (
        <>
          <BugOff className="w-4 h-4 mr-2" />
          LaTeX Debug
        </>
      )}
    </Button>
  );
}

// Expose toggle to window for console access
if (typeof window !== 'undefined') {
  const windowWithKatexDebug = window as Window & { toggleKatexDebug?: () => boolean };
  windowWithKatexDebug.toggleKatexDebug = () => {
    const newState = toggleKatexDebugMode();
    console.log(`KaTeX debug mode: ${newState ? 'ON' : 'OFF'}`);
    return newState;
  };
}
