import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SubjectProvider } from "@/contexts/SubjectContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import Debug from "./pages/Debug";
import ResetPassword from "./pages/ResetPassword";
import UpdatePassword from "./pages/UpdatePassword";
import AdminQuestions from "./pages/AdminQuestions";
import AdminAnalytics from "./pages/AdminAnalytics";
import Tools from "./pages/Tools";
import GrowthTracker from "./pages/GrowthTracker";

import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient();

// Only initialize if the client ID exists, otherwise use standard provider.
// This allows a seamless fallback to the old OAuth redirect method.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AppContent = () => (
  <QueryClientProvider client={queryClient}>
    <SubjectProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
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
