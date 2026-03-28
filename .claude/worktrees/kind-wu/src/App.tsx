import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import GcseMathsGradeBoundaries from "./pages/GcseMathsGradeBoundaries";
import Tools from "./pages/Tools";
import GcseMathsTopicWeaknessTest from "./pages/GcseMathsTopicWeaknessTest";
import GcseMathsGradeTargetPlanner from "./pages/GcseMathsGradeTargetPlanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route
              path="/gcse-maths-grade-boundaries"
              element={<GcseMathsGradeBoundaries />}
            />
            <Route path="/tools" element={<Tools />} />
            <Route path="/free-tools" element={<Tools />} />
            <Route
              path="/free-tools/gcse-maths-topic-weakness-test"
              element={<GcseMathsTopicWeaknessTest />}
            />
            <Route
              path="/free-tools/gcse-maths-grade-target-planner"
              element={<GcseMathsGradeTargetPlanner />}
            />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
