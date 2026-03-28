import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight } from "lucide-react";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";

interface TrialCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number;
  totalMarks: number;
}

export function TrialCompleteModal({ open, onOpenChange, score, totalMarks }: TrialCompleteModalProps) {
  const percentage = Math.round((score / totalMarks) * 100);

  const ensureTrialUsageUpdated = () => {
    // Ensure guest usage is set to 1 (trial completed)
    localStorage.setItem('guestMockUsage', '1');
    // Dispatch event to update MockUsageCard
    window.dispatchEvent(new CustomEvent('guestMockUsageChanged'));
  };

  const handleSignUp = () => {
    ensureTrialUsageUpdated();
    window.location.href = '/auth';
  };

  const handleBackToHome = () => {
    ensureTrialUsageUpdated();
    window.location.href = '/';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto mb-4">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Great Job! Trial Complete
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            You scored {score}/{totalMarks} ({percentage}%) on your free trial mock exam.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              You've completed your free trial mock
            </h3>
            <p className="text-sm text-blue-700">
              {AI_FEATURE_ENABLED
                ? 'Sign up to unlock 2 mock exams daily, plus unlimited practice questions and AI-powered study tools!'
                : 'Sign up to unlock 2 mock exams daily, plus unlimited practice questions and study tools!'}
            </p>
          </div>
          
          <Button 
            onClick={handleSignUp}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-2.5 text-sm"
          >
            Sign Up for More Mock Exams
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleBackToHome}
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
