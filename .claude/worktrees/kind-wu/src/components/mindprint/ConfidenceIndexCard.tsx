import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConfidenceIndex } from '@/lib/mindprint/useConfidenceIndex';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, Legend } from 'recharts';

interface ConfidenceIndexCardProps {
  data: ConfidenceIndex;
  loading: boolean;
}

export function ConfidenceIndexCard({ data, loading }: ConfidenceIndexCardProps) {
  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Confident\n& Correct', value: data.confidentCorrect, color: 'hsl(142, 76%, 36%)' },
    { name: 'Confident\n& Wrong', value: data.confidentWrong, color: 'hsl(0, 84%, 60%)' },
    { name: 'Unsure\n& Correct', value: data.unsureCorrect, color: 'hsl(189, 85%, 61%)' },
    { name: 'Unsure\n& Wrong', value: data.unsureWrong, color: 'hsl(28, 87%, 67%)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="h-5 w-5 text-green-500" />
            Confidence Accuracy Index
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bar Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} style={{ background: 'transparent' }}>
              <defs>
                <rect id="backgroundRect" fill="transparent" />
              </defs>
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value, 'Count']}
                cursor={{ fill: 'transparent' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend with colored boxes */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-muted-foreground">{item.name.replace('\n', ' ')}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-2 border-t border-border/50 space-y-2">
            <p className="text-sm text-foreground font-medium">{data.summary}</p>
            <Badge variant="outline" className="text-xs">
              Confidence accuracy: {data.confidenceAccuracy.toFixed(2)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
