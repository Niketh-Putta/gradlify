import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles } from "lucide-react";
import { usePremium } from '@/hooks/usePremium';
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';

export function AIUsageCard() {
  const { 
    isLoading, 
    isPremium, 
    isFounder,
    isAdmin, 
    isUnlimited, 
    dailyUses, 
    dailyLimit, 
    remainingUses 
  } = usePremium();
  const sprintCopy = getSprintUpgradeCopy();

  if (!AI_FEATURE_ENABLED) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="card-clean">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = isUnlimited ? 0 : (dailyUses / dailyLimit) * 100;
  const isNearLimit = usagePercentage >= 80 && !isUnlimited;
  const isAtLimit = dailyUses >= dailyLimit && !isUnlimited;

  return (
    <Card className="card-clean">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          AI Questions Today
          {(isPremium || isAdmin || isFounder) && (
            <Badge variant="outline" className="ml-auto">
              <Sparkles className="h-3 w-3 mr-1" />
              {isAdmin ? 'Admin' : isFounder ? 'Founder' : 'Premium'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className={`font-medium ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-warning' : 'text-primary'}`}>
              {isUnlimited ? 'Unlimited' : `${dailyUses}/${dailyLimit}`}
            </span>
          </div>
          
          {!isUnlimited && (
            <Progress 
              value={usagePercentage} 
              className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-warning' : '[&>div]:bg-primary'}`}
            />
          )}
        </div>

        <div className="text-center">
          {isUnlimited ? (
            <p className="text-sm text-muted-foreground">
              Ask unlimited questions with {isAdmin ? 'admin access' : isFounder ? 'Founder access' : 'Premium'}
            </p>
          ) : isAtLimit ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">{sprintCopy.limitTitle}</p>
              <p className="text-xs text-muted-foreground">
                {sprintCopy.limitHint}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">{remainingUses}</span> questions remaining today
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
