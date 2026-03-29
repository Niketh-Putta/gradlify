import React, { useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import { Target, AlertCircle, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TopicData {
  topic: string;
  readiness: number;
}

interface PremiumAnalyticsProps {
  displayTopics: TopicData[];
  accuracyPct: number;
  speedPct: number;
  profileName: string;
  subject?: 'maths' | 'english';
}

export function PremiumAnalyticsDashboard({ displayTopics, accuracyPct, speedPct, profileName, subject = 'maths' }: PremiumAnalyticsProps) {
  const firstName = profileName ? profileName.split(' ')[0] : 'The student';

  const { radarData, targetScore } = useMemo(() => {
    const validTopics = displayTopics.filter(t => t.topic && t.readiness !== undefined);
    
    const data = validTopics.map(t => ({
      subject: t.topic,
      A: Math.max(0, t.readiness),
      fullMark: 100
    }));

    return { radarData: data, targetScore: 85 };
  }, [displayTopics, accuracyPct, speedPct]);

  const trajectoryData = useMemo(() => {
    // Generate an asymptotic curve based on their current average
    const currentAvg = displayTopics.reduce((acc, val) => acc + val.readiness, 0) / (displayTopics.length || 1);
    
    const data = [];
    const now = new Date();
    
    // Go back 6 months, projecting forward 2 months
    for (let i = -6; i <= 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthLabel = format(d, 'MMM \'\n\'yy'); // Two line label logic handled below
        
        let scoreVal;
        if (i < 0) {
            // E.g. start linearly growing towards currentAvg
            const growth = (Math.abs(i) / 6) * 30; // 30 point growth over 6 months
            scoreVal = currentAvg - growth;
        } else if (i === 0) {
            scoreVal = currentAvg;
        } else {
            // Future projection curving towards 90
            const gap = 90 - currentAvg;
            scoreVal = currentAvg + (gap * (i / 4)); // smooth asymptotic approach
        }
        
        data.push({
            name: format(d, "MMM ''yy"), 
            score: Math.max(0, Math.min(100, scoreVal)),
            isFuture: i > 0
        });
    }
    return data;
  }, [displayTopics]);

  const insights = useMemo(() => {
    const valid = displayTopics.filter(t => t.topic);
    if (valid.length < 2) return { best: 'core concepts', worst: 'advanced topics', recommendation: 'Initiate daily practice sessions.' };
    
    const sorted = [...valid].sort((a, b) => (b.readiness || 0) - (a.readiness || 0));
    const bestTopic = sorted[0].topic.toLowerCase();
    const worstTopic = sorted[sorted.length - 1].topic.toLowerCase();
    
    return {
      best: bestTopic,
      worst: worstTopic,
      recommendation: `Initiate timed, targeted 10-minute Sprint practice sessions in ${worstTopic}.`
    };
  }, [displayTopics]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between mb-2 px-2">
        <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight text-foreground">Analytics</h2>
        <div className="hidden sm:flex items-center gap-2">
          <div className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm",
            subject === 'english' ? "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border-amber-200/50" : "bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-blue-200/50"
          )}>
            Premium Analytics
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Radar Chart Card */}
        <div className={cn(
          "bg-[#FFFDF8] dark:bg-card rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border flex flex-col h-full ring-1 ring-black/5",
          subject === 'english' ? "border-amber-100/50" : "border-blue-100/50"
        )}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={cn(
               "text-[13px] font-serif font-black tracking-[0.15em] uppercase",
               subject === 'english' ? "text-amber-950/80 dark:text-amber-100/80" : "text-blue-950/80 dark:text-blue-100/80"
            )}>
              Cognitive Readiness Profile
            </h3>
            <button className="text-muted-foreground hover:text-foreground">
              <span className="sr-only">Options</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#78716c', fontSize: 11, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Target"
                  dataKey="fullMark"
                  stroke="transparent"
                  fill={subject === 'english' ? "#fef3c7" : "#dbeafe"}
                  fillOpacity={0.4}
                />
                <Radar
                  name={firstName}
                  dataKey="A"
                  stroke={subject === 'english' ? "#f59e0b" : "#3b82f6"}
                  strokeWidth={2}
                  fill={subject === 'english' ? "#fcd34d" : "#93c5fd"}
                  fillOpacity={0.3}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '13px', fontWeight: 600 }}
                  itemStyle={{ color: '#0f172a' }}
                  formatter={(value: number) => [`${Math.round(value)}/100`, `${firstName}'s level`]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2">
               <div className={cn(
                 "w-3.5 h-3.5 rounded border",
                 subject === 'english' ? "bg-amber-100 border-amber-300" : "bg-blue-100 border-blue-300"
               )}></div>
               <span className="text-[11px] font-medium text-muted-foreground">Target Selective Standard</span>
            </div>
            <div className="flex items-center gap-2">
               <div className={cn(
                 "w-3.5 h-3.5 rounded border",
                 subject === 'english' ? "bg-amber-300 border-amber-500" : "bg-blue-300 border-blue-500"
               )}></div>
               <span className="text-[11px] font-medium text-muted-foreground">{firstName}'s Current Level</span>
            </div>
          </div>
        </div>

        {/* Trajectory Card */}
        <div className={cn(
          "bg-[#FFFDF8] dark:bg-card rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border flex flex-col h-full ring-1 ring-black/5",
          subject === 'english' ? "border-amber-100/50" : "border-blue-100/50"
        )}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={cn(
               "text-[13px] font-serif font-black tracking-[0.15em] uppercase",
               subject === 'english' ? "text-amber-950/80 dark:text-amber-100/80" : "text-blue-950/80 dark:text-blue-100/80"
            )}>
              Performance Trajectory & Projection
            </h3>
            <button className="text-muted-foreground hover:text-foreground">
              <span className="sr-only">Options</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart
                 data={trajectoryData}
                 margin={{ top: 30, right: 10, left: -20, bottom: 0 }}
               >
                 <defs>
                   <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor={subject === 'english' ? "#f59e0b" : "#3b82f6"} stopOpacity={0.15}/>
                     <stop offset="95%" stopColor={subject === 'english' ? "#f59e0b" : "#3b82f6"} stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                 <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#78716c', fontSize: 11, fontWeight: 500 }}
                   dy={10}
                 />
                 <YAxis 
                   domain={[0, 100]} 
                   axisLine={false} 
                   tickLine={false}
                   tick={{ fill: '#78716c', fontSize: 11, fontWeight: 500 }}
                 />
                 <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }}
                 />
                 <ReferenceLine 
                   y={85} 
                   stroke={subject === 'english' ? "#d97706" : "#2563eb"} 
                   strokeDasharray="4 4" 
                   label={{ value: 'Selective Grammar Standard Threshold', fill: subject === 'english' ? '#92400e' : '#1e40af', fontSize: 10, position: 'top' }} 
                 />
                 <Area 
                   type="monotone" 
                   dataKey="score" 
                   stroke={subject === 'english' ? "#f59e0b" : "#3b82f6"} 
                   strokeWidth={3}
                   fillOpacity={1} 
                   fill="url(#colorScore)" 
                   activeDot={{ r: 6, strokeWidth: 2, fill: "#fff" }}
                 />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Parent Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Qualitative Breakdown */}
        <div className={cn(
          "lg:col-span-2 rounded-[24px] p-8 shadow-sm relative border",
          subject === 'english' 
            ? "bg-gradient-to-br from-[#FFFCF6] to-[#FFF9F0] dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/50" 
            : "bg-gradient-to-br from-[#F6F9FF] to-[#F0F5FF] dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-200/50"
        )}>
             <div className="mb-4">
               <h3 className={cn(
                  "text-[13px] font-serif font-black tracking-[0.15em] uppercase",
                  subject === 'english' ? "text-amber-950/80 dark:text-amber-100/80" : "text-blue-950/80 dark:text-blue-100/80"
               )}>
                  Parent Insights
               </h3>
             </div>
             <div className={cn(
               "prose prose-sm dark:prose-invert max-w-none",
               subject === 'english' ? "prose-amber" : "prose-blue"
             )}>
               <p className={cn(
                 "text-[15px] sm:text-base leading-[1.7] font-medium font-serif mb-6",
                 subject === 'english' ? "text-amber-950/90 dark:text-amber-100" : "text-blue-950/90 dark:text-blue-100"
               )}>
                 <strong className={cn("capitalize", subject === 'english' ? "text-amber-800 dark:text-amber-400" : "text-blue-800 dark:text-blue-400")}>{firstName}</strong> continues to exhibit high proficiency in <strong>{insights.best}</strong> but encounters distinct friction with multi-step scenarios involving <em>{insights.worst}</em> under time pressure.
               </p>
               <div className="flex flex-col gap-3">
                 <div className="flex gap-2 text-[14.5px]">
                   <span className={cn("font-bold min-w-[100px]", subject === 'english' ? "text-amber-950 dark:text-amber-100" : "text-blue-950 dark:text-blue-100")}>Focus areas:</span>
                   <span className={cn("capitalize", subject === 'english' ? "text-amber-800/80 dark:text-amber-200" : "text-blue-800/80 dark:text-blue-200")}>mastering core concepts in {insights.worst}.</span>
                 </div>
                 <div className="flex gap-2 text-[14.5px]">
                   <span className={cn("font-bold min-w-[100px]", subject === 'english' ? "text-amber-950 dark:text-amber-100" : "text-blue-950 dark:text-blue-100")}>Recommended:</span>
                   <span className={subject === 'english' ? "text-amber-800/80 dark:text-amber-200" : "text-blue-800/80 dark:text-blue-200"}>{insights.recommendation}</span>
                 </div>
               </div>
             </div>
          </div>
  
          {/* Recommended Actions */}
          <div className={cn(
            "bg-[#FFFDF8] dark:bg-card rounded-[24px] p-6 sm:p-8 border shadow-sm flex flex-col justify-center",
            subject === 'english' ? "border-amber-100/50" : "border-blue-100/50"
          )}>
            <h3 className={cn(
               "text-[13px] font-serif font-black tracking-[0.15em] uppercase mb-6",
               subject === 'english' ? "text-amber-950/80 dark:text-amber-100/80" : "text-blue-950/80 dark:text-blue-100/80"
            )}>
               Recommended Protocol
            </h3>
            <ul className="space-y-4">
               <li className="flex items-center justify-between pb-4 border-b border-border/50">
                 <span className="text-[14px] sm:text-[15px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer capitalize">{insights.worst} Module</span>
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
               </div>
             </li>
             <li className="flex items-center justify-between pb-4 border-b border-border/50">
               <span className="text-[15px] font-medium text-foreground hover:text-primary transition-colors cursor-pointer">Time-Management Module</span>
               <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
               </div>
             </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
