import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { EnergyHeatmap } from '@/lib/mindprint/useEnergyHeatmap';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface EnergyTrackerCardProps {
  data: EnergyHeatmap;
  loading: boolean;
}

export function EnergyTrackerCard({ data, loading }: EnergyTrackerCardProps) {
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

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hourBlocks = ['6–9', '9–12', '12–15', '15–18', '18–21', '21–24'];

  const getColorForScore = (score: number, hasData: boolean) => {
    if (!hasData) return 'no-data-cell'; // Special class for no data
    if (score >= 70) return 'bg-green-500/80';
    if (score >= 50) return 'bg-cyan-500/80';
    if (score >= 30) return 'bg-orange-500/80';
    return 'bg-red-500/80';
  };

  // Transform sparkline for chart
  const sparklineData = data.sparkline.map((value, index) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
    accuracy: value,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 text-cyan-500" />
            Cognitive Energy Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Heatmap */}
          <div className="space-y-2">
              <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Your peak learning hours</p>
              <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{
                      backgroundColor: 'hsl(var(--muted) / 0.15)',
                      backgroundImage: 'repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.08) 0px, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px, transparent 4px)',
                      border: '1px solid hsl(var(--border) / 0.5)',
                    }}
                  />
                  <span>No data</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500/80" />
                  <span>&lt;30%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500/80" />
                  <span>30-50%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-cyan-500/80" />
                  <span>50-70%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500/80" />
                  <span>70%+</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="grid grid-cols-8 gap-1 text-xs mb-2">
                  <div></div>
                  {days.map(day => (
                    <div key={day} className="text-center text-muted-foreground font-medium">
                      {day}
                    </div>
                  ))}
                </div>
                {hourBlocks.map(hourBlock => (
                  <div key={hourBlock} className="grid grid-cols-8 gap-1 mb-1">
                    <div className="text-xs text-muted-foreground flex items-center pr-2">
                      {hourBlock}
                    </div>
                    {days.map(day => {
                      const cell = data.cells.find(
                        c => c.day === day && c.hourBlock === hourBlock
                      );
                      const hasData = cell && cell.score >= 0;
                      const score = cell?.score ?? -1;
                      return (
                        <motion.div
                          key={`${day}-${hourBlock}`}
                          className={`h-8 rounded ${getColorForScore(score, hasData)} transition-all hover:scale-110 cursor-pointer relative overflow-hidden`}
                          style={
                            !hasData
                              ? {
                                  backgroundColor: 'hsl(var(--muted) / 0.15)',
                                  backgroundImage: 'repeating-linear-gradient(45deg, hsl(var(--muted-foreground) / 0.08) 0px, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px, transparent 4px)',
                                  border: '1px solid hsl(var(--border) / 0.5)',
                                }
                              : undefined
                          }
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          title={`${day} ${hourBlock}: ${hasData ? `${Math.round(score)}% efficiency` : 'No data yet'}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-2">
            {data.insights.map((insight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {insight}
              </Badge>
            ))}
          </div>

          {/* Sparkline */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Accuracy last 7 days
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="hsl(var(--cyan-500))"
                  strokeWidth={2}
                  dot={false}
                />
                <XAxis dataKey="day" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Accuracy']}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
