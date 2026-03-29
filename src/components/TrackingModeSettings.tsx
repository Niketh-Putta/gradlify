import { useState, useEffect } from 'react';
import { useSubject } from "@/contexts/SubjectContext";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { setTrackingMode, getTrackingMode, type TrackingMode } from '@/lib/readinessApi';
import { toast } from 'sonner';
import { PremiumLoader } from './PremiumLoader';

export default function TrackingModeSettings() {
  const { currentSubject } = useSubject();
  const [mode, setMode] = useState<TrackingMode>('auto');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      setLoading(true);
      const currentMode = await getTrackingMode();
      setMode(currentMode);
    } catch (error) {
      console.error('Failed to load tracking mode:', error);
      toast.error('Failed to load tracking mode');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (newMode: TrackingMode) => {
    if (newMode === mode) return;

    try {
      setSaving(true);
      await setTrackingMode(newMode);
      setMode(newMode);
      toast.success(`Tracking set to ${newMode === 'auto' ? 'Automatic' : 'Manual'}`);
      
      // Trigger a page refresh to reflect the new mode in the dashboard
      window.dispatchEvent(new CustomEvent('readiness-mode-changed'));
    } catch (error) {
      console.error('Failed to update tracking mode:', error);
      toast.error('Failed to update tracking mode');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <PremiumLoader />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">Progress Tracking</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Choose how your exam readiness is calculated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0">
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-xs sm:text-sm font-medium">Tracking Mode</Label>
          
          <div className="inline-flex rounded-[14px] border border-border p-1 bg-muted/40 backdrop-blur-sm">
            <Button
              variant={mode === 'auto' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('auto')}
              disabled={saving}
              className={cn(
                "relative text-xs sm:text-sm h-8 sm:h-9 px-4 rounded-[10px] transition-all duration-300",
                mode === 'auto' && currentSubject === 'english' && "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-0"
              )}
            >
              {saving && mode === 'auto' && (
                <Loader2 className="mr-1 sm:mr-2 h-3 w-3 animate-spin" />
              )}
              Automatic
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange('manual')}
              disabled={saving}
              className={cn(
                "relative text-xs sm:text-sm h-8 sm:h-9 px-4 rounded-[10px] transition-all duration-300",
                mode === 'manual' && currentSubject === 'english' && "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-0"
              )}
            >
              {saving && mode === 'manual' && (
                <Loader2 className="mr-1 sm:mr-2 h-3 w-3 animate-spin" />
              )}
              Manual
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 sm:p-4 text-xs sm:text-sm">
          {mode === 'auto' ? (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="font-medium">Automatic Mode</div>
              <p className="text-muted-foreground">
                Your exam readiness is automatically calculated based on your practice data. 
                The system analyzes accuracy, consistency, and recency to provide objective 
                readiness scores for each topic.
              </p>
              <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1 text-xs text-muted-foreground">
                <div>• <strong>Accuracy:</strong> Correct answers vs total attempts (70% weight)</div>
                <div>• <strong>Recency:</strong> How recently you practiced (20% weight)</div>
                <div>• <strong>Consistency:</strong> Regular practice sessions (10% weight)</div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              <div className="font-medium">Manual Mode</div>
              <p className="text-muted-foreground">
                You set readiness percentages for each topic yourself. Practice data is still 
                recorded but will not automatically update your readiness scores. Use this mode 
                if you prefer to assess your own progress.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
