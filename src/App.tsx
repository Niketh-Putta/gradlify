import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SubjectProvider } from "@/contexts/SubjectContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Eagerly load the main landing page to prevent a flash of loading state on first visit
import Index from "./pages/Index";

// Lazy load all other secondary pages
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Debug = lazyWithRetry(() => import("./pages/Debug"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const UpdatePassword = lazyWithRetry(() => import("./pages/UpdatePassword"));
const AdminQuestions = lazyWithRetry(() => import("./pages/AdminQuestions"));
const AdminAnalytics = lazyWithRetry(() => import("./pages/AdminAnalytics"));
const Tools = lazyWithRetry(() => import("./pages/Tools"));
const GrowthTracker = lazyWithRetry(() => import("./pages/GrowthTracker"));
const ProteinTracker = lazyWithRetry(() => import("./pages/ProteinTracker"));
const AuthCallback = lazyWithRetry(() =>
  import("./pages/AuthCallback").then((m) => ({ default: m.AuthCallback })),
);
const PayReturn = lazyWithRetry(() => import("./pages/PayReturn"));

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
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/pay/success" element={<PayReturn />} />
                <Route path="/pay/cancelled" element={<PayReturn />} />
                <Route path="/protein" element={<ProteinTracker />} />
                <Route path="/protein-tracker" element={<ProteinTracker />} />
                {/* Catch-all app shell last so standalone routes above always win */}
                <Route path="/*" element={<Index />} />
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
