import { useState, useEffect } from 'react';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';
import { useTheme } from 'next-themes';

export function PremiumLoader({ className = '', logoSize = 56 }: { className?: string; logoSize?: number }) {
  const [progress, setProgress] = useState(0);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (progress < 100) {
      const timeout = setTimeout(() => setProgress((p) => Math.min(100, p + Math.random() * 18 + 7)), 120);
      return () => clearTimeout(timeout);
    }
  }, [progress]);
  const logoSrc = (resolvedTheme === 'dark') ? logoDark : logoLight;
  return (
    <div className={`min-h-[200px] flex flex-col items-center justify-center ${className}`}>
      <img
        src={logoSrc}
        alt="Gradlify logo"
        style={{ width: logoSize, height: logoSize, objectFit: 'contain', marginBottom: 24, borderRadius: '12px', boxShadow: '0 2px 12px 0 rgba(80,80,120,0.08)' }}
      />
      <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}