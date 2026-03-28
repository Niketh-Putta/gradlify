import { Progress } from "@/components/ui/progress";

interface DashboardGaugeProps {
  overall: number;
  loading?: boolean;
}

export function DashboardGauge({ overall, loading }: DashboardGaugeProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-48 h-48">
          <div className="w-full h-full rounded-full border-8 border-muted animate-pulse"></div>
        </div>
        <div className="text-center space-y-2">
          <div className="h-6 w-24 bg-muted rounded animate-pulse mx-auto"></div>
          <div className="h-4 w-48 bg-muted rounded animate-pulse mx-auto"></div>
        </div>
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getColorValue = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-48 h-48">
        {/* Circular progress background */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={getColorValue(overall)}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${overall * 2.51} 251`}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getColor(overall)}`}>
            {overall}%
          </span>
          <span className="text-sm text-muted-foreground">Ready</span>
        </div>
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">Exam Readiness</h2>
        <p className="text-sm text-muted-foreground">
          Average across all GCSE Mathematics topics
        </p>
      </div>
    </div>
  );
}