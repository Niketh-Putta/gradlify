import { useState, useEffect, ReactNode, Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthComponent } from "@/components/AuthComponent";
import { AuthModal } from "@/components/AuthModal";
import { Settings } from "@/components/Settings";
import { Layout } from "@/components/Layout";
import { LandingPage } from "@/components/LandingPage";
import { ForceTheme } from "@/components/ForceTheme";
import { AIUnavailableRedirect } from "@/components/AIUnavailableRedirect";

// Lazy load all page components
const ElevenPlusLanding = lazyWithRetry(() => import("@/pages/ElevenPlusLanding").then(m => ({ default: m.ElevenPlusLanding })));
const Home = lazyWithRetry(() => import("@/pages/Home").then(m => ({ default: m.Home })));
const MockExams = lazyWithRetry(() => import("@/pages/MockExams"));
const MockExamPage = lazyWithRetry(() => import("@/pages/MockExamPage"));
const LiveMockHub = lazyWithRetry(() => import("@/pages/LiveMockHub"));
const LiveMockAnalytics = lazyWithRetry(() => import("@/pages/LiveMockAnalytics"));
const LocalCombinedMock = lazyWithRetry(() => import("@/pages/LocalCombinedMock"));
const LocalCombinedMock2 = lazyWithRetry(() => import("@/pages/LocalCombinedMock2"));
const RevisionNotes = lazyWithRetry(() => import("@/pages/RevisionNotes"));
const RevisionNotesSection = lazyWithRetry(() => import("@/pages/RevisionNotesSection"));
const RevisionNotesTopic = lazyWithRetry(() => import("@/pages/RevisionNotesTopic"));
const Connect = lazyWithRetry(() => import("@/pages/Connect"));
const Auth = lazyWithRetry(() => import("@/pages/Auth"));
const AuthCallback = lazyWithRetry(() => import("@/pages/AuthCallback").then(m => ({ default: m.AuthCallback })));
const EnglishSplitViewDemo = lazyWithRetry(() => import('@/pages/EnglishSplitViewDemo'));
const UpdatePassword = lazyWithRetry(() => import('@/pages/UpdatePassword'));
const ResetConfirm = lazyWithRetry(() => import('@/pages/ResetConfirm'));
const FoundersCircle = lazyWithRetry(() => import('@/pages/FoundersCircle'));
const SprintHowItWorks = lazyWithRetry(() => import('@/pages/SprintHowItWorks').then(m => ({ default: m.SprintHowItWorks })));
const SprintDetails = lazyWithRetry(() => import("./SprintDetails"));
const SprintWinning = lazyWithRetry(() => import("./SprintWinning"));
const SprintMysterySpin = lazyWithRetry(() => import("./SprintMysterySpin"));
const GrowthTracker = lazyWithRetry(() => import('@/pages/GrowthTracker'));
const PayReturn = lazyWithRetry(() => import('@/pages/PayReturn'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));
const Tools = lazyWithRetry(() => import('@/pages/Tools'));
const SubjectSelection = lazyWithRetry(() => import('@/pages/SubjectSelection'));
const Compare = lazyWithRetry(() => import('@/pages/Compare'));
const PremiumPlan = lazyWithRetry(() => import('@/pages/PremiumPlan'));

import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { consumePostAuthRedirect, setPostAuthRedirect } from '@/lib/postAuthRedirect';
import { getDashboardPath, setSignupTrack } from '@/lib/track';
import { isAbortLikeError } from '@/lib/errors';
import { captureReferralFromSearch } from '@/lib/referrals';
import { PaymentFailedGate } from '@/components/PaymentFailedGate';
import { usePaymentFailedBlock } from '@/hooks/usePaymentFailedBlock';
import { isPaymentGateExemptPath } from '@/lib/paymentBlocklist';
import { useCombinedMockReleased } from '@/hooks/useCombinedMockReleased';
import {
  isSecondMockReleased,
  SECOND_MOCK_DISPLAY_TITLE,
  SECOND_MOCK_EVENT_SLUG,
} from '@/lib/liveMockCombinedConfig';

/**
 * `/live-mock-exams`: minimal live mock landing (the replacement for the old hub).
 * It just announces the mock and opens the exam lobby at
 * `/live-mock-exams/local-preview`, which is also where the exam's Back link returns.
 */
