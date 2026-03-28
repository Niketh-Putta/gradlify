import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { getRandomQuote } from "@/lib/motivation/quotes";
import { getRandomAffirmation } from "@/lib/motivation/affirmations";
import { TrendingUp, Trophy, Sparkles, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useAppContext } from "@/hooks/useAppContext";

interface MomentumData {
  day: string;
  readiness: number;
}

export function MotivationSection() {
  const { user } = useAppContext();
  const [quote, setQuote] = useState(getRandomQuote());
  const [affirmation, setAffirmation] = useState(getRandomAffirmation());
  const [wins, setWins] = useState<string[]>([]);
  const [momentumData, setMomentumData] = useState<MomentumData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeeklyData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setWins([]);
      setMomentumData([]);
      return;
    }
    try {
      setLoading(true);

      // Get readiness history for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: historyData, error: historyError } = await supabase
        .from('readiness_history')
        .select('topic, readiness_after, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (historyError) throw historyError;

      // Process momentum data - group by day and calculate average
      const dayMap: { [key: string]: number[] } = {};
      historyData?.forEach((entry) => {
        const day = new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(entry.readiness_after);
      });

      const momentum: MomentumData[] = Object.entries(dayMap).map(([day, values]) => ({
        day,
        readiness: Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      }));

      setMomentumData(momentum);

      // Calculate wins from history
      const weekWins: string[] = [];
      
      // Check improved topics
      const topicImprovements = new Map<string, { before: number; after: number }>();
      historyData?.forEach((entry) => {
        if (!topicImprovements.has(entry.topic)) {
          topicImprovements.set(entry.topic, { before: entry.readiness_after, after: entry.readiness_after });
        } else {
          const current = topicImprovements.get(entry.topic)!;
          topicImprovements.set(entry.topic, { ...current, after: entry.readiness_after });
        }
      });

      topicImprovements.forEach((value, topic) => {
        const improvement = value.after - value.before;
        if (improvement > 5) {
          weekWins.push(`${topic} +${improvement.toFixed(0)}%`);
        }
      });

      // Count sessions this week
      const uniqueSessions = new Set(historyData?.map(h => new Date(h.created_at).toDateString())).size;
      if (uniqueSessions > 0) {
        weekWins.push(`${uniqueSessions} active day${uniqueSessions > 1 ? 's' : ''}`);
      }

      // Get mock attempts count
      const { count: mockCount } = await supabase
        .from('mock_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('started_at', sevenDaysAgo.toISOString())
        .eq('status', 'completed');

      if (mockCount && mockCount > 0) {
        weekWins.push(`${mockCount} mock${mockCount > 1 ? 's' : ''} completed`);
      }

      if (weekWins.length === 0) {
        weekWins.push("Start your journey today!");
      }

      setWins(weekWins.slice(0, 3));
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      setWins(["Keep pushing forward!"]);
      setMomentumData([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchWeeklyData();
  }, [fetchWeeklyData]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mt-6 mb-8"
    >
      <div className="rounded-2xl p-6 shadow-lg relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 dark:from-primary/20 dark:via-purple-600/30 dark:to-primary/20 border border-border">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 dark:from-sky-400/10 dark:via-transparent dark:to-purple-400/10 pointer-events-none" />
        
        {/* Title */}
        <motion.div variants={cardVariants} className="relative z-10 mb-6">
          <h2 className="text-4xl font-bold text-foreground border-b-4 border-primary w-fit pb-1">
            Motivation
          </h2>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 relative z-10">
          {/* Daily Power Quote */}
          <motion.div variants={cardVariants}>
            <Card className="p-6 bg-card/50 dark:bg-card/30 backdrop-blur-sm border-border hover:bg-card/70 dark:hover:bg-card/50 transition-all duration-300 h-full">
              <div className="flex items-start gap-3 mb-3">
                <Sparkles className="h-6 w-6 text-yellow-500 dark:text-yellow-400 flex-shrink-0 animate-pulse" />
                <h3 className="text-lg font-bold text-foreground">Daily Power Quote</h3>
              </div>
              <blockquote className="text-foreground/80 dark:text-foreground/90 italic text-base leading-relaxed mb-3">
                "{quote.text}"
              </blockquote>
              <p className="text-primary dark:text-sky-300 text-sm font-semibold">— {quote.author}</p>
            </Card>
          </motion.div>

          {/* This Week's Wins */}
          <motion.div variants={cardVariants}>
            <Card className="p-6 bg-card/50 dark:bg-card/30 backdrop-blur-sm border-border hover:bg-card/70 dark:hover:bg-card/50 transition-all duration-300 h-full">
              <div className="flex items-start gap-3 mb-4">
                <Trophy className="h-6 w-6 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                <h3 className="text-lg font-bold text-foreground">This Week's Wins</h3>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-6 bg-muted/50 dark:bg-muted/30 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-3">
                  {wins.map((win, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-3 text-foreground/80 dark:text-foreground/90"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0" />
                      <span className="text-base">{win}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>

          {/* Momentum Graph */}
          <motion.div variants={cardVariants}>
            <Card className="p-6 bg-card/50 dark:bg-card/30 backdrop-blur-sm border-border hover:bg-card/70 dark:hover:bg-card/50 transition-all duration-300 h-full">
              <div className="flex items-start gap-3 mb-4">
                <TrendingUp className="h-6 w-6 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                <h3 className="text-lg font-bold text-foreground">Momentum Graph</h3>
              </div>
              {loading || momentumData.length === 0 ? (
                <div className="h-32 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">
                    {loading ? 'Loading...' : 'Complete activities to see your momentum'}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={momentumData}>
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))"
                      opacity={0.6}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      opacity={0.6}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="readiness" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--accent))', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>

          {/* Mindset of the Day */}
          <motion.div variants={cardVariants}>
            <Card className="p-6 bg-card/50 dark:bg-card/30 backdrop-blur-sm border-border hover:bg-card/70 dark:hover:bg-card/50 transition-all duration-300 h-full">
              <div className="flex items-start gap-3 mb-4">
                <Brain className="h-6 w-6 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                <h3 className="text-lg font-bold text-foreground">Mindset of the Day</h3>
              </div>
              <p className="text-foreground/80 dark:text-foreground/90 text-base leading-relaxed">
                {affirmation}
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          variants={cardVariants}
          className="mt-6 text-center relative z-10"
        >
          <p className="text-foreground/70 dark:text-foreground/80 text-sm font-semibold tracking-wide">
            Consistency builds greatness
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
