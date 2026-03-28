import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UpdateProgressPanelProps {
  topics: Array<{ topic: string; readiness: number }>;
  onUpdate: (topic: string, before: number, after: number, reason: string) => Promise<boolean>;
}

const TOPICS = [
  'Number',
  'Algebra',
  'Ratio & Proportion',
  'Geometry & Measures',
  'Probability',
  'Statistics',
];

const REASONS = [
  { value: 'manual:update', label: 'Manual Update' },
  { value: 'practice', label: 'Practice Session' },
  { value: 'mock', label: 'Mock Exam' },
  { value: 'revision', label: 'Revision' },
];

export function UpdateProgressPanel({ topics, onUpdate }: UpdateProgressPanelProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [afterScore, setAfterScore] = useState<number>(50);
  const [reason, setReason] = useState<string>('manual:update');
  const [updating, setUpdating] = useState(false);

  const currentTopic = topics.find((t) => t.topic === selectedTopic);
  const beforeScore = currentTopic?.readiness || 0;

  const handleSubmit = async () => {
    if (!selectedTopic) return;

    setUpdating(true);
    const success = await onUpdate(selectedTopic, beforeScore, afterScore, reason);
    setUpdating(false);

    if (success) {
      setSelectedTopic('');
      setAfterScore(50);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-base sm:text-lg md:text-xl">Update My Progress</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Manually adjust your readiness scores based on your self-assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0">
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="text-xs sm:text-sm">Topic</Label>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((topic) => (
                <SelectItem key={topic} value={topic} className="text-xs sm:text-sm">
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTopic && (
          <>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Current Score: {Math.round(beforeScore)}%</Label>
              <div className="text-xs text-muted-foreground">
                This is your current readiness for {selectedTopic}
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">New Score: {afterScore}%</Label>
              <Slider
                value={[afterScore]}
                onValueChange={([value]) => setAfterScore(value)}
                min={0}
                max={100}
                step={5}
                className="py-3 sm:py-4"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="h-8 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs sm:text-sm">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={updating || afterScore === beforeScore}
              className="w-full text-xs sm:text-sm h-8 sm:h-10"
            >
              {updating ? 'Updating...' : 'Update Progress'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
