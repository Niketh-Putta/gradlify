import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, CheckCircle } from "lucide-react";
import { getSprintUpgradeCopy } from "@/lib/foundersSprint";

interface GuestLoginPromptProps {
  onLogin: () => void;
}

export function GuestLoginPrompt({ onLogin }: GuestLoginPromptProps) {
  const sprintCopy = getSprintUpgradeCopy();
  return (
    <Card className="mx-auto max-w-md text-center border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
      <CardHeader>
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-xl font-bold text-gray-800">
          You've used your free mock exam!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm">
          Log in to unlock more features and track your progress
        </p>
        
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>2 mock exams daily for free users</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Progress tracking & analytics</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Crown className="h-4 w-4 text-amber-500" />
            <span>{sprintCopy.isActive ? "Remove sprint limits with Premium" : "Start Your 3 Day Free Trial for unlimited access"}</span>
          </div>
        </div>
        
        <Button 
          onClick={onLogin}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold"
        >
          Log In for More Mock Exams
        </Button>
        
        <p className="text-xs text-gray-500">
          Free to create an account • No credit card required
        </p>
      </CardContent>
    </Card>
  );
}
