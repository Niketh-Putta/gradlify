import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Trophy, Lock } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";
import { useAppContext } from "@/hooks/useAppContext";
import { PremiumUpgradeButton } from "./PremiumUpgradeButton";

export function MockUsageCard() {
  const { 
    isPremium, 
    isFounder,
    dailyMockUses, 
    dailyMockLimit, 
    remainingMockUses, 
    canStartMockExam,
    refreshUsage 
  } = usePremium();

  // Check if user is authenticated - for guest users show different messaging
  let user = null;
  try {
    const context = useAppContext();
    user = context.user;
  } catch {
    // Not authenticated
    user = null;
  }

  // For guest users, check localStorage directly for real-time updates
  const [guestUsage, setGuestUsage] = useState(0);
  
  // Force refresh of usage data when component mounts
  useEffect(() => {
    if (user && refreshUsage) {
      refreshUsage();
    }
  }, [user, refreshUsage]);

  useEffect(() => {
    if (!user || !refreshUsage) return;
    const handleMockUsageUpdate = () => {
      refreshUsage();
    };
    window.addEventListener('mockUsageUpdated', handleMockUsageUpdate);
    return () => {
      window.removeEventListener('mockUsageUpdated', handleMockUsageUpdate);
    };
  }, [user, refreshUsage]);
  
  useEffect(() => {
    if (!user) {
      // Read current guest usage from localStorage
      const usage = parseInt(localStorage.getItem('guestMockUsage') || '0');
      setGuestUsage(usage);
      
      // Listen for storage changes to update in real-time
      const handleStorageChange = () => {
        const newUsage = parseInt(localStorage.getItem('guestMockUsage') || '0');
        setGuestUsage(newUsage);
      };
      
      window.addEventListener('storage', handleStorageChange);
      // Also listen for custom event when localStorage changes within same tab
      window.addEventListener('guestMockUsageChanged', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('guestMockUsageChanged', handleStorageChange);
      };
    }
  }, [user]);

  // For trial users, we need different limits and display
  const actualMockUses = user ? dailyMockUses : guestUsage;
  const displayLimit = user ? dailyMockLimit : 1;
  const displayUsage = actualMockUses;
  const displayRemaining = Math.max(0, displayLimit - actualMockUses);
  const actualCanStart = user ? canStartMockExam : guestUsage < 1;
  const usagePercentage = isPremium ? 0 : (displayUsage / displayLimit) * 100;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Timer className="h-4 w-4 text-primary" />
          Daily Mock Exams
          {isPremium && (
            <Badge variant="default" className="text-xs">
              {isFounder ? 'Founder' : 'Premium'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {isPremium 
            ? `Unlimited mock exams with ${isFounder ? 'Founder access' : 'Premium'}`
            : user
              ? "Free users get 2 mock exams per day"
              : actualMockUses >= 1 
                ? "Trial complete • Sign up for 2 daily mock exams!"
                : "Try 1 free mock exam • Sign up for 2 daily"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPremium && (
          <>
             <div className="flex justify-between items-center text-sm">
               <span>Used Today</span>
               <span className="font-medium">
                 {displayUsage} / {displayLimit}
               </span>
             </div>
             <Progress value={usagePercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{displayRemaining} remaining</span>
                <span>{actualCanStart ? "Available" : "Limit reached"}</span>
              </div>
          </>
        )}
        
        {isPremium && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Trophy className="h-4 w-4" />
            <span>Unlimited access</span>
          </div>
        )}
        
        {!actualCanStart && !isPremium && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Lock className="h-4 w-4" />
              <span>{user ? 'Daily limit reached' : 'Free trial complete'}</span>
            </div>
            {user ? (
              <PremiumUpgradeButton />
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">
                  Sign up to unlock 2 mock exams daily
                </p>
                <Button 
                  onClick={() => window.location.href = '/auth'}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs"
                  size="sm"
                >
                  Sign Up for More Mock Exams
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
