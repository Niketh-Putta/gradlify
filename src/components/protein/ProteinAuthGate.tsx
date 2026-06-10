import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { Beef, Camera, Flame, Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { supabase } from "@/integrations/supabase/client";
import { setPostAuthRedirect } from "@/lib/postAuthRedirect";
import { cn } from "@/lib/utils";

type Props = {
  onAuthenticated?: (user: User) => void;
  redirectPath?: string;
  className?: string;
};

export function ProteinAuthGate({
  onAuthenticated,
  redirectPath = "/protein",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

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

  const handleSignInStart = () => {
    setPostAuthRedirect({
      path: redirectPath,
      message: "Sign in to start tracking your protein.",
    });
    setLoading(true);
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
            Gradlify Protein
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Scan meals, hit your protein goal, build streaks.
          </p>
        </div>

        <Card className="rounded-3xl border-emerald-100/80 bg-white/90 shadow-xl backdrop-blur dark:border-emerald-900/40 dark:bg-slate-900/80">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign in to continue</CardTitle>
            <CardDescription>
              Google Sign-In keeps your meal log synced across devices.
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

            <GoogleSignInButton
              disabled={loading}
              width={320}
              className="h-12 w-full rounded-full border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              onSignInStart={handleSignInStart}
              onSignInEnd={() => setLoading(false)}
            />

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing you in...
              </div>
            )}

            <p className="text-center text-xs text-slate-400">
              By signing in you agree to Gradlify&apos;s Terms and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
