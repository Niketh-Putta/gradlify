import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { StudyBuddyChat } from '@/components/StudyBuddyChat';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { useAppContext } from '@/hooks/useAppContext';
import { usePremium } from '@/hooks/usePremium';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { History, X } from 'lucide-react';
import { toast } from "sonner";
import { normalizeExamBoard } from "@/lib/examBoard";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { AIUnavailableRedirect } from "@/components/AIUnavailableRedirect";

export function Chat() {
  const aiEnabled = AI_FEATURE_ENABLED;
  const { user, profile, onProfileUpdate } = useAppContext();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { canUseFeature, remainingUses, dailyUses, dailyLimit, isUnlimited, incrementUsage, fetchUsageData, canSpendUsage } = usePremium();

  const initialPrompt = location.state?.initialPrompt;
  const sessionId = searchParams.get('session');
  type OnboardingDetails = { examBoard?: string | null; [key: string]: unknown };
  const onboarding = profile?.onboarding as OnboardingDetails | undefined;
  const examBoard = normalizeExamBoard(typeof onboarding?.examBoard === 'string' ? onboarding.examBoard : undefined);

  // Handle successful upgrade from Stripe
  useEffect(() => {
    if (!aiEnabled) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('upgraded') === 'true') {
      fetchUsageData();
        toast.success('Trial started! Premium features are now unlocked.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchUsageData, aiEnabled]);

  useEffect(() => {
    if (!aiEnabled) return;
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId, aiEnabled]);

  if (!aiEnabled) {
    return <AIUnavailableRedirect to="/home" />;
  }

  if (!user || !profile) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--chat-bg-primary))]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--chat-accent))] mx-auto mb-4"></div>
          <p className="text-[hsl(var(--chat-text-secondary))]">Loading chat...</p>
        </div>
      </div>
    );
  }

  const handleQuestionAsked = async (cost: number = 1) => {
    await incrementUsage(cost);
    await fetchUsageData();
    onProfileUpdate();
  };

  const handleNewSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    window.history.replaceState(null, '', `/chat?session=${sessionId}`);
  };

  const handleNewChat = () => {
    setCurrentSessionId(undefined);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, '', '/chat');
  };

  const handleMobileSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMobileSidebarOpen(false);
    window.history.replaceState(null, '', `/chat?session=${sessionId}`);
  };

  const handleHistoryClick = () => {
    if (isMobile) {
      setMobileSidebarOpen(true);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Show history button when sidebar is not visible
  const showHistoryButton = isMobile || sidebarCollapsed;

  return (
    <div className="flex h-full bg-[hsl(var(--chat-bg-primary))]">
      {/* Desktop Sidebar */}
      {!sidebarCollapsed && (
        <div className="hidden lg:flex w-60 flex-shrink-0">
          <ChatHistorySidebar
            userId={user.id}
            currentSessionId={currentSessionId}
            onSessionSelect={setCurrentSessionId}
            onNewChat={handleNewChat}
            collapsed={false}
            onToggleCollapse={() => setSidebarCollapsed(true)}
          />
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-60 max-w-[85vw] animate-slide-in-left">
            <ChatHistorySidebar
              userId={user.id}
              currentSessionId={currentSessionId}
              onSessionSelect={handleMobileSessionSelect}
              onNewChat={handleNewChat}
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--chat-bg-primary))]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-12 lg:py-6">
          {showHistoryButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHistoryClick}
              className="flex items-center gap-2 text-[hsl(var(--chat-text-secondary))] hover:text-[hsl(var(--chat-text-primary))] hover:bg-[hsl(var(--chat-bg-tertiary))]"
            >
              <History className="h-4 w-4" />
              <span className="text-xs font-medium">History</span>
            </Button>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(var(--chat-accent))] to-purple-500 flex items-center justify-center text-white text-xs font-medium">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <StudyBuddyChat
            canAskQuestion={canUseFeature}
            onQuestionAsked={handleQuestionAsked}
            usesLeft={remainingUses}
            userId={user.id}
            initialPrompt={initialPrompt}
            currentSessionId={currentSessionId}
            onNewSession={handleNewSession}
            dailyUses={dailyUses}
            dailyLimit={dailyLimit}
            isUnlimited={isUnlimited}
            examBoard={examBoard}
            canSpendUsage={canSpendUsage}
          />
        </div>
      </main>
    </div>
  );
}
