import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MessageStatusLikeError = {
  message?: unknown;
  status?: unknown;
};

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
});

export interface ResetPasswordFormProps {
  initialEmail?: string;
  inputClassName?: string;
  submitClassName?: string;
  className?: string;
  tone?: "dark" | "light";
  onCreateAccount?: (email: string) => void;
}

export function ResetPasswordForm({
  initialEmail,
  inputClassName,
  submitClassName,
  className,
  tone = "light",
  onCreateAccount,
}: ResetPasswordFormProps) {
  const isDark = tone === "dark";
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [noAccountEmail, setNoAccountEmail] = useState<string | null>(null);
  const noticeClass = isDark
    ? "bg-amber-500/10 border-amber-400/30 text-amber-100"
    : "bg-amber-50 border-amber-200 text-amber-900";
  const noticeSubClass = isDark ? "text-amber-200/90" : "text-amber-800";
  const successClass = isDark
    ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-100"
    : "bg-green-50 border-green-200 text-green-800";
  const successSubClass = isDark ? "text-emerald-200/90" : "text-green-700";
  const outlineButtonClass = isDark
    ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50";

  useEffect(() => {
    if (initialEmail !== undefined) setEmail(initialEmail);
  }, [initialEmail]);

  const redirectTo = useMemo(() => {
    try {
      return new URL("/update-password", window.location.origin).toString();
    } catch {
      return `${window.location.origin}/update-password`;
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      toast.error(validation.error.errors[0]?.message ?? "Please enter a valid email");
      return;
    }

    const normalizedEmail = validation.data.email;

    setIsLoading(true);
    try {
      setNoAccountEmail(null);

      // Check whether the user exists; if not, prompt to create an account.
      let exists: boolean | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('auth-email-exists', {
          body: { email: normalizedEmail },
        });

        if (!error && data && typeof (data as { exists?: unknown }).exists === 'boolean') {
          exists = (data as { exists: boolean }).exists;
        }
      } catch {
        // If the check fails, fall back to the privacy-safe reset flow.
      }

      if (exists === false) {
        setEmail(normalizedEmail);
        setNoAccountEmail(normalizedEmail);
        toast.error("No account found for this email. You're a new user - create an account.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error) throw error;

      setEmail(normalizedEmail);
      setEmailSentTo(normalizedEmail);
      toast.success("Reset link sent. Check spam/junk if you don't see it.");
    } catch (error: unknown) {
      const maybeErr = error as MessageStatusLikeError;
      const status = typeof maybeErr?.status === "number" ? maybeErr.status : undefined;
      const msg =
        typeof maybeErr?.message === "string"
          ? maybeErr.message
          : error instanceof Error
            ? error.message
            : "Failed to send reset email";

      if (status === 429 || String(msg).toLowerCase().includes("rate")) {
        toast.error("Too many attempts. Please wait a moment and try again.");
        return;
      }

      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (noAccountEmail) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className={cn("p-4 rounded-lg border text-center", noticeClass)}>
          <p className={cn("text-sm", isDark ? "text-amber-100" : "text-amber-900")}>
            No account found for <strong>{noAccountEmail}</strong>.
          </p>
          <p className={cn("text-xs mt-2", noticeSubClass)}>
            You’re a new user - create an account to get started.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => onCreateAccount?.(noAccountEmail)}
          className={cn('w-full', submitClassName)}
        >
          Create an account
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setNoAccountEmail(null);
            setEmail('');
          }}
          className={cn("w-full", outlineButtonClass)}
        >
          Try a different email
        </Button>
      </div>
    );
  }

  if (emailSentTo) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className={cn("p-4 rounded-lg border text-center", successClass)}>
          <p className={cn("text-sm", isDark ? "text-emerald-100" : "text-green-800")}>
            We&apos;ve sent a password reset link to <strong>{emailSentTo}</strong>
          </p>
          <p className={cn("text-xs mt-2", successSubClass)}>
            Check spam/junk if you don&apos;t see it.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEmailSentTo(null);
            setEmail("");
          }}
          className={cn("w-full", outlineButtonClass)}
        >
          Send to a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleResetPassword} className={cn("space-y-4", className)}>
      <Input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className={cn(inputClassName)}
      />

      <Button type="submit" className={cn("w-full", submitClassName)} disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}
