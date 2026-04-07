import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { User } from '@supabase/supabase-js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Settings2, 
  RefreshCw,
  Code,
  Crown,
  CreditCard,
  Moon,
  Sun,
  Key,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { useTestingMode } from '@/hooks/useTestingMode';
import { useMembership } from '@/hooks/useMembership';
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useReadinessStore } from '@/lib/stores/useReadinessStore';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
const EditOnboardingDetailsModal = React.lazy(() =>
  import('@/components/EditOnboardingDetailsModal').then((mod) => ({
    default: mod.EditOnboardingDetailsModal,
  }))
);

import { startPremiumCheckout } from "@/lib/checkout";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { UserTrack } from "@/lib/track";
import { getTrackCopy } from "@/lib/trackContent";
import { isAbortLikeError } from "@/lib/errors";

interface Profile {
  id: string;
  user_id: string;
  tier: string;
  plan?: string | null;
  subscription_interval: string | null;
  subscription_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  onboarding?: Record<string, unknown>;
  track?: UserTrack | null;
  premium_track?: UserTrack | 'eleven_plus' | null;
}

interface SettingsProps {
  user: User;
  onBackToChat: () => void;
  onSignOut: () => void;
}

interface SupportRequest {
  id: string;
  created_at: string;
  kind: string;
  message: string;
  email: string | null;
  user_id: string | null;
}

async function runWithAbortRetry<T>(task: () => Promise<T>, retries = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const result = await task();
      const maybe = result as { error?: unknown } | null;
      if (maybe && typeof maybe === 'object' && maybe.error && isAbortLikeError(maybe.error)) {
        if (attempt >= retries) {
          return result;
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        attempt += 1;
        continue;
      }
      return result;
    } catch (error) {
      if (!isAbortLikeError(error) || attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      attempt += 1;
    }
  }
}

