import { useCallback, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleOAuthRedirectButton } from "@/components/GoogleOAuthRedirectButton";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

type Props = {
  disabled?: boolean;
  className?: string;
  /** Width of the official Google button (pixels). */
  width?: number;
  onSignInStart?: () => void;
  onSignInEnd?: () => void;
};

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Failed to sign in with Google";
}

/**
 * Prefer Google Identity Services (shows gradlify.com on the account picker when the OAuth
 * client is configured for your domain). Falls back to Supabase OAuth redirect if GIS fails.
 */
export function GoogleSignInButton({
  disabled,
  className,
  width = 340,
  onSignInStart,
  onSignInEnd,
}: Props) {
  const [useRedirectFallback, setUseRedirectFallback] = useState(false);

  const handleRedirect = useCallback(async () => {
    if (disabled) return;
    onSignInStart?.();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(errorMessage(error));
      onSignInEnd?.();
    }
  }, [disabled, onSignInEnd, onSignInStart]);

  const handleCredential = useCallback(
    async (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) return;
      onSignInStart?.();
      try {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credentialResponse.credential,
        });
        if (error) throw error;
        onSignInEnd?.();
      } catch (error) {
        toast.error(errorMessage(error));
        onSignInEnd?.();
      }
    },
    [onSignInEnd, onSignInStart],
  );

  if (!googleClientId || useRedirectFallback) {
    return (
      <GoogleOAuthRedirectButton onClick={handleRedirect} disabled={disabled} className={className} />
    );
  }

  return (
    <div className="flex w-full justify-center">
      <GoogleLogin
        onSuccess={handleCredential}
        onError={() => {
          toast.error("Google sign-in could not load. Using alternate sign-in…");
          setUseRedirectFallback(true);
        }}
        theme="outline"
        text="continue_with"
        shape="circle"
        width={String(width)}
      />
    </div>
  );
}
