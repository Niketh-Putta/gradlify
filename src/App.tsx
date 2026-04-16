import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SubjectProvider } from "@/contexts/SubjectContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { GoogleOAuthProvider } from '@react-oauth/google';

// Eagerly load the main landing page to prevent a flash of loading state on first visit
import Index from "./pages/Index";

// Lazy load all other secondary pages
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Debug = lazy(() => import("./pages/Debug"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const AdminQuestions = lazy(() => import("./pages/AdminQuestions"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const Tools = lazy(() => import("./pages/Tools"));
const GrowthTracker = lazy(() => import("./pages/GrowthTracker"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    },
  },
});

// Loading Fallback Component
const PageLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AppContent = () => (
  <QueryClientProvider client={queryClient}>
    <SubjectProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/tools" element={<Tools />} />
                <Route path="/free-resources" element={<Tools />} />
                <Route path="/*" element={<Index />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="/debug/progress" element={<Debug />} />
                <Route path="/mini-mock" element={<div>Mini-Mock Coming Soon</div>} />
                <Route path="/admin/questions" element={<AdminQuestions />} />
                <Route
                  path="/nikethputtaadmin-xyz"
                  element={<AdminAnalytics />}
                />
                <Route
                  path="/nikethputtaadmin-growth"
                  element={<GrowthTracker />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </SubjectProvider>
  </QueryClientProvider>
);

const App = () => {
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <AppContent />
      </GoogleOAuthProvider>
    );
  }
  return <AppContent />;
};

export default App;
