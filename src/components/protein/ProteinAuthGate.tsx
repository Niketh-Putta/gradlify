import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { Beef, Camera, Flame, Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { buildEmailRedirectTo } from "@/lib/authEmailConfirmation";
import { enableProteinGuestMode } from "@/lib/protein/host";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  onAuthenticated?: (user: User) => void;
  onGuestMode?: () => void;
  redirectPath?: string;
  className?: string;
};

export function ProteinAuthGate({
  onAuthenticated,
  onGuestMode,
  redirectPath = "/protein",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          onAuthenticated?.(session.user);
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    void syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        onAuthenticated?.(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [onAuthenticated]);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = buildEmailRedirectTo(redirectPath);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;

      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        toast.error("An account with this email already exists. Please sign in.");
        return;
      }

      if (data.session) {
        toast.success("Account created.");
      } else {
        toast.success("Check your email to confirm your account.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign up failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    enableProteinGuestMode();
    onGuestMode?.();
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950",
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
            <Beef className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Protein Lens
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Scan meals, hit your protein goal, build streaks.
          </p>
        </div>

        <Card className="rounded-3xl border-emerald-100/80 bg-white/90 shadow-xl backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/80">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Get started</CardTitle>
            <CardDescription>
              Continue without an account or sign in to sync across devices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 px-4 py-3 dark:bg-emerald-950/30">
                <Camera className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>AI food scans with protein estimates</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-teal-50/80 px-4 py-3 dark:bg-teal-950/30">
                <Flame className="h-4 w-4 text-teal-600 shrink-0" />
                <span>Daily streaks, XP, and achievement badges</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <Shield className="h-4 w-4 text-slate-500 shrink-0" />
                <span>3 free scans/day — unlimited with Premium</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleGuestContinue}
              className="h-12 w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold uppercase tracking-wider hover:from-emerald-600 hover:to-teal-700"
            >
              Continue without account
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">or use email</span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="protein-email">Email</Label>
                  <Input
                    id="protein-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein-password">Password</Label>
                  <Input
                    id="protein-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void handleSignIn()}
                  className="h-11 w-full rounded-xl"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in with email"}
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="protein-signup-email">Email</Label>
                  <Input
                    id="protein-signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein-signup-password">Password</Label>
                  <Input
                    id="protein-signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => void handleSignUp()}
                  className="h-11 w-full rounded-xl"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
                </Button>
              </TabsContent>
            </Tabs>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Working on it...
              </div>
            )}

            <p className="text-center text-xs text-slate-400">
              By continuing you agree to Protein Lens Terms and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
