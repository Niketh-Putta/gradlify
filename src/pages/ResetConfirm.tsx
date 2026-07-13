import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  clearAuthParamsFromUrl,
  establishPasswordRecoverySession,
  PASSWORD_UPDATE_PATH,
} from '@/lib/supabaseAuthHelpers';

export default function ResetConfirm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const hasRecoveryParams = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    return Boolean(
      url.searchParams.get('code') ||
        (url.searchParams.get('token_hash') && url.searchParams.get('type')) ||
        url.hash.includes('access_token') ||
        url.hash.includes('type=recovery'),
    );
  }, []);

  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const session = await establishPasswordRecoverySession();
      if (!session) {
        toast.error('This reset link is invalid or has expired. Request a new one.');
        clearAuthParamsFromUrl('/reset-password');
        navigate('/reset-password', { replace: true });
        return;
      }

      clearAuthParamsFromUrl(PASSWORD_UPDATE_PATH);
      navigate(PASSWORD_UPDATE_PATH, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4 text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to sign in
        </Button>

        <Card className="shadow-lg border border-gray-200 bg-white">
          <CardHeader className="pb-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-amber-500 rounded-lg flex items-center justify-center shadow-lg">
                <Mail className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Reset your password</CardTitle>
            <CardDescription className="text-gray-600">
              {hasRecoveryParams
                ? 'Tap continue to open the secure password reset page.'
                : 'This reset link is missing required details. Request a fresh link from the sign-in page.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasRecoveryParams ? (
              <Button
                onClick={handleContinue}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening reset page...
                  </>
                ) : (
                  'Continue to reset password'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/reset-password')}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                Request a new reset link
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
