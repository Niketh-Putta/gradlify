import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Crown } from "lucide-react";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface UsageMeterProps {
  tier: 'free' | 'premium' | 'unlimited';
  dailyUses: number;
  maxDailyUses: number;
  resetTime?: string;
}

export function UsageMeter({ tier, dailyUses, maxDailyUses, resetTime }: UsageMeterProps) {
  const usagePercentage = tier === 'unlimited' ? 100 : (dailyUses / maxDailyUses) * 100;
  const remainingUses = tier === 'unlimited' ? '∞' : maxDailyUses - dailyUses;

  const getUsageColor = () => {
    return "primary";
  };

  return (
    <Card className="bg-gradient-card border-0 shadow-card hover:shadow-primary/20 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Unlimited Access
          </CardTitle>
          <Badge variant="default" className="font-semibold">
            Active
          </Badge>
        </div>
        <CardDescription>
          {AI_FEATURE_ENABLED ? 'Unlimited AI questions available' : 'Unlimited questions available'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-foreground">
              {remainingUses}
            </span>
            <span className="text-sm text-muted-foreground">
              questions available
            </span>
          </div>
          
          <Progress 
            value={100} 
            className="h-3"
          />
          
          <div className="flex justify-center text-sm text-muted-foreground">
            <span>Unlimited questions available</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
