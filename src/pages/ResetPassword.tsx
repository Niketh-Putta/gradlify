import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";

type MessageLikeError = {
  message?: unknown;
};

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" })
});

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const normalizedEmail = validation.data.email;

    setIsLoading(true);
    try {
      setNoAccount(false);

      // Prefer a direct existence check so we can guide new users.
      try {
        const { data, error } = await supabase.functions.invoke('auth-email-exists', {
          body: { email: normalizedEmail },
        });

        const exists = !error && data && typeof (data as { exists?: unknown }).exists === 'boolean'
          ? (data as { exists: boolean }).exists
          : null;

        if (exists === false) {
          setNoAccount(true);
          setEmail(normalizedEmail);
          toast.error("No account found for this email. You're a new user — create an account.");
          return;
        }
      } catch {
        // If check fails, fall through to privacy-safe reset flow.
      }

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      setEmail(normalizedEmail);
      toast.success("If an account exists for this email, you'll receive a reset link shortly.");
    } catch (error: unknown) {
      const maybeErr = error as MessageLikeError;
      const msg =
        typeof maybeErr?.message === "string"
          ? maybeErr.message
          : error instanceof Error
            ? error.message
            : "Failed to send reset email";
      toast.error(msg);
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
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Button>

        {/* Reset Password Card */}
        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="pb-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Reset Password</CardTitle>
            <CardDescription className="text-gray-600">
              {emailSent 
                ? "Check your email for the reset link"
                : "Enter your email address and we'll send you a link to reset your password"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {noAccount ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-900">
                    No account found for <strong>{email}</strong>.
                  </p>
                  <p className="text-xs text-amber-800 mt-2">You’re a new user — create an account to get started.</p>
                </div>
                <Button
                  onClick={() => navigate(`/auth?mode=signup&email=${encodeURIComponent(email)}`)}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Create an account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNoAccount(false);
                    setEmail("");
                  }}
                  className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Try a different email
                </Button>
              </div>
            ) : !emailSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-700">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    If an account exists for <strong>{email}</strong>, you’ll receive a password reset link.
                  </p>
                  <p className="text-xs text-green-700 mt-2">
                    The link will expire in 1 hour
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Send to a different email
                </Button>
                <Button 
                  variant="link"
                  onClick={() => navigate("/")}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Back to sign in
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-gray-500">
          Didn't receive the email? Check your spam folder
        </div>
      </div>
    </div>
  );
}
