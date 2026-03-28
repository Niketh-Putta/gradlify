import { useReadinessStore } from '@/lib/stores/useReadinessStore';
import { supabase } from '@/integrations/supabase/client';

interface SubtopicSliderProps {
  topicKey: string;
  subtopicKey: string;
  label: string;
  onSave?: () => void;
}

export function SubtopicSlider({ topicKey, subtopicKey, label, onSave }: SubtopicSliderProps) {
  const k = `${topicKey}|${subtopicKey}`;
  const { scores, loading, setLocal, commit } = useReadinessStore();
  const v = scores[k] ?? 0;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setLocal(k, newValue);
  };

  const onCommit = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('Not signed in');
    }
    await commit(user.id, k, v);
    onSave?.();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-amber-600'; 
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (score >= 40) return 'bg-gradient-to-r from-amber-500 to-amber-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  const getProgressLevel = (score: number) => {
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Developing';
    return 'Needs Work';
  };

  // Show skeleton while loading
  if (loading && v === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-5 w-12 bg-muted rounded-full animate-pulse"></div>
        </div>
        <div className="w-full h-6 bg-muted rounded-full animate-pulse"></div>
        <div className="w-full h-2 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Header with Label and Pill Badge */}
      <div className="flex items-center justify-between gap-2">
        <label className="font-semibold text-foreground text-xs sm:text-sm line-clamp-2">{label}</label>
        <div className={`
          px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0
          ${getProgressColor(v)}
        `}>
          {v}%
        </div>
      </div>
      
      {/* Pill-shaped Progress Bar */}
      <div className="relative">
        <div className="w-full h-5 sm:h-6 bg-muted rounded-full overflow-hidden shadow-inner">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-2 ${getProgressColor(v)}`}
            style={{ width: `${Math.max(v, 8)}%` }}
          >
            {v > 15 && (
              <span className="text-white text-xs font-bold">
                {v}%
              </span>
            )}
          </div>
        </div>
        {v <= 15 && (
          <div className="absolute inset-0 flex items-center pl-2">
            <span className={`text-xs font-bold ${getScoreColor(v)}`}>
              {v}%
            </span>
          </div>
        )}
      </div>

      {/* Performance Level and Slider */}
      <div className="space-y-2">
        <div className="text-center">
          <span className={`text-xs font-medium ${getScoreColor(v)}`}>
            {getProgressLevel(v)}
          </span>
        </div>
        
        {/* Hidden Range Slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={v}
          onChange={onChange}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer 
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary 
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background 
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background 
            [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-none
            hover:bg-secondary/80 transition-colors"
        />
      </div>
    </div>
  );
}