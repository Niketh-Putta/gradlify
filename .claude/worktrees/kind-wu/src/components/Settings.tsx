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
  Settings2, 
  RefreshCw,
  Code,
  Crown,
  CreditCard,
  Moon,
  Sun,
  Key,
  Eye,
  EyeOff
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
import { getSprintUpgradeCopy } from '@/lib/foundersSprint';
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
    isFounder: membershipIsFounder
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
  const hasPremiumSubscription = membershipIsFounder || Boolean(membership?.hasPremiumSubscription || hasActiveSubscription);
  const hasPremiumOnCurrentTrack = membershipIsFounder || Boolean(membership?.hasTrackPremium || membershipIsPremium);
  const accessIsPremium = hasPremiumOnCurrentTrack;
  const accessLabel = membershipIsFounder ? 'Founder' : accessIsPremium ? 'Premium' : 'Free';
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
          .select('id, user_id, tier, plan, subscription_interval, subscription_status, cancel_at_period_end, current_period_end, onboarding, track, premium_track')
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
        supabase.rpc('update_user_track', {
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

      toast('Track updated', { icon: null, variant: 'default' });
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
          toast('Track updated', { icon: null, variant: 'default' });
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

  const handleUpgradeToPremium = async (plan: 'monthly' | 'annual') => {
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
    <div className="w-full min-h-screen bg-primary/5 dark:bg-gradient-to-b dark:from-primary/16 dark:to-primary/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {(() => {
          const cardClassName = "border-border/80 dark:border-border/50 bg-card shadow-sm dark:shadow-none";
          const surfaceClassName = "rounded-2xl border border-border/70 bg-primary/5 dark:bg-primary/10 shadow-sm dark:shadow-none";

          return (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl border bg-card flex items-center justify-center">
                      <Settings2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                      <p className="text-sm text-muted-foreground">
                        Manage your account, membership, and appearance.
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={onBackToChat} className="shrink-0">
                  Back to Chat
                </Button>
              </div>

              <div className={`${surfaceClassName} p-4 sm:p-6 space-y-6`}>

      {/* Account Information */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your sign-in details and access level.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email" 
              value={user.email || ''} 
              disabled 
              className="bg-muted/40"
            />
          </div>
          
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-primary/5 dark:bg-primary/10 px-3 py-2">
            <div className="space-y-0.5">
              <Label>Access level</Label>
              <p className="text-xs text-muted-foreground">
                Your current plan access in the app.
              </p>
            </div>
            <Badge variant={accessIsPremium ? "default" : "secondary"} className="w-fit">
              {accessLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Study Profile */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Study Profile</CardTitle>
          <CardDescription>Update your starter setup answers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            These details personalise your recommendations (exam board, year group, grades, and more).
          </div>
          <Button onClick={() => setIsEditingStudyProfile(true)} className="w-full" variant="outline">
            Edit starter setup answers
          </Button>
        </CardContent>
      </Card>

      {/* Track Switcher */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Academic Track</CardTitle>
          <CardDescription>Switch between GCSE and 11+ while keeping the same layout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.3em] mb-1">Active track</p>
              <p className="text-lg font-semibold">
                {profile?.track === '11plus' ? '11+ Maths track' : 'GCSE Maths track'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowTrackSwitcher((prev) => !prev)}
            >
              {showTrackSwitcher ? 'Hide options' : 'Change track'}
            </Button>
          </div>

          {showTrackSwitcher && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(TRACK_FEATURES) as UserTrack[]).map((trackKey) => (
                  <button
                    key={trackKey}
                    type="button"
                    onClick={() => setSelectedTrack(trackKey)}
                    className={`border rounded-2xl p-4 text-left transition-colors duration-200 ${
                      selectedTrack === trackKey
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card hover:border-primary/60'
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1">
                      {trackKey === '11plus' ? '11+ Maths' : 'GCSE Maths'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {trackKey === '11plus'
                        ? 'Short, high-impact 11+ practice packs.'
                        : 'Exam-board aligned GCSE content.'}
                    </p>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
                {TRACK_FEATURES[selectedTrack].map((feature) => (
                  <div key={feature} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleTrackSave}
                disabled={isSwitchingTrack || profile?.track === selectedTrack}
                className="w-full"
              >
                {isSwitchingTrack ? 'Switching track...' : `Switch to ${selectedTrack === '11plus' ? '11+' : 'GCSE'}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Admin Panel - Only visible to admins */}
      {isAdmin && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Panel
            </CardTitle>
            <CardDescription>Access admin-only features</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin/questions')}
              className="w-full"
            >
              <Shield className="mr-2 h-4 w-4" />
              Question Generator
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input 
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input 
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input 
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="w-full"
          >
            {isChangingPassword ? "Updating Password..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Membership Information */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Membership</CardTitle>
          <CardDescription>Your plan status and renewal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {membershipLoading ? (
            <div className="space-y-3">
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-8 bg-muted rounded animate-pulse"></div>
              <div className="h-8 bg-muted rounded animate-pulse"></div>
            </div>
          ) : membershipError ? (
            <p className="text-xs text-muted-foreground">Failed to load membership details</p>
          ) : membership ? (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {/* Plan */}
              <div className="rounded-lg border border-border/80 dark:border-border/50 bg-primary/5 dark:bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Plan</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {(() => {
                      if (membership.founderTrack === 'founder') return 'Founder';
                      if (membership.subscription_status === 'trialing') return 'Premium (Trial)';
                      if (hasPremiumSubscription) return 'Premium';
                      const plan = membership.plan || 'free';
                      if (plan === 'free') return 'Free';
                      return plan.charAt(0).toUpperCase() + plan.slice(1);
                    })()}
                  </span>
                  {membership.founderTrack !== 'founder' && membership.cancel_at_period_end && (
                    <Badge variant="destructive" className="text-xs whitespace-nowrap">
                      Canceling
                    </Badge>
                  )}
                </div>
              </div>

              {/* Billing cycle */}
              <div className="rounded-lg border border-border/80 dark:border-border/50 bg-primary/5 dark:bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Billing cycle</p>
                <p className="text-sm font-medium">
                  {membership.founderTrack === 'founder'
                    ? '—'
                    : membership.subscription === 'annual' || membership.subscription === 'year'
                    ? 'Annual'
                    : membership.subscription === 'monthly' || membership.subscription === 'month'
                    ? 'Monthly'
                    : '—'}
                </p>
              </div>

              {/* Status */}
              <div className="rounded-lg border border-border/80 dark:border-border/50 bg-primary/5 dark:bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                {membership.founderTrack === 'founder' ? (
                  <Badge variant="default" className="text-xs whitespace-nowrap">
                    Founder
                  </Badge>
                ) : membership.subscription_status ? (
                  <div className="space-y-1">
                    <Badge 
                      variant={
                        membership.subscription_status === 'active' 
                          ? 'default' 
                          : membership.subscription_status === 'trialing' 
                          ? 'secondary' 
                          : 'outline'
                      }
                      className="text-xs whitespace-nowrap"
                    >
                      {(() => {
                        const status = membership.subscription_status;
                        if (status === 'trialing') return 'Trialing';
                        if (status === 'incomplete_expired') return 'Payment expired';
                        if (status === 'incomplete') return 'Payment incomplete';
                        if (status === 'past_due') return 'Past due';
                        return status.charAt(0).toUpperCase() + status.slice(1);
                      })()}
                    </Badge>
                    {membership.subscription_status === 'trialing' && membership.current_period_end ? (
                      <p className="text-xs text-muted-foreground">
                        Billing starts on {formatDate(membership.current_period_end)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hasPremiumSubscription ? 'Premium' : 'Free'}
                  </p>
                )}
              </div>

              {/* Premium track */}
              <div className="rounded-lg border border-border/80 dark:border-border/50 bg-primary/5 dark:bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Premium track</p>
                <p className="text-sm font-medium">
                  {membership.founderTrack === 'founder'
                    ? 'All tracks'
                    : hasPremiumSubscription
                      ? `${formatTrackLabel(membership.premiumTrack)} only`
                      : 'None'}
                </p>
              </div>

              {/* Current track access */}
              <div className="rounded-lg border border-border/80 dark:border-border/50 bg-primary/5 dark:bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground mb-1.5">Current track access</p>
                <p className="text-sm font-medium">
                  {accessIsPremium ? 'Premium' : 'Free'}
                </p>
              </div>

              {/* Renewal/End */}
              {(() => {
                const status = membership.subscription_status;
                const cancelAtPeriodEnd = membership.cancel_at_period_end;
                const currentPeriodEnd = membership.current_period_end;
                
                console.debug('[Membership:date]', status, cancelAtPeriodEnd, currentPeriodEnd);
                
                let label = '—';
                if (membership.founderTrack === 'founder') {
                  label = '—';
                } else if (cancelAtPeriodEnd) {
                  label = 'Ends on';
                } else if (status === 'canceled') {
                  label = 'Ended on';
                } else if (status === 'trialing' && currentPeriodEnd) {
                  label = 'Trial ends on';
                } else if (status === 'active' && currentPeriodEnd) {
                  label = 'Renews on';
                }
                
                const autoRenewLabel = (() => {
                  if (!currentPeriodEnd) return '—';
                  if (membership.founderTrack === 'founder') return '—';
                  if (cancelAtPeriodEnd) return 'Off';
                  if (status === 'active') return 'On';
                  if (status === 'trialing') return 'On';
                  return '—';
                })();

                return (
                  <div className="rounded-lg border border-border/80 dark:border-border/50 bg-primary/5 dark:bg-primary/10 p-3">
                    <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
                    {currentPeriodEnd && label !== '—' ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {formatDate(currentPeriodEnd)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {status === 'trialing' ? 'Trial auto-renew:' : 'Auto-renew:'} {autoRenewLabel}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-primary/5 dark:bg-primary/10 px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="theme-mode">Dark Mode</Label>
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
        </CardContent>
      </Card>

      {/* Premium Card - Show manage billing for premium users, otherwise show upgrade */}
      {!membershipIsFounder && (
        <Card className="card-hero relative overflow-hidden">
          <CardContent className="card-mobile-padding relative">
            <div className="absolute -top-16 -left-16 h-40 w-40 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-primary-foreground/10 blur-3xl" />

            <div className="relative text-center text-primary-foreground">
              <div className="p-4 bg-primary-foreground/10 rounded-2xl mx-auto mb-6 w-fit border border-primary-foreground/15">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-responsive-xl font-bold mb-3 whitespace-pre-line leading-snug">
                {hasPremiumSubscription ? 'Manage Billing' : premiumSettingsTitle}
              </h3>
              <p className="text-responsive-sm text-primary-foreground/80 mb-6 leading-relaxed max-w-2xl mx-auto">
                {hasPremiumSubscription
                  ? accessIsPremium
                    ? 'Your active track currently has Premium access. You can manage billing anytime.'
                    : `You have Premium on ${formatTrackLabel(membership?.premiumTrack)} only. Switch track to use it, or manage billing below.`
                  : premiumSettingsDescription}
              </p>
              <div className="w-full">
                {hasPremiumSubscription ? (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    className="w-full h-12 rounded-xl bg-primary-foreground text-primary border-primary-foreground/20 hover:bg-primary-foreground/90"
                    disabled={isManagingSubscription}
                    size="lg"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isManagingSubscription ? 'Opening Portal...' : 'Manage Billing'}
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-12 rounded-xl bg-primary-foreground text-primary border-primary-foreground/20 hover:bg-primary-foreground/90"
                        disabled={isCreatingCheckout}
                        size="lg"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        {isCreatingCheckout ? 'Starting Checkout...' : premiumSettingsCta}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-64 bg-popover">
                      <DropdownMenuItem onClick={() => handleUpgradeToPremium('monthly')}>
                        <div className="flex flex-col py-2">
                          <span className="font-semibold text-base">Monthly Plan</span>
                          <span className="text-sm text-muted-foreground">£4.99 per month</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpgradeToPremium('annual')}>
                        <div className="flex flex-col py-2">
                          <span className="font-semibold text-base">Annual Plan</span>
                          <span className="text-sm text-muted-foreground">£39.99 per year</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isSupportAdmin && (
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle>Support Inbox</CardTitle>
            <CardDescription>Latest messages from the landing page form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing the 50 most recent submissions.
              </p>
              <Button variant="outline" size="sm" onClick={fetchSupportRequests} disabled={supportLoading}>
                {supportLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
            {supportLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-muted rounded animate-pulse"></div>
                <div className="h-16 bg-muted rounded animate-pulse"></div>
              </div>
            ) : supportRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No support messages yet.</p>
            ) : (
              <div className="space-y-4">
                {supportRequests.map((request) => (
                  <div key={request.id} className="rounded-lg border border-border/70 bg-muted/30 p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="uppercase text-xs font-semibold text-primary">
                          {request.kind}
                        </span>
                        <span>{formatSupportDate(request.created_at)}</span>
                        <span>•</span>
                        <span>{request.email || 'No email provided'}</span>
                      </div>
                      {request.user_id && (
                        <span className="text-xs text-muted-foreground">
                          User ID: {request.user_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{request.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
          <CardDescription>Refresh your data or sign out.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            className="w-full justify-start"
            disabled={isDeleting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-spin' : ''}`} />
            {isDeleting ? 'Resetting Data...' : 'Refresh Data'}
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all your data including:
              <br />• All timetables and study sessions
              {AI_FEATURE_ENABLED ? <><br />• AI chat histories</> : null}
              <br />• Exam readiness percentages (reset to 0%)
              <br />• Notes progress and personal notes (reset to 0%)
              <br /><br />
              Your account access level (Founder/Premium/Free) will be preserved. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDataReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
