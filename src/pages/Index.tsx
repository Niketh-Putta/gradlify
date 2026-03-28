import { useState, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthComponent } from "@/components/AuthComponent";
import { AuthModal } from "@/components/AuthModal";
import { Settings } from "@/components/Settings";
import { Layout } from "@/components/Layout";
import { LandingPage } from "@/components/LandingPage";
import { ElevenPlusLanding } from "@/pages/ElevenPlusLanding";
import { ForceTheme } from "@/components/ForceTheme";
import { Home } from "@/pages/Home";
import { AIUnavailableRedirect } from "@/components/AIUnavailableRedirect";
import { Readiness } from "@/pages/Readiness";
import ExamReadiness from "@/pages/ExamReadiness";

import MockExams from "@/pages/MockExams";
import MockExamPage from "@/pages/MockExamPage";
import PracticePage from "@/pages/PracticePage";
import Resources from "@/pages/Resources";
import RevisionNotes from "@/pages/RevisionNotes";
import RevisionNotesSection from "@/pages/RevisionNotesSection";
import RevisionNotesTopic from "@/pages/RevisionNotesTopic";
import Connect from "@/pages/Connect";
import Auth from "@/pages/Auth";
import { AuthCallback } from "@/pages/AuthCallback";
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import UpdatePassword from '@/pages/UpdatePassword';
import FoundersCircle from '@/pages/FoundersCircle';
import { SprintHowItWorks } from '@/pages/SprintHowItWorks';
import PayReturn from '@/pages/PayReturn';
import NotFound from '@/pages/NotFound';
import Tools from '@/pages/Tools';
import { setPostAuthRedirect } from '@/lib/postAuthRedirect';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { getDashboardPath, setSignupTrack } from '@/lib/track';
import { isAbortLikeError } from '@/lib/errors';

type AppState = 'app' | 'settings';

const protectedRoutes = [
  '/practice-page',
  '/exam-readiness',
  '/home',
  '/dashboard/11plus',
  '/dashboard/gcse',

  '/readiness',
  '/mocks',
  '/mock-exam',
  '/resources',
  '/connect',
  '/notes',
  '/revision-guides',
];

