import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LogIn, Timer, Trophy, CheckCircle } from "lucide-react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { consumePostAuthRedirect, getPostAuthRedirect, setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { applySignupTrack, clearSignupTrack, getDashboardPath, getSignupTrack, setSignupTrack } from "@/lib/track";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { captureReferralFromSearch, claimStoredReferral } from "@/lib/referrals";
import { buildEmailRedirectTo, isEmailNotConfirmedError, resendSignupConfirmation } from "@/lib/authEmailConfirmation";
import { trackGoogleAdsSignup } from "@/lib/googleAds";

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
    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
    }
  }
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [activeTab, setActiveTab] = useState<"signup" | "signin">("signup");
  const [postAuthMessage, setPostAuthMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Optional deep-linking: /auth?mode=signup&email=foo@bar.com
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const urlEmail = params.get("email");
      const track = params.get("track");
      const redirect = params.get("redirect");
      const message = params.get("message");
      captureReferralFromSearch(window.location.search);
      if (mode === "signin" || mode === "signup") setActiveTab(mode);
      if (typeof urlEmail === "string" && urlEmail.trim()) setEmail(urlEmail);
      if (track === "11plus") setSignupTrack("11plus");
      if (track === "gcse") setSignupTrack("gcse");
      if (redirect) {
        setPostAuthRedirect({ path: redirect, message: message ?? undefined });
      }
      const storedRedirect = getPostAuthRedirect();
      setPostAuthMessage(storedRedirect?.message ?? null);
    } catch {
      // ignore
    }
  }, []);

  const navigateAfterAuth = async (userId?: string) => {
    const redirect = consumePostAuthRedirect();
    if (redirect?.path) {
      navigate(redirect.path, { replace: true });
      return;
    }
    const id = userId || (await supabase.auth.getUser()).data.user?.id;
    if (id) {
      navigate(getDashboardPath(), { replace: true });
      return;
    }
    navigate("/11-plus", { replace: true });
  };


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const selectedTrack = getSignupTrack() ?? "11plus";
      if (!getSignupTrack()) {
        setSignupTrack("11plus");
      }
      const emailRedirectTo = buildEmailRedirectTo();
      const { data, error } = await withAuthTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              name: fullName,
              track: selectedTrack,
            }
          }
        }),
        "Sign up"
      );

      if (error) throw error;

      // Supabase anti-enumeration behavior:
      // If the email already exists, signUp can return a user with NO identities and send NO email.
      const identities = (data?.user as unknown as { identities?: unknown[] } | null)?.identities;
      if (data?.user && Array.isArray(identities) && identities.length === 0) {
        toast.error("An account with this email already exists. Please sign in or reset your password.");
        clearSignupTrack();
        return;
      }

      // If email confirmations are disabled, a session may be returned immediately.
      if (data?.session) {
        trackGoogleAdsSignup();
        toast.success("Account created! You're signed in.");
        await applySignupTrack(data.session.user.id);
        try {
          await claimStoredReferral(data.session.user.created_at);
        } catch (referralError) {
          console.error("Referral claim failed:", referralError);
        }
        await navigateAfterAuth(data.session.user.id);
        return;
      }

      // Confirmation email flow
      try {
        await resendSignupConfirmation(email);
      } catch (resendError) {
        void resendError;
      }

      trackGoogleAdsSignup();
      toast.success("Account created! If the email address is valid, you'll receive a verification email shortly.");
      navigate("/", { replace: true });
    } catch (error: unknown) {
      const maybeErr = error as MessageStatusLikeError;
      const msg =
        typeof maybeErr?.message === "string"
          ? maybeErr.message
          : error instanceof Error
            ? error.message
            : "Failed to create account";
      toast.error(msg);
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        clearSignupTrack();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        "Sign in"
      );

      if (error) throw error;

      toast.success("Welcome back!");
      await navigateAfterAuth();
    } catch (error: unknown) {
      const maybeErr = error as MessageStatusLikeError;
      const msg =
        typeof maybeErr?.message === "string"
          ? maybeErr.message
          : error instanceof Error
            ? error.message
            : "Failed to sign in";
      if (isEmailNotConfirmedError(error)) {
        try {
          await resendSignupConfirmation(email);
          toast.error("Your email still needs confirming. We sent you a fresh verification link.");
        } catch {
          toast.error("Your email still needs confirming. Please use the latest verification email or request a new one.");
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="!light min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium"
        >
          <LogIn className="h-4 w-4 mr-2 rotate-180" />
          Back to home
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-red-700 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <LogIn className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent mb-2">Gradlify</h1>
          <p className="text-gray-600 text-base">
            {AI_FEATURE_ENABLED ? 'The AI platform for 11+ success' : 'The platform for 11+ success'}
          </p>
        </div>

        {/* Welcome Section */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-gradlify bg-gradient-gradlify bg-clip-text text-transparent mb-2">Welcome to Gradlify</h2>
          <p className="text-gray-600 text-sm">Join parents preparing for the 11+ with Gradlify</p>
        </div>

        {/* Benefits Card */}
        <Card className="mb-6 border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-green-600 text-lg font-semibold">What you get with a free account:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>1 mock exam daily (free tier)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Timer className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Progress tracking & analytics</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Trophy className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Unlimited practice questions</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{AI_FEATURE_ENABLED ? 'AI-powered study recommendations' : 'Personalised study recommendations'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Auth Tabs */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="pb-6">
            <CardTitle className="text-center text-xl font-bold text-gray-900">
              {showReset ? "Reset Password" : "Get Started"}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {showReset
                ? "Enter your email and we’ll send you a reset link"
                : "Create your free account or sign in to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showReset ? (
              <div className="space-y-4">
                <ResetPasswordForm
                  initialEmail={email}
                  onCreateAccount={(nextEmail) => {
                    setEmail(nextEmail);
                    setShowReset(false);
                    setActiveTab("signup");
                  }}
                  inputClassName="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  submitClassName="h-12 bg-gradient-to-r from-red-700 to-orange-500 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Google Sign In Button */}
                <GoogleSignInButton
                  disabled={isLoading}
                  width={340}
                  className="mb-4 h-12 w-full rounded-full border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
                  onSignInStart={() => setIsLoading(true)}
                  onSignInEnd={() => setIsLoading(false)}
                />
                
                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                  </div>
                </div>

                {postAuthMessage && (
                  <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                    {postAuthMessage}
                  </div>
                )}
                
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "signup" | "signin")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Sign Up</TabsTrigger>
                <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:text-gray-900">Sign In</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-700">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-700">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-700">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-gray-700">Confirm Password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-red-700 to-orange-500 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Free Account"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signin" className="space-y-4 mt-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-700">Email Address</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-700">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-red-700 to-orange-500 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <div className="text-center">
                    <button 
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-sm text-red-600 hover:text-red-700 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </form>
              </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
}
