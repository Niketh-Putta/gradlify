import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect as useReactEffect } from 'react';
import { LogoMark } from '@/components/LogoMark';
import { toast } from 'sonner';
import { consumePostAuthRedirect } from '@/lib/postAuthRedirect';
import { applySignupTrack, getDashboardPath } from '@/lib/track';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const redirectAfterAuth = () => {
        const redirect = consumePostAuthRedirect();
        if (redirect?.path) {
          navigate(redirect.path, { replace: true });
          return true;
        }
        return false;
      };

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // If there's no OAuth code, just route based on current session state.
        if (!code) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (!redirectAfterAuth()) {
              navigate(getDashboardPath(), { replace: true });
            }
            return;
          }
          if (errorParam || errorDescription) {
            console.error('Auth callback missing code:', { errorParam, errorDescription });
            toast.error('Authentication failed. Please try again.');
          }
          navigate('/', { replace: true });
          return;
        }

        // Exchange the auth code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error('Auth callback error:', error);
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (!redirectAfterAuth()) {
              navigate(getDashboardPath(), { replace: true });
            }
          } else {
            toast.error('Authentication failed. Please try again.');
            navigate('/', { replace: true });
          }
          return;
        }

        if (data.session) {
          // Ensure profile exists for the user
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', data.session.user.id)
            .single();

          if (!profile) {
            await supabase.from('profiles').insert({
              user_id: data.session.user.id
            });
          }

          await applySignupTrack(data.session.user.id);

          toast.success('Successfully signed in!');
          if (!redirectAfterAuth()) {
            navigate(getDashboardPath(), { replace: true });
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            if (!redirectAfterAuth()) {
              navigate(getDashboardPath(), { replace: true });
            }
          } else {
            navigate('/', { replace: true });
          }
        }
      } catch (error) {
        console.error('Unexpected error during auth callback:', error);
        toast.error('An unexpected error occurred.');
        navigate('/', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  // Premium loading: logo + animated progress bar
  const [progress, setProgress] = useState(0);
  useReactEffect(() => {
    if (progress < 100) {
      const timeout = setTimeout(() => setProgress((p) => Math.min(100, p + Math.random() * 18 + 7)), 120);
      return () => clearTimeout(timeout);
    }
  }, [progress]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <LogoMark size={56} className="mb-8 opacity-80" />
      <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
