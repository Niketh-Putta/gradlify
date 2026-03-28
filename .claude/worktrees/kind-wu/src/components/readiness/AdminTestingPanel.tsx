import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTestingMode } from '@/hooks/useTestingMode';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

const TOPICS = [
  'Number',
  'Algebra',
  'Ratio & Proportion',
  'Geometry & Measures',
  'Probability',
  'Statistics',
];

export function AdminTestingPanel({ userId }: { userId: string }) {
  const { isTestingMode } = useTestingMode();
  const [topic, setTopic] = useState<string>('Number');
  const [correct, setCorrect] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [timeSecs, setTimeSecs] = useState<number>(60);
  const [reasoning, setReasoning] = useState<string>('');
  const [inserting, setInserting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  if (!isTestingMode || !AI_FEATURE_ENABLED) return null;

  const handleInsertAIEvent = async () => {
    setInserting(true);
    try {
      const { error } = await supabase
        .from('ai_readiness_events')
        .insert({
          user_id: userId,
          topic,
          correct,
          difficulty,
          time_secs: timeSecs,
          model_reasoning: reasoning || null,
        });

      if (error) throw error;

      toast.success('AI event inserted successfully');
      setReasoning('');
    } catch (error) {
      console.error('Error inserting AI event:', error);
      toast.error('Failed to insert AI event');
    } finally {
      setInserting(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.rpc('recalc_readiness_and_update_profile', {
        p_user: userId,
      });

      if (error) throw error;

      toast.success('Readiness recalculated');
    } catch (error) {
      console.error('Error recalculating:', error);
      toast.error('Failed to recalculate');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-amber-500">Admin Testing Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label>Correct Answer</Label>
          <Switch checked={correct} onCheckedChange={setCorrect} />
        </div>

        <div className="space-y-2">
          <Label>Difficulty (1-5)</Label>
          <Input
            type="number"
            min="1"
            max="5"
            value={difficulty}
            onChange={(e) => setDifficulty(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>Time (seconds)</Label>
          <Input
            type="number"
            min="1"
            value={timeSecs}
            onChange={(e) => setTimeSecs(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>AI Reasoning (optional)</Label>
          <Input
            placeholder="Model reasoning text..."
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleInsertAIEvent}
            disabled={inserting}
            className="flex-1"
          >
            {inserting ? 'Inserting...' : 'Insert AI Event'}
          </Button>
          <Button
            onClick={handleRecalculate}
            disabled={recalculating}
            variant="outline"
          >
            {recalculating ? 'Recalc...' : 'Recalc'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
