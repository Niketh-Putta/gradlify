import { supabase } from "@/integrations/supabase/client";

type MessageStatusLikeError = {
  message?: unknown;
  status?: unknown;
};

export function buildEmailRedirectTo() {
  return `${window.location.origin}/auth/callback`;
}

export function isEmailNotConfirmedError(error: unknown) {
  const maybeErr = error as MessageStatusLikeError;
  const message =
    typeof maybeErr?.message === "string"
      ? maybeErr.message.toLowerCase()
      : error instanceof Error
        ? error.message.toLowerCase()
        : "";

  return (
    message.includes("email not confirmed") ||
    message.includes("email not verified") ||
    message.includes("confirm your email") ||
    message.includes("verify your email")
  );
}

export async function resendSignupConfirmation(email: string) {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return;

  await supabase.auth.resend({
    type: "signup",
    email: normalizedEmail,
    options: {
      emailRedirectTo: buildEmailRedirectTo(),
    },
  });
}

