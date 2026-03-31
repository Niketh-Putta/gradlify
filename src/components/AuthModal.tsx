import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, LogIn, X } from "lucide-react";
import { toast } from "sonner";
import { User, Session } from '@supabase/supabase-js';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { clearSignupTrack, getSignupTrack } from '@/lib/track';
import { GoogleLogin } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

type MessageStatusLikeError = {
  message?: unknown;
  status?: unknown;
};

const AUTH_REQUEST_TIMEOUT_MS = 20000;

async function withAuthTimeout<T>(request: Promise<T>, actionLabel: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${actionLabel} timed out. Please check your connection and try again.`));
    }, AUTH_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([request, timeoutPromise]);
  } finally {
    if (typeof timeoutId === 'number') {
      window.clearTimeout(timeoutId);
    }
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  initialMode?: 'login' | 'signup';
  tone?: 'dark' | 'light';
}

const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthModal = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  tone = 'dark',
}: AuthModalProps) => {
  const isDark = tone === 'dark';
  const [view, setView] = useState<'auth' | 'reset'>('auth');
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setView('auth');
      setIsSignUp(initialMode === 'signup');
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Ensure profile exists with defaults
          setTimeout(() => {
            ensureProfile(session.user);
          }, 100);
          onAuthSuccess(session.user);
          onClose();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [onAuthSuccess, onClose]);

  const ensureProfile = async (user: User) => {
    try {
      const signupTrack = getSignupTrack();
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, track')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            track: signupTrack ?? 'gcse',
          });
      } else if (signupTrack && existingProfile.track !== signupTrack) {
        await supabase
          .from('profiles')
          .update({ track: signupTrack })
          .eq('user_id', user.id);
      }
      clearSignupTrack();
    } catch (error) {
      console.error('Error ensuring profile:', error);
    }
  };

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 2) return { text: 'Weak', color: 'text-red-600' };
    if (strength < 4) return { text: 'Medium', color: 'text-yellow-600' };
    return { text: 'Strong', color: 'text-green-600' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (isSignUp && !name) {
      toast.error('Please enter your name');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      cleanupAuthState();
      
      if (isSignUp) {
        const emailRedirectTo = `${window.location.origin}/auth/callback`;
        const { data, error } = await withAuthTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: {
                name: name
              }
            }
          }),
          'Sign up'
        );
        
        if (error) {
          // Handle duplicate email error specifically
          if (error.message?.includes('already registered') || 
              error.status === 400 || 
              error.message?.includes('already been registered')) {
            toast.error('An account with this email already exists. Please Sign In instead.');
            clearSignupTrack();
            setIsSignUp(false);
            setLoading(false);
            return;
          }
          throw error;
        }
        
        if (data.user) {
          const identities = (data.user as unknown as { identities?: unknown[] } | null)?.identities;
          if (Array.isArray(identities) && identities.length === 0) {
            toast.error('An account with this email already exists. Please Sign In instead.');
            clearSignupTrack();
            setIsSignUp(false);
            return;
          }

          await initializeSubtopicProgress(data.user.id);

          if (data.session) {
            toast.success("Account created! You're signed in.");
          } else {
            try {
              await supabase.auth.resend({
                type: 'signup',
                email,
                options: { emailRedirectTo },
              });
            } catch (resendError) {
              void resendError;
            }
            toast.success("Account created! If the email address is valid, you'll receive a verification email shortly.");
          }
        }
      } else {
        const { data, error } = await withAuthTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          'Sign in'
        );
        
        if (error) throw error;
        if (data.user) {
          toast.success("Welcome back!");
        }
      }
    } catch (error: unknown) {
      // Handle duplicate email for sign up
      const maybeErr = error as MessageStatusLikeError;
      const msg =
        typeof maybeErr?.message === 'string'
          ? maybeErr.message
          : error instanceof Error
            ? error.message
            : '';
      const status = typeof maybeErr?.status === 'number' ? maybeErr.status : undefined;

      if (isSignUp && (msg.includes('already registered') || status === 400)) {
        toast.error('An account with this email already exists. Please Sign In instead.');
        clearSignupTrack();
        setIsSignUp(false);
      } else {
        toast.error(msg || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
    } catch (error: unknown) {
      const maybeErr = error as MessageStatusLikeError;
      const msg =
        typeof maybeErr?.message === 'string'
          ? maybeErr.message
          : error instanceof Error
            ? error.message
            : String(error);
      toast.error(msg || 'Failed to sign in with Google');
      try {
        const { openManualOAuth } = await import('@/lib/supabaseAuthHelpers');
        if (msg && msg.includes('NOT_FOUND')) openManualOAuth('google');
      } catch (e) {
        void e;
      }
      setLoading(false);
    }
  };

  // Initialize subtopic progress for new users
  const initializeSubtopicProgress = async (userId: string) => {
    try {
      // Get all subtopics from catalog
      const { data: catalog, error: catalogError } = await supabase
        .from('topic_catalog')
        .select('topic_key, subtopic_key');
      
      if (catalogError) throw catalogError;
      
      // Create progress entries for all subtopics
      const progressEntries = catalog.map(item => ({
        user_id: userId,
        topic_key: item.topic_key,
        subtopic_key: item.subtopic_key,
        score: 0
      }));
      
      const { error } = await supabase
        .from('subtopic_progress')
        .insert(progressEntries);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error initializing subtopic progress:', error);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthInfo = getPasswordStrengthText(passwordStrength);
  const passwordStrengthColor = isDark
    ? passwordStrength < 2
      ? 'text-red-300'
      : passwordStrength < 4
        ? 'text-yellow-300'
        : 'text-emerald-300'
    : passwordStrengthInfo.color;

  const surfaceClass = isDark
    ? 'bg-slate-950/95 text-white border border-white/10 ring-1 ring-orange-500/20'
    : 'bg-white text-slate-900 border border-slate-200/80 ring-1 ring-orange-500/10';
  const subtleText = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputClass = isDark
    ? 'border border-white/10 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:border-orange-400 focus:ring-orange-400/30'
    : 'border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20';
  const outlineButtonClass = isDark
    ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
  const dividerLine = isDark ? 'border-white/10' : 'border-gray-200';
  const dividerBg = isDark ? 'bg-slate-950' : 'bg-white';

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8 sm:px-6">
      <div
        className="absolute inset-0 z-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={`relative z-10 w-full max-w-md p-0 gap-0 rounded-2xl overflow-hidden shadow-2xl ${
          isDark ? "shadow-orange-500/20" : "shadow-orange-200/60"
        } ${surfaceClass}`}
      >
        <VisuallyHidden>
          <h2>{view === 'reset' ? 'Reset Password' : isSignUp ? 'Sign Up' : 'Sign In'} to Gradlify</h2>
        </VisuallyHidden>

        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full pointer-events-auto transition ${
            isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`absolute inset-0 pointer-events-none ${
            isDark
              ? "bg-[radial-gradient(320px_220px_at_20%_0%,rgba(99,102,241,0.35),transparent_70%)]"
              : "bg-[radial-gradient(320px_220px_at_20%_0%,rgba(99,102,241,0.20),transparent_70%)]"
          }`}
        />
        <div
          className={`absolute inset-0 pointer-events-none ${
            isDark
              ? "bg-[radial-gradient(260px_200px_at_85%_100%,rgba(124,58,237,0.25),transparent_65%)]"
              : "bg-[radial-gradient(260px_200px_at_85%_100%,rgba(99,102,241,0.18),transparent_65%)]"
          }`}
        />

        <div className="relative z-10 px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 text-center space-y-3 sm:space-y-4">
          {/* Logo */}
          <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <LogIn className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          
          {/* Title */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Gradlify
            </h2>
            <p className={`${subtleText} text-xs sm:text-sm`}>
              {AI_FEATURE_ENABLED ? 'Your AI companion for exam success' : 'Your companion for exam success'}
            </p>
          </div>
        </div>

        <div className="relative z-10 px-5 sm:px-8 pb-6 sm:pb-8 space-y-3 sm:space-y-4">
          {view === 'auth' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Sign In Button */}
            {googleClientId ? (
              <div className="flex justify-center w-full">
                <GoogleLogin
                   onSuccess={async (credentialResponse) => {
                     if (!credentialResponse.credential) return;
                     setLoading(true);
                     try {
                        const { data, error } = await supabase.auth.signInWithIdToken({
                          provider: 'google',
                          token: credentialResponse.credential,
                        });
                        if (error) throw error;
                     } catch (error: unknown) {
                       const maybeErr = error as MessageStatusLikeError;
                       toast.error(typeof maybeErr?.message === 'string' ? maybeErr.message : String(error) || 'Failed to sign in with Google');
                       setLoading(false);
                     }
                   }}
                   onError={() => {
                     toast.error('Login Failed via Google overlay. Please try again or use standard sign-in.');
                   }}
                   useOneTap
                   theme={isDark ? "filled_black" : "outline"}
                   text="continue_with"
                   shape="rectangular"
                   width="400"
                />
              </div>
            ) : (
              <Button 
                type="button"
                variant="outline"
                className={`w-full h-11 rounded-xl ${outlineButtonClass} font-medium text-sm flex items-center justify-center gap-3 transition-all`}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            )}
            
            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className={`w-full border-t ${dividerLine}`} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className={`${dividerBg} px-4 ${subtleText} font-medium tracking-wide`}>Or continue with email</span>
              </div>
            </div>

            {/* Name Field (Sign Up only) */}
            {isSignUp && (
              <Input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                className={`h-11 rounded-xl px-4 text-sm transition-all focus:ring-2 ${inputClass}`}
              />
            )}
            
            {/* Email Field */}
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`h-11 rounded-xl px-4 text-sm transition-all focus:ring-2 ${inputClass}`}
            />
            
            {/* Password Field */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={`h-11 rounded-xl px-4 pr-11 text-sm transition-all focus:ring-2 ${inputClass}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 rounded-lg ${
                  isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                }`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className={`h-4 w-4 ${subtleText}`} />
                ) : (
                  <Eye className={`h-4 w-4 ${subtleText}`} />
                )}
              </Button>
            </div>
            
            {/* Password Strength (Sign Up only) */}
            {isSignUp && password && (
              <div className="flex items-center gap-3">
                <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-100"}`}>
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      passwordStrength < 2 ? 'w-1/5 bg-red-500' : 
                      passwordStrength < 4 ? 'w-3/5 bg-yellow-500' : 
                      'w-full bg-green-500'
                    }`}
                  />
                </div>
                <span className={`text-xs font-medium ${passwordStrengthColor}`}>
                  {passwordStrengthInfo.text}
                </span>
              </div>
            )}

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={isSignUp}
                  className={`h-11 rounded-xl px-4 pr-11 text-sm transition-all focus:ring-2 ${inputClass}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 p-0 rounded-lg ${
                    isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                  }`}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className={`h-4 w-4 ${subtleText}`} />
                  ) : (
                    <Eye className={`h-4 w-4 ${subtleText}`} />
                  )}
                </Button>
              </div>
            )}

            {/* Forgot Password (Sign In only) */}
            {!isSignUp && (
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => {
                    setView('reset');
                  }}
                  className={`text-sm font-medium transition-colors ${isDark ? "text-orange-300 hover:text-orange-200" : "text-orange-600 hover:text-orange-700"}`}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit" 
              className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!loading && <LogIn className="h-4 w-4" />}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          ) : (
            <div className="space-y-4">
              <div className="space-y-1 text-center">
                <h3 className={`text-lg sm:text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Reset password</h3>
                <p className={`${subtleText} text-xs sm:text-sm`}>
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <ResetPasswordForm
                initialEmail={email}
                tone={tone}
                onCreateAccount={(nextEmail) => {
                  setEmail(nextEmail);
                  setView('auth');
                  setIsSignUp(true);
                }}
                inputClassName={`h-11 rounded-xl px-4 text-sm transition-all focus:ring-2 ${inputClass}`}
                submitClassName="h-11 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300"
              />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView('auth')}
                  className={`text-sm font-medium transition-colors ${isDark ? "text-orange-300 hover:text-orange-200" : "text-orange-600 hover:text-orange-700"}`}
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}

          {/* Toggle Sign Up / Sign In */}
          {view === 'auth' && (
            <div className="text-center pt-2">
              <span className={`text-sm ${subtleText}`}>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
              </span>
              <button 
                type="button"
                className={`text-sm font-semibold transition-colors ${isDark ? "text-orange-300 hover:text-orange-200" : "text-orange-600 hover:text-orange-700"}`}
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setConfirmPassword('');
                  setName('');
                }}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
