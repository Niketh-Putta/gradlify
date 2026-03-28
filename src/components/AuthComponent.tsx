import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import heroImage from "@/assets/study-buddy-hero.jpg";
import { User, Session } from '@supabase/supabase-js';
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { clearSignupTrack, getSignupTrack } from "@/lib/track";
import { isAbortLikeError } from '@/lib/errors';

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

interface AuthComponentProps {
  onAuthSuccess: (user: User) => void;
  onBack?: () => void;
  initialMode?: 'login' | 'signup';
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

export const AuthComponent = ({ onAuthSuccess, onBack, initialMode = 'login' }: AuthComponentProps) => {
  const [view, setView] = useState<'auth' | 'reset'>('auth');
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        }
      }
    );

    // Check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          onAuthSuccess(session.user);
        }
      })
      .catch((error) => {
        if (!isAbortLikeError(error)) {
          console.error('Auth session check failed:', error);
        }
      });

    return () => subscription.unsubscribe();
  }, [onAuthSuccess]);

  const ensureProfile = async (user: User) => {
    try {
      const signupTrack = getSignupTrack();
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, track')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const nextMidnight = new Date(todayMidnight);
        nextMidnight.setDate(nextMidnight.getDate() + 1);

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
    if (strength < 2) return { text: 'Weak', color: 'text-destructive' };
    if (strength < 4) return { text: 'Medium', color: 'text-warning' };
    return { text: 'Strong', color: 'text-success' };
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
            setIsSignUp(false); // Switch to sign in mode
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
            setIsSignUp(false); // Switch to sign in mode
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
            : 'Failed to sign in with Google';
      toast.error(msg);
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
      // Don't block auth flow if this fails
    }
  };


  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthInfo = getPasswordStrengthText(passwordStrength);

  return (
    <div className="!light min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="w-full max-w-md shadow-lg border border-gray-200 bg-white rounded-lg">
        <CardHeader className="space-y-6 text-center pb-6 pt-8 px-6">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-4 left-4 px-3 py-2 hover:bg-gray-100 text-gray-700 font-medium" 
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          <div className="mx-auto w-16 h-16 rounded-lg bg-gradient-to-r from-red-700 to-orange-500 flex items-center justify-center shadow-md">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent">
              Gradlify
            </CardTitle>
            <p className="text-gray-600">
              {AI_FEATURE_ENABLED ? 'Your AI companion for exam success' : 'Your companion for exam success'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-6">
          {view === 'reset' ? (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                <p className="text-sm text-gray-600">Enter your email and we’ll send a reset link.</p>
              </div>

              <ResetPasswordForm
                initialEmail={email}
                onCreateAccount={(nextEmail) => {
                  setEmail(nextEmail);
                  setView('auth');
                  setIsSignUp(true);
                }}
                inputClassName="h-10 sm:h-11 rounded-md border border-gray-300 bg-white px-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                submitClassName="h-10 sm:h-11 rounded-md bg-gradient-to-r from-red-700 to-orange-500 hover:from-red-700 hover:to-orange-700 text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200"
              />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView('auth')}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Sign In Button */}
            <Button 
              type="button"
              variant="outline"
              className="w-full h-10 sm:h-11 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2"
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
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-500 font-medium">Or continue with email</span>
              </div>
            </div>
            {isSignUp && (
              <div className="space-y-1">
                <Input
                  id="name"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                className="h-10 sm:h-11 rounded-md border border-gray-300 bg-white px-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <Input
                id="email"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 sm:h-11 rounded-md border border-gray-300 bg-white px-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            
            <div className="relative space-y-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-10 sm:h-11 rounded-md border border-gray-300 bg-white px-3 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </Button>
              
              {isSignUp && password && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        passwordStrength < 2 ? 'w-1/5 bg-red-500' : 
                        passwordStrength < 4 ? 'w-3/5 bg-yellow-500' : 
                        'w-full bg-green-500'
                      }`}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    passwordStrength < 2 ? 'text-red-600' : 
                    passwordStrength < 4 ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {passwordStrengthInfo.text}
                  </span>
                </div>
              )}
            </div>

            {isSignUp && (
              <div className="relative space-y-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={isSignUp}
                  className="h-10 sm:h-11 rounded-md border border-gray-300 bg-white px-3 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-gray-100"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
            )}

            {!isSignUp && (
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setView('reset')}
                  className="text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            
            <Button
              type="submit" 
              className="w-full h-10 sm:h-11 rounded-md bg-gradient-to-r from-red-700 to-orange-500 hover:from-red-700 hover:to-orange-700 text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!loading && <LogIn className="h-4 w-4" />}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          )}

        </CardContent>

        {view === 'auth' && (
          <CardFooter className="pt-4 pb-6 px-6">
            <div className="w-full text-center">
              <span className="text-sm text-gray-600">
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
              </span>
              <Button 
                variant="link" 
                className="text-sm font-medium text-red-600 hover:text-red-700 p-0 h-auto"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setConfirmPassword('');
                  setName('');
                }}
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