const LiveMockExamsRoute = () => <LiveMockHub />;

/** Legacy `/live-mock-exams/details` now just points at the hub. */
const LiveMockExamsDetailsRoute = () => <Navigate to="/live-mock-exams" replace />;

/**
 * `/live-mock-exams/local-preview`: the combined Maths + English mock exam lobby.
 * Always available in dev; in production it only opens once the mock has gone live,
 * otherwise it sends people back to the hub.
 */
const LocalCombinedMockRoute = () => {
  const released = useCombinedMockReleased();
  if (import.meta.env.DEV || released) return <LocalCombinedMock />;
  return <Navigate to="/live-mock-exams" replace />;
};

/** Mock 2 exam lobby - registration check uses `both_subjects_live_mock_2`. */
const LocalCombinedMock2SitRoute = () => {
  if (import.meta.env.DEV || isSecondMockReleased()) {
    return (
      <LocalCombinedMock
        mockEventSlug={SECOND_MOCK_EVENT_SLUG}
        displayTitle={SECOND_MOCK_DISPLAY_TITLE}
        backHref="/live-mock-exams/local-preview2"
        checkReleased={isSecondMockReleased}
      />
    );
  }
  return <Navigate to="/live-mock-exams/local-preview2" replace />;
};

// Loading Fallback Component
const PageLoading = () => (
  <div className="flex min-h-[400px] w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

type AppState = 'app' | 'settings';

const protectedRoutes = [
  '/select-subject',
  '/practice-page',
  '/home',
  '/dashboard/11plus',
  '/dashboard/gcse',
  '/mocks',
  '/mock-exam',
  '/live-mock-exams',
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
  const { checking: checkingPaymentBlock, isBlocked: paymentBlocked } =
    usePaymentFailedBlock(user);

  // Central auth guard - runs on load and when path changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentPath = location.pathname || '/';
        let redirectTo: string | null = null;
        
        if (session) {
          setUser(session.user);
          // If on public route and authenticated, redirect to the subject selection
          if (publicRoutes.includes(currentPath)) {
            redirectTo = consumePostAuthRedirect()?.path ?? '/select-subject';
          }
        } else {
          setUser(null);
          // If on protected route and not authenticated, redirect to landing
          if (protectedRoutes.some(route => currentPath.startsWith(route))) {
            if (currentPath.startsWith('/live-mock-exams')) {
              setPostAuthRedirect({
                // Mock 2's reservation page handles its own pre-release state, so
                // send people straight back to it. Mock 1's lobby needs the
                // released/registration gate, so it returns to the hub instead.
                path: currentPath.startsWith('/live-mock-exams/local-preview2')
                  ? currentPath
                  : currentPath.startsWith('/live-mock-exams/local-preview')
                    ? '/live-mock-exams'
                    : currentPath,
                message: 'Sign in with the account registered for this mock.',
              });
            }
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
    captureReferralFromSearch(location.search);
  }, [location.search]);

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
    params.delete("ref");
    params.delete("r");
    const nextSearch = params.toString();
    const nextPath = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    navigate(nextPath, { replace: true });
  }, [location.pathname, location.search, navigate, user]);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setAppState('app');
    setShowAuthModal(false);
    const redirect = consumePostAuthRedirect();
    if (redirect?.path) {
      navigate(redirect.path, { replace: true });
    }
  };

  const renderLanding = (overlay?: ReactNode) => (
    <ForceTheme theme="light">
      <>
        <LandingPage
          onAuthAction={(action) => {
            setAuthMode(action);
            setShowAuthModal(true);
          }}
          theme="light"
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          tone="light"
        />
        {overlay}
      </>
    </ForceTheme>
  );

  const renderElevenPlusLanding = (overlay?: ReactNode) => (
    <ForceTheme theme="light">
      <>
        <ElevenPlusLanding
          onAuthAction={(action) => {
            setAuthMode(action);
            setShowAuthModal(true);
          }}
          theme="light"
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          tone="light"
        />
        {overlay}
      </>
    </ForceTheme>
  );

  const renderPremiumPlan = () => (
    <ForceTheme theme="light">
      <>
        <PremiumPlan
          onAuthAction={(action) => {
            setAuthMode(action);
            setShowAuthModal(true);
          }}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          initialMode={authMode}
          tone="light"
        />
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

  // Show loading while checking auth
  if (loading || (user && checkingPaymentBlock)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (
    user &&
    paymentBlocked &&
    !isPaymentGateExemptPath(location.pathname)
  ) {
    return <PaymentFailedGate user={user} onSignOut={handleSignOut} />;
  }

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

  // Main app routing
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Auth callback route - accessible to everyone */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/pay/success" element={<PayReturn />} />
        <Route path="/pay/cancelled" element={<PayReturn />} />
        
        {/* Redirect authenticated users from landing page to subject selection */}
        {user ? (
          <>
            <Route path="/" element={<Navigate to="/select-subject" replace />} />
            <Route path="/select-subject" element={<SubjectSelection />} />
            <Route path="/11-plus" element={<Navigate to="/select-subject" replace />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/free-resources" element={<Tools />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/premium" element={<PremiumPlan />} />
            <Route path="/sprint" element={<SprintHowItWorks />} />
            <Route path="/sprint-details" element={<SprintDetails />} />
            <Route path="/sprint-winning" element={<SprintWinning />} />
            <Route path="/mystery-spin" element={<SprintMysterySpin />} />
            <Route path="/founders-circle" element={<FoundersCircle />} />
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

              <Route path="readiness" element={<Navigate to="/dashboard" replace />} />
              <Route path="exam-readiness" element={<Navigate to="/dashboard" replace />} />
              <Route path="connect" element={<Connect />} />
              
              <Route path="mocks" element={<MockExams />} />
              <Route path="mocks/maths" element={<MockExams forcedSubject="maths" />} />
              <Route path="mocks/english" element={<MockExams forcedSubject="english" />} />
              <Route path="mock-exam" element={<MockExamPage />} />
              <Route path="english-demo" element={<EnglishSplitViewDemo />} />
              <Route path="live-mock-exams/session" element={<EnglishSplitViewDemo />} />
              <Route path="live-mock-exams/analytics" element={<LiveMockAnalytics />} />
              <Route path="live-mock-exams/details" element={<LiveMockExamsDetailsRoute />} />
              <Route path="live-mock-exams/local-preview" element={<LocalCombinedMockRoute />} />
              {/* Mock 2 reservation page handles its own pre-release state, so no released gate here. */}
              <Route path="live-mock-exams/local-preview2/sit" element={<LocalCombinedMock2SitRoute />} />
              <Route path="live-mock-exams/local-preview2" element={<LocalCombinedMock2 />} />
              <Route path="practice-page" element={<Navigate to="/mocks" replace />} />
              <Route path="practice/maths" element={<Navigate to="/mocks/maths" replace />} />
              <Route path="practice/english" element={<Navigate to="/mocks/english" replace />} />
              <Route path="live-mock-exams" element={<LiveMockExamsRoute />} />
              <Route path="notes" element={<RevisionNotes />} />
              <Route path="notes/:section" element={<RevisionNotesSection />} />
              <Route path="notes/:section/:topic" element={<RevisionNotesTopic />} />
              <Route path="nikethputtaadmin-growth" element={<GrowthTracker />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </>
        ) : (
          <>
        {/* Routes for non-authenticated users */}
        <Route path="/" element={<Navigate to="/11-plus" replace />} />
        <Route path="/11-plus" element={renderElevenPlusLanding()} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/free-resources" element={<Tools />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/premium" element={renderPremiumPlan()} />
        <Route path="/auth/reset-confirm" element={<ResetConfirm />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/reset-password" element={renderLanding()} />
        <Route path="/founders-circle" element={<FoundersCircle />} />
        <Route path="/sprint" element={<SprintHowItWorks />} />
        <Route path="/sprint-details" element={<SprintDetails />} />
        <Route path="/sprint-winning" element={<SprintWinning />} />
        <Route path="/mystery-spin" element={<SprintMysterySpin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/mocks" element={<MockExams />} />
            <Route path="/mock-exam" element={<MockExamPage />} />
            {/* Localhost-only: E2E Dylan vocab/session tests without OAuth */}
            {import.meta.env.DEV ? (
              <Route path="/english-demo" element={<EnglishSplitViewDemo />} />
            ) : null}
            <Route path="*" element={<Navigate to="/11-plus" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
};

export default Index;