const publicRoutes = ['/', '/11-plus', '/auth', '/login'];

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [appState, setAppState] = useState<AppState>(() => {
    return window.location.hash === '#settings' ? 'settings' : 'app';
  });
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [landingTheme, setLandingTheme] = useState<'dark' | 'light'>('light');

  const [loading, setLoading] = useState(true);

  // Central auth guard - runs on load and when path changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentPath = location.pathname || '/';
        let redirectTo: string | null = null;
        
        if (session) {
          setUser(session.user);
          // If on public route and authenticated, redirect to home
          if (publicRoutes.includes(currentPath)) {
            redirectTo = getDashboardPath();
          }
        } else {
          setUser(null);
          // If on protected route and not authenticated, redirect to landing
          if (protectedRoutes.some(route => currentPath.startsWith(route))) {
            redirectTo = '/11-plus';
          }
        }

        if (redirectTo && redirectTo !== currentPath) {
          navigate(redirectTo, { replace: true });
        }
      } catch (error) {
        if (isAbortLikeError(error)) return;
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes (NO navigation here, just state updates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (location.hash === '#settings') {
      setAppState('settings');
    } else {
      setAppState('app');
    }
  }, [location.hash]);
  useEffect(() => {
    if (user) return;
    if (!["/", "/11-plus"].includes(location.pathname)) return;
    const params = new URLSearchParams(location.search);
    const auth = params.get("auth");
    if (auth !== "signup" && auth !== "login") return;
    if (auth === "signup") {
      setSignupTrack("11plus");
    }
    setAuthMode(auth);
    setShowAuthModal(true);
    params.delete("auth");
    const nextSearch = params.toString();
    const nextPath = nextSearch ? `/?${nextSearch}` : "/";
    navigate(nextPath, { replace: true });
  }, [location.pathname, location.search, navigate, user]);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setAppState('app');
    setShowAuthModal(false);
  };

  const renderLanding = (overlay?: ReactNode) => (
    <ForceTheme theme={landingTheme}>
      <>
        <LandingPage
          onAuthAction={(action) => {
            setAuthMode(action);
            setShowAuthModal(true);
          }}
          theme={landingTheme}
          onThemeToggle={() => setLandingTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          tone={landingTheme}
        />
        {overlay}
      </>
    </ForceTheme>
  );

  const renderElevenPlusLanding = (overlay?: ReactNode) => (
    <ForceTheme theme={landingTheme}>
      <>
        <ElevenPlusLanding
          onAuthAction={(action) => {
            setAuthMode(action);
            setShowAuthModal(true);
          }}
          theme={landingTheme}
          onThemeToggle={() => setLandingTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          tone={landingTheme}
        />
        {overlay}
      </>
    </ForceTheme>
  );

  const handleSignOut = async () => {
    try {
      // Import supabase client
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Clear any chat messages/state first
      sessionStorage.clear();
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear local state
      setUser(null);
      setAppState('app');
      
      // Navigate to landing page using React Router
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
      // Navigate to landing page even if sign out fails
      setUser(null);
      setAppState('app');
      navigate('/', { replace: true });
    }
  };

  // Settings view
  if (appState === 'settings') {
    if (!user) return <AuthComponent onAuthSuccess={handleAuthSuccess} />;
    return (
      <Settings
        user={user}
        onBackToChat={() => {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          setAppState('app');
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Main app routing
  return (
    <Routes>
      {/* Auth callback route - accessible to everyone */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/pay/success" element={<PayReturn />} />
      <Route path="/pay/cancelled" element={<PayReturn />} />
      
      {/* Redirect authenticated users from landing page to home */}
      {user ? (
        <>
          <Route path="/" element={<Navigate to={getDashboardPath()} replace />} />
          <Route path="/11-plus" element={<Navigate to={getDashboardPath()} replace />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/free-tools" element={<Tools />} />
          <Route 
            path="/*" 
            element={
              <Layout 
                user={user}
                onSettings={() => {
                  window.location.hash = 'settings';
                  setAppState('settings');
                }}
                onSignOut={handleSignOut}
              />
            }
          >
            <Route path="home" element={<Home />} />
            <Route path="dashboard" element={<Home />} />
            <Route path="dashboard/gcse" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard/11plus" element={<Navigate to="/dashboard" replace />} />

            <Route path="readiness" element={<Readiness />} />
            <Route path="exam-readiness" element={<ExamReadiness />} />
            <Route path="connect" element={<Connect />} />
            
            <Route path="mocks" element={<MockExams />} />
            <Route path="mock-exam" element={<MockExamPage />} />
            <Route path="practice-page" element={<PracticePage />} />
            <Route path="resources" element={<Resources />} />
            <Route path="notes" element={<RevisionNotes />} />
            <Route path="notes/:section" element={<RevisionNotesSection />} />
            <Route path="notes/:section/:topic" element={<RevisionNotesTopic />} />
            <Route path="founders-circle" element={<FoundersCircle />} />
            <Route path="sprint" element={<SprintHowItWorks />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </>
      ) : (
        <>
      {/* Routes for non-authenticated users */}
      <Route path="/" element={<Navigate to="/11-plus" replace />} />
      <Route path="/11-plus" element={renderElevenPlusLanding()} />
      <Route path="/tools" element={<Tools />} />
      <Route path="/free-tools" element={<Tools />} />
      <Route path="/reset-password" element={renderLanding(<UpdatePassword />)} />
      <Route path="/founders-circle" element={<FoundersCircle />} />
      <Route path="/sprint" element={<SprintHowItWorks />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/mocks" element={<MockExams />} />
          <Route path="/mock-exam" element={<MockExamPage />} />
          <Route path="*" element={<Navigate to="/11-plus" replace />} />
        </>
      )}
    </Routes>
  );
};

export default Index;