export function Settings({ user, onBackToChat, onSignOut }: SettingsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingStudyProfile, setIsEditingStudyProfile] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isTestingMode, toggleTestingMode } = useTestingMode();
  const {
    data: membership,
    loading: membershipLoading,
    error: membershipError,
    isPremium: membershipIsPremium,
    isFounder: membershipIsFounder,
    statusLabel
  } = useMembership();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  // Fix BFCache stuck checkout states after returning from Stripe
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsCreatingCheckout(false);
      }
    };
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setIsCreatingCheckout(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const [showPremiumOptions, setShowPremiumOptions] = useState(false);
  const [showUltraOptions, setShowUltraOptions] = useState(false);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<UserTrack>('gcse');
  const [showTrackSwitcher, setShowTrackSwitcher] = useState(false);
  const [isSwitchingTrack, setIsSwitchingTrack] = useState(false);

  const formatTrackLabel = (track?: string | null) => {
    if (!track) return 'None';
    return track === '11plus' || track === 'eleven_plus' ? '11+ Maths' : 'GCSE Maths';
  };

  const hasActiveSubscription =
    membership?.subscription_status === 'active' ||
    membership?.subscription_status === 'trialing' ||
    (membership?.current_period_end
      ? new Date(membership.current_period_end).getTime() > Date.now()
      : false);
  const hasPremiumSubscription = membershipIsFounder || Boolean(
    membership?.premiumTrack === 'gcse' || 
    membership?.premiumTrack === '11plus' || 
    membership?.premiumTrack === 'eleven_plus'
  );
  const hasPremiumOnCurrentTrack = membershipIsFounder || Boolean(membership?.hasTrackPremium || membershipIsPremium);
  const accessIsPremium = hasPremiumOnCurrentTrack || membership?.isUltra;
  const accessLabel = statusLabel || 'Free';
  const isSupportAdmin = user?.email?.toLowerCase() === 'team@gradlify.com';
  const premiumSettingsTitle = "Upgrade to Gradlify Premium";
  const premiumSettingsDescription =
    "Choose monthly or annual billing to unlock Premium access for your current track.";
  const premiumSettingsCta = "Upgrade to Gradlify Premium";
  const TRACK_FEATURES: Record<UserTrack, string[]> = {
    gcse: [
      'Exam-board-aligned topics for GCSE Mathematics',
      'Focus on calculator + non-calculator pacing',
      'Standard tier progression and readiness tracking',
    ],
    '11plus': [
      'Short, high-impact practice packs written for 11+ style questions',
      'Emphasis on reasoning, problem solving, and arithmetic fluency',
      'Parent-ready summaries and mock checkpoint prompts',
    ],
  };

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await runWithAbortRetry(async () =>
        supabase
          .from('profiles')
          .select('id, user_id, tier, plan, subscription_interval, subscription_status, cancel_at_period_end, current_period_end, track, premium_track')
          .eq('user_id', user.id)
          .single()
      , 4);

      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      setProfile(data as Profile);
      setSelectedTrack((data.track ?? 'gcse') as UserTrack);
    } catch (error: unknown) {
      if (isAbortLikeError(error)) return;
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Track change helpers
  const handleTrackSave = async () => {
    if (!user?.id || !selectedTrack || profile?.track === selectedTrack) return;
    setIsSwitchingTrack(true);
    try {
      // Restore stable path: server RPC first, direct table write fallback.
      const rpcResult = await runWithAbortRetry(async () =>
        supabase.rpc('update_user_track' as any, {
          p_user_id: user.id,
          p_track: selectedTrack,
        })
      , 4);

      if (rpcResult.error) {
        const fallback = await runWithAbortRetry(async () =>
          supabase
            .from('profiles')
            .update({ track: selectedTrack })
            .eq('user_id', user.id)
            .select('track')
            .single()
        , 6);
        if (fallback.error) throw fallback.error;
        if (fallback.data?.track !== selectedTrack) throw new Error('Track update did not persist');
      }

      toast('Track updated', { icon: undefined });
      // Track switch must reset readiness state
      useReadinessStore.getState().reset();
      window.dispatchEvent(new CustomEvent('track-switched'));
      window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
      setProfile((prev) => (prev ? { ...prev, track: selectedTrack } : prev));
      await fetchProfile();
      setShowTrackSwitcher(false);
      onBackToChat();
      navigate('/dashboard', { replace: true });
    } catch (error: unknown) {
      if (isAbortLikeError(error)) {
        // Network timeout can occur after DB commit; verify current DB state first.
        try {
          const { data: latest } = await supabase
            .from('profiles')
            .select('track')
            .eq('user_id', user.id)
            .maybeSingle();
          if (latest?.track === selectedTrack) {
            setProfile((prev) => (prev ? { ...prev, track: selectedTrack } : prev));
            setShowTrackSwitcher(false);
            onBackToChat();
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch {
          // No-op: fall through to retryable write.
        }

        // Explicit retry write; only switch UI after confirmed save.
        const retryWrite = await runWithAbortRetry(async () =>
          supabase
            .from('profiles')
            .update({ track: selectedTrack })
            .eq('user_id', user.id)
            .select('track')
            .single()
        , 6);
        if (!retryWrite.error && retryWrite.data?.track === selectedTrack) {
          setProfile((prev) => (prev ? { ...prev, track: selectedTrack } : prev));
          setShowTrackSwitcher(false);
          window.dispatchEvent(new CustomEvent('track-switched'));
          window.dispatchEvent(new CustomEvent('gradlify:profile-updated'));
          toast('Track updated', { icon: undefined });
          onBackToChat();
          navigate('/dashboard', { replace: true });
          return;
        }
      }
      const msg = isAbortLikeError(error)
        ? 'Request timed out while updating track. Please retry.'
        : error instanceof Error
          ? error.message
          : 'Failed to update track';
      if (!isAbortLikeError(error)) {
        console.error('Track update error:', error);
      }
      toast.error(msg);
    } finally {
      setIsSwitchingTrack(false);
    }
  };

  useEffect(() => {
    if (profile?.track) {
      setSelectedTrack(profile.track);
    }
  }, [profile?.track]);

  // Check admin role
  useEffect(() => {
    async function checkAdminRole() {
      if (!user?.id) return;
      const { data } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      setIsAdmin(data === true);
    }
    checkAdminRole();
  }, [user?.id]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  console.debug('[Membership:render]', { data: membership });

  useEffect(() => {
    if (user?.id) {
      void fetchProfile();
    }
  }, [fetchProfile, user?.id]);

  useEffect(() => {
    if (isSupportAdmin) {
      fetchSupportRequests();
    }
  }, [isSupportAdmin]);

  const fetchSupportRequests = async () => {
    setSupportLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .select('id, created_at, kind, message, email, user_id')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSupportRequests((data as SupportRequest[]) || []);
    } catch (error) {
      console.error('Error loading support requests:', error);
      toast.error('Failed to load support requests');
    } finally {
      setSupportLoading(false);
    }
  };

  const formatSupportDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRefreshData = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmDataReset = async () => {
    setIsDeleting(true);
    setShowConfirmDialog(false);
    
    try {
      toast.info("Deleting all data...");
      
      // Delete all user data while preserving account tier
      // Delete in order to respect foreign key constraints
      
      // 1. Delete chat messages first (child of chat_sessions)
      const { data: chatSessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id);
      
      if (chatSessions && chatSessions.length > 0) {
        const sessionIds = chatSessions.map(s => s.id);
        await supabase
          .from('chat_messages')
          .delete()
          .in('chat_session_id', sessionIds);
      }

      // 2. Delete chat sessions
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', user.id);

      // 3. Delete AI feedback and mock questions (children of mock_attempts)
      const { data: mockAttempts } = await supabase
        .from('mock_attempts')
        .select('id')
        .eq('user_id', user.id);
      
      if (mockAttempts && mockAttempts.length > 0) {
        const attemptIds = mockAttempts.map(a => a.id);
        
        // Delete AI feedback first
        await supabase
          .from('ai_feedback')
          .delete()
          .in('attempt_id', attemptIds);
        
        // Delete mock questions
        await supabase
          .from('mock_questions')
          .delete()
          .in('attempt_id', attemptIds);
      }

      // 4. Delete mock attempts
      await supabase
        .from('mock_attempts')
        .delete()
        .eq('user_id', user.id);

      // 5. Delete study plan days (child of study_plans)
      const { data: studyPlans } = await supabase
        .from('study_plans')
        .select('id')
        .eq('user_id', user.id);
      
      if (studyPlans && studyPlans.length > 0) {
        const planIds = studyPlans.map(p => p.id);
        await supabase
          .from('study_plan_days')
          .delete()
          .in('plan_id', planIds);
      }

      // 6. Delete study sessions
      await supabase
        .from('study_sessions')
        .delete()
        .eq('user_id', user.id);

      // 7. Delete study plans
      await supabase
        .from('study_plans')
        .delete()
        .eq('user_id', user.id);

      // 8. Delete subtopic progress (exam readiness data)
      await supabase
        .from('subtopic_progress')
        .delete()
        .eq('user_id', user.id);

      // 9. Delete readiness scores (additional exam readiness data)
      await supabase
        .from('readiness_scores')
        .delete()
        .eq('user_id', user.id);

      // 10. Delete notes progress
      await supabase
        .from('notes_progress')
        .delete()
        .eq('user_id', user.id);

      // 11. Delete user topic notes
      await supabase
        .from('user_topic_notes')
        .delete()
        .eq('user_id', user.id);

      // 12. Clear readiness store and localStorage to ensure 0% everywhere
      useReadinessStore.setState({ 
        scores: {},
        pending: {},
        loading: false,
        loadedForUserId: undefined
      });
      localStorage.removeItem('readiness-store');

      // 13. Reset usage counters while preserving tier
      await supabase
        .from('profiles')
        .update({
          daily_uses: 0,
          daily_mock_uses: 0,
          daily_reset_at: null,
          daily_mock_reset_at: null
        })
        .eq('user_id', user.id);

      toast.success("All data has been reset successfully!");
      await fetchProfile();
      
      // Force a page reload to clear all cached data and re-fetch from database
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Failed to reset data. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onSignOut();
      toast.success("Signed out successfully");
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        'https://gknnfbalijxykqycopic.supabase.co/functions/v1/customer-portal',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            return_url: `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.url) {
          window.location.assign(data.url);
          return;
        }
      }

      const responseText = await response.text();
      console.error('Billing portal response:', responseText);
      toast.error("Couldn't open billing portal.");
      setIsManagingSubscription(false);
    } catch (error) {
      console.error('Billing portal error:', error);
      toast.error("Couldn't open billing portal.");
      setIsManagingSubscription(false);
    }
  };

  const handleTestingModeToggle = (enabled: boolean) => {
    toggleTestingMode(enabled);
    toast.success(
      enabled 
        ? "Testing mode enabled - All features unlocked" 
        : "Testing mode disabled"
    );
  };

  const handleUpgradeToPremium = async (plan: 'monthly' | 'annual' | 'ultra' | 'ultra_annual') => {
    setIsCreatingCheckout(true);
    try {
      await startPremiumCheckout(plan);
    } catch (error) {
      console.error('Checkout error:', error);
      const message = error instanceof Error ? error.message : "Couldn't open checkout page.";
      toast.error(message);
      setIsCreatingCheckout(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setIsChangingPassword(true);

    try {
      // First, verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        setIsChangingPassword(false);
        return;
      }

      // If verification successful, update to new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      console.error('Error updating password:', error);
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-card border flex items-center justify-center shadow-sm">
              <Settings2 className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your profile, active track configuration, and billing preferences.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onBackToChat} className="shrink-0 rounded-full px-6 bg-card border-border/50 dark:border-border/80 hover:bg-muted/50">
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          
          {/* Left Column */}
          <div className="space-y-10">
            
            {/* Account & Profile */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Account & Profile</h2>
              <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Email Address</Label>
                    <Input 
                      value={user.email || ''} 
                      disabled 
                      className="bg-muted/30 border border-border/50 dark:border-border/80 rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Access Tier</Label>
                    <div className="h-11 flex items-center bg-muted/30 border border-border/50 dark:border-border/80 rounded-xl px-4 inline-flex w-full">
                      <Badge variant={accessIsPremium ? "default" : "secondary"} className="bg-primary/20 text-primary hover:bg-primary/20 border border-primary/30">
                        {accessLabel} Member
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-border my-6" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Study Profile</h3>
                    <p className="text-sm text-muted-foreground">Refine your exam board, target grades, and timeline.</p>
                  </div>
                  <Button onClick={() => setIsEditingStudyProfile(true)} className="rounded-xl bg-foreground text-background hover:bg-foreground/90 shrink-0 border border-border/20 dark:border-white/20">
                    Update Profile
                  </Button>
                </div>
              </div>
            </section>

            {/* Security */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Security</h2>
              <div className="bg-card rounded-2xl p-6 border shadow-sm">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold">Current Password</Label>
                    <div className="relative">
                      <Input 
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="bg-muted/30 border border-border/50 dark:border-border/80 rounded-xl h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1.5 h-8 w-8 p-0"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-semibold">New Password</Label>
                      <div className="relative">
                        <Input 
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="bg-muted/30 border border-border/50 dark:border-border/80 rounded-xl h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1.5 h-8 w-8 p-0"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground font-semibold">Confirm Password</Label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Verify new password"
                          className="bg-muted/30 border border-border/50 dark:border-border/80 rounded-xl h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1.5 h-8 w-8 p-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleChangePassword} 
                      disabled={isChangingPassword}
                      className="rounded-xl px-6 bg-muted/50 dark:bg-muted/30 text-foreground hover:bg-muted border border-border/50 dark:border-border/80"
                    >
                      {isChangingPassword ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Appearance */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">Appearance</h2>
              <div className="bg-card rounded-2xl p-6 border shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="font-medium text-sm text-foreground">Dark Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {theme === 'light' ? (
                    <Sun className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    id="theme-mode"
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:mt-[3.5rem]">
            
            {/* Subscription Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subscription</h2>
                {membershipLoading ? (
                  <div className="h-5 w-16 bg-muted rounded-full animate-pulse"></div>
                ) : (
                  <Badge variant={accessIsPremium ? "default" : "secondary"} className="bg-primary/20 text-primary border-none text-[10px] h-5 px-2">
                    {accessLabel}
                  </Badge>
                )}
              </div>

              {membershipLoading ? (
                <div className="bg-card rounded-2xl p-6 border border-primary/10 shadow-sm animate-pulse flex flex-col justify-center gap-4 h-[200px]">
                  <div className="h-5 w-1/3 bg-muted rounded"></div>
                  <div className="h-4 w-2/3 bg-muted rounded"></div>
                  <div className="h-11 w-full bg-muted rounded-xl mt-4"></div>
                </div>
              ) : !hasPremiumSubscription ? (
                <div className="space-y-4">
                  {/* Premium Plan Box */}
                  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" /> Premium 
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">Foundational mastery and readiness tools.</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold">£19.99</span>
                          <span className="text-[10px] text-slate-400 block">/month</span>
                        </div>
                      </div>
                      
                      <ul className="space-y-2 mb-6 text-xs text-slate-300 whitespace-normal">
                        <li className="flex gap-2 items-start"><Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-[2px]" /> <span>Unlimited mock exams and challenge questions</span></li>
                        <li className="flex gap-2 items-start"><Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-[2px]" /> <span>Unlimited mock exam size</span></li>
                        <li className="flex gap-2 items-start"><Shield className="h-3.5 w-3.5 text-primary shrink-0 mt-[2px]" /> <span>Weekly content handwritten by tutor and founder team</span></li>
                      </ul>

                      <Button 
                        onClick={() => setShowPremiumOptions(true)}
                        disabled={isCreatingCheckout}
                        className="w-full bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-10 text-sm font-semibold transition-all"
                      >
                        {isCreatingCheckout ? "Loading..." : "Get Premium"}
                      </Button>
                    </div>
                  </div>

                  {/* Ultra Plan Box */}
                  <div className="bg-gradient-to-br from-indigo-950/90 to-slate-900 rounded-2xl p-5 border border-indigo-500/30 shadow-xl text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-100 flex items-center gap-2 drop-shadow-sm">
                            <Sparkles className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" fill="currentColor" /> Ultra
                          </h3>
                          <p className="text-xs text-slate-300 mt-1">Ultimate preparation and insight.</p>
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-xl font-bold text-indigo-200 drop-shadow-sm">£99.99</span>
                          <span className="text-[10px] text-indigo-300/60 block mt-0.5 font-medium tracking-wide">/month</span>
                        </div>
                      </div>
                      
                      <ul className="space-y-3 mb-6 text-xs text-slate-200/90 font-medium whitespace-normal">
                        <li className="flex gap-2.5 items-start"><Crown className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-[2px]" /> <span>Everything in Premium</span></li>
                        <li className="flex gap-2.5 items-start font-bold text-indigo-100"><Crown className="h-4 w-4 text-indigo-300 shrink-0 mt-[2px] drop-shadow-sm" /> <span>1 to 1 weekly sessions with tutor team and founders</span></li>
                        <li className="flex gap-2.5 items-start text-indigo-200"><Crown className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-[2px]" /> <span>Handwritten mocks from tutor team specialised for your child</span></li>
                      </ul>

                      <Button 
                        onClick={() => setShowUltraOptions(true)}
                        disabled={isCreatingCheckout}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl h-10 text-sm font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border-none"
                      >
                        {isCreatingCheckout ? "Loading..." : "Get Ultra"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl p-6 border border-primary/20 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-colors">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[40px] rounded-full translate-x-12 -translate-y-12 pointer-events-none transition-transform group-hover:scale-110 duration-700" />
                   <div className="relative z-10 space-y-5">
                     <div>
                       <h3 className="text-lg font-bold text-foreground mb-1">Active Subscription</h3>
                       <p className="text-sm text-muted-foreground font-medium">
                         You are currently on the <strong className="text-primary">{accessLabel}</strong> tier.
                       </p>
                     </div>
                     <Button 
                       onClick={handleManageSubscription}
                       className="w-full h-11 rounded-xl font-semibold shadow-sm transition-all"
                     >
                       Manage Billing
                     </Button>
                   </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500/80 mb-2 ml-1">Danger Zone</h2>
              <div className="rounded-2xl border border-red-500/20 bg-transparent p-4 space-y-3">
                <Button
                  variant="outline"
                  onClick={handleRefreshData}
                  disabled={isDeleting}
                  className="w-full justify-between h-11 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-xl bg-transparent"
                >
                  <span className="font-medium">{isDeleting ? 'Resetting...' : 'Factory Reset Data'}</span>
                  <RefreshCw className={`h-4 w-4 ${isDeleting ? 'animate-spin' : ''}`} />
                </Button>
                
                <div className="h-px bg-red-500/10 w-full" />
                
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl font-medium"
                >
                  Log out of session
                </Button>
              </div>
            </div>

          </div>
        </div>

      </div>

      <Dialog open={showPremiumOptions} onOpenChange={setShowPremiumOptions}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Choose Your Premium Plan</DialogTitle>
            <DialogDescription>
              Select the billing cycle that works best for you. Save 35% with the annual plan!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 mt-2">
            <div 
              onClick={() => { setShowPremiumOptions(false); handleUpgradeToPremium('annual'); }}
              className="group cursor-pointer rounded-2xl border-2 border-primary/20 hover:border-primary p-4 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-bl-xl z-10">
                SAVE 35%
              </div>
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <h4 className="font-bold text-lg mb-1">Annual Billing</h4>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-foreground">£149.99</span>
                  <span className="text-sm text-muted-foreground">/year</span>
                </div>
                <p className="text-xs font-medium text-primary">Equals just £12.49 per month!</p>
              </div>
            </div>

            <div 
              onClick={() => { setShowPremiumOptions(false); handleUpgradeToPremium('monthly'); }}
              className="cursor-pointer rounded-2xl border bg-card hover:bg-muted/50 p-4 transition-all"
            >
              <h4 className="font-semibold text-base mb-1">Monthly Billing</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-foreground">£19.99</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pay as you go, cancel anytime.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUltraOptions} onOpenChange={setShowUltraOptions}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl bg-gradient-to-br from-indigo-950/90 to-slate-900 border-indigo-500/30 text-white shadow-xl overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" fill="currentColor" /> Ultra Status
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Select your mastery timeline. Save £200 with the annual commitment!
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 mt-2 relative z-10 text-slate-900">
            <div 
              onClick={() => { setShowUltraOptions(false); handleUpgradeToPremium('ultra_annual'); }}
              className="group cursor-pointer rounded-2xl border-2 border-indigo-400/50 hover:border-indigo-400 p-4 transition-all relative overflow-hidden bg-white/95"
            >
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 pb-1.5 rounded-bl-[14px] z-10 shadow-sm flex items-center gap-1 uppercase tracking-widest">
                <Crown className="w-3 h-3" /> Save £200
              </div>
              <div className="absolute inset-0 bg-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <h4 className="font-bold text-lg mb-1 text-slate-800">The Mastery Timeline (Annual)</h4>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-indigo-600">£999.00</span>
                  <span className="text-sm font-medium text-slate-500">/year</span>
                </div>
                <p className="text-xs font-semibold text-indigo-500 bg-indigo-50 inline-flex px-2 py-0.5 rounded-md mt-1 border border-indigo-100">Guarantees consistent 1-on-1 progress</p>
              </div>
            </div>

            <div 
              onClick={() => { setShowUltraOptions(false); handleUpgradeToPremium('ultra'); }}
              className="cursor-pointer rounded-2xl border bg-slate-50 hover:bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <h4 className="font-semibold text-base mb-1 text-slate-700">Flexible Access (Monthly)</h4>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-800">£99.99</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">Pay as you go, cancel anytime.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isEditingStudyProfile && (
        <Suspense fallback={null}>
          <EditOnboardingDetailsModal
            open={isEditingStudyProfile}
            onOpenChange={setIsEditingStudyProfile}
            userId={user?.id}
            initialOnboarding={profile?.onboarding ?? {}}
            track={profile?.track ?? selectedTrack}
            onSaved={fetchProfile}
          />
        </Suspense>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Destructive Action</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all your data including timetables, exam readiness scores, and notes.
              Your account access level will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDataReset}
              className="bg-red-500 text-white hover:bg-red-600 rounded-xl"
            >
              Yes, delete all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
