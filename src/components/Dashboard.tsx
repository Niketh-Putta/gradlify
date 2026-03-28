import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UsageMeter } from "./UsageMeter";
import { ReadinessMeter } from "./ReadinessMeter";
import { PremiumUpgradeCard } from './PremiumUpgradeCard';
import { AIUsageCard } from './AIUsageCard';
import { ReadinessSummary } from './ReadinessSummary';
import { MathRenderer } from './MathRenderer';
import { PremiumUpgradeButton } from './PremiumUpgradeButton';

import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { usePremium } from '@/hooks/usePremium';
import { 
  BookOpen, 
  Settings, 
  LogOut, 
  Sparkles,
  Target,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import studyBuddyHero from "@/assets/study-buddy-hero.jpg";
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  onboarding?: Record<string, unknown>;
}

type OnboardingDetails = {
  examBoard?: string | null;
  preferredName?: string | null;
  [key: string]: unknown;
};

interface DashboardProps {
  user: User;
  onSettings: () => void;
  onSignOut: () => void;
}

export function Dashboard({ 
  user,
  onSettings,
  onSignOut
}: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const { isPremium, isAdmin, isFounder } = usePremium();
  const onboardingDetails = profile?.onboarding as OnboardingDetails | undefined;
  const examBoard = typeof onboardingDetails?.examBoard === 'string' ? onboardingDetails.examBoard : null;

  const getTierDisplay = () => {
    if (isAdmin) return 'Admin';
    if (isFounder) return 'Founder';
    if (isPremium) return 'Premium';
    return 'Free';
  };

  const getTierVariant = () => {
    if (isAdmin) return 'secondary';
    if (isFounder || isPremium) return 'default';
    return 'outline';
  };

  const fetchProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, onboarding')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleRefresh = () => {
    setLastRefresh(new Date());
    fetchProfile();
    toast.success("Status refreshed!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Failed to load profile data</p>
          <Button onClick={fetchProfile} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const onboarding = onboardingDetails ?? {};
  const preferredName = typeof onboarding.preferredName === 'string' ? onboarding.preferredName.trim() : '';
  const userName = preferredName || user.user_metadata?.name || user.email?.split('@')[0] || '';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-card shadow-sm rounded-b-3xl">
        <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent">Gradlify</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {AI_FEATURE_ENABLED ? 'Your AI Study Buddy' : 'Your Study Buddy'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant={getTierVariant()} className="font-semibold text-xs sm:text-sm">
                {getTierDisplay()}
              </Badge>
              <Button variant="ghost" size="icon" onClick={onSettings}>
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onSignOut}>
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-3 py-3 sm:py-4 md:py-6">

        {/* Welcome Section */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-primary-foreground relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
                  Welcome back{userName ? `, ${userName}` : ''}!
              </h2>
              <p className="text-primary-foreground/90 text-lg">
                Ready to ace your GCSE Maths? Let's study together!
              </p>
            </div>
            <div className="absolute right-4 top-4 opacity-20">
              <img 
                src={studyBuddyHero} 
                alt="Study Buddy" 
                className="w-32 h-20 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Usage & Study Buddy */}
          <div className="lg:col-span-2 space-y-6">


            {/* Quick Actions */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Access key features to boost your readiness</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => window.location.href = "/exam-readiness"}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Exam Readiness Analytics
                </Button>
                <PremiumUpgradeButton />
                
                {AI_FEATURE_ENABLED ? (
                  <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">AI Questions Today</span>
                      <span className="text-sm text-muted-foreground">
                        {(() => {
                          if (isAdmin || isPremium) return 'Unlimited';
                          const dailyLimit = 10;
                          const dailyUses = 0; // This would come from actual usage data
                          const remaining = dailyLimit - dailyUses;
                          return `${remaining} left`;
                        })()}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${(() => {
                            if (isAdmin || isPremium) return 0;
                            const dailyLimit = 10;
                            const dailyUses = 0; // This would come from actual usage data
                            return Math.min((dailyUses / dailyLimit) * 100, 100);
                          })()}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{isAdmin || isPremium ? 'No limits' : '0 used'}</span>
                      <span>{isAdmin || isPremium ? '∞' : 'of 10'}</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Usage & Stats */}
          <div className="space-y-6">
            {AI_FEATURE_ENABLED ? <AIUsageCard /> : null}
            <PremiumUpgradeCard />
            <ReadinessSummary userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
