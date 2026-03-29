import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, X, TrendingUp, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMindprintOverview } from '@/lib/mindprint/useMindprintOverview';
import { useSubject } from "@/contexts/SubjectContext";
import { useMistakeGenome, MistakeGene } from '@/lib/mindprint/useMistakeGenome';
import { useEnergyHeatmap } from '@/lib/mindprint/useEnergyHeatmap';
import { useConfidenceIndex } from '@/lib/mindprint/useConfidenceIndex';
import { OverviewCard } from '@/components/mindprint/OverviewCard';
import { MistakeGenomeCard } from '@/components/mindprint/MistakeGenomeCard';
import { EnergyTrackerCard } from '@/components/mindprint/EnergyTrackerCard';
import { ConfidenceIndexCard } from '@/components/mindprint/ConfidenceIndexCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAppContext } from '@/hooks/useAppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { AI_FEATURE_ENABLED } from '@/lib/featureFlags';
import { AIUnavailableRedirect } from '@/components/AIUnavailableRedirect';

export default function Mindprint() {
  const aiEnabled = AI_FEATURE_ENABLED;
  const { currentSubject } = useSubject();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const overview = useMindprintOverview();
  const genome = useMistakeGenome();
  const energy = useEnergyHeatmap();
  const confidence = useConfidenceIndex();

  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [weeklyReportOpen, setWeeklyReportOpen] = useState(false);
  const [fixItDrawerOpen, setFixItDrawerOpen] = useState(false);
  const [selectedGene, setSelectedGene] = useState<MistakeGene | null>(null);
  const [generating, setGenerating] = useState(false);

  if (!aiEnabled) {
    return <AIUnavailableRedirect to="/home" />;
  }

  const handleGenerateInsights = async () => {
    if (!aiEnabled) {
      toast.message("This feature is currently unavailable while we focus on core practice and competition.", { id: 'mindprint-gen' });
      return;
    }
    setGenerating(true);
    toast.loading('Analyzing your learning patterns...', { id: 'mindprint-gen' });
    
    try {
      console.log('[Mindprint UI] Starting insight generation for user:', user.id);
      
      const { generateMindprintSummary } = await import('@/lib/mindprintService');
      const updatedSummary = await generateMindprintSummary(user.id);
      
      console.log('[Mindprint UI] Summary generated successfully:', updatedSummary);
      
      toast.success('Insights generated! Refreshing data...', { id: 'mindprint-gen' });
      
      // Refresh all data from mindprint_summary and mindprint_events
      console.log('[Mindprint UI] Refreshing all components...');
      await Promise.all([
        overview.refresh(),
        genome.refresh(),
        energy.refresh(),
        confidence.refresh()
      ]);
      
      console.log('[Mindprint UI] All data refreshed successfully');
      toast.success('All insights updated!', { id: 'mindprint-gen' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to generate insights. Complete at least 10 questions first.';
      console.error('[Mindprint UI] Error generating mindprint:', error);
      toast.error(errorMessage, { id: 'mindprint-gen' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestedSession = () => {
    setSessionModalOpen(true);
  };

  const handleWeeklyReport = () => {
    setWeeklyReportOpen(true);
  };

  const handleFixIt = (gene: MistakeGene) => {
    setSelectedGene(gene);
    setFixItDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-purple-600/20 border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2 sm:space-y-3"
          >
            <div className="flex flex-col lg:flex-row items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-violet-500/20">
                    <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-violet-500" />
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Your {currentSubject === 'english' ? 'English ' : 'Maths '}Mindprint</h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 lg:mt-4">
                  {AI_FEATURE_ENABLED ? (
                    <Button
                      onClick={handleGenerateInsights}
                      disabled={generating}
                      size="sm"
                      className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-xs sm:text-sm"
                    >
                      <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${generating ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{generating ? 'Analyzing...' : 'Generate Insights'}</span>
                      <span className="sm:hidden">{generating ? 'Analyzing...' : 'Generate'}</span>
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">
                  {AI_FEATURE_ENABLED
                    ? 'AI insights from your learning patterns'
                    : 'Insights from your learning patterns'}
                </p>
              </div>

              {/* Recommendation box for users with insufficient data */}
              {overview.data && overview.data.lastAnswerCount < 10 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/30 w-full lg:max-w-xs"
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-violet-500/20 shrink-0">
                      <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground">
                        Build Your Mindprint
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Complete at least 10 practice questions to unlock personalized insights.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => navigate('/mocks')}
                      >
                        Start Practicing
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Summary Section */}
      {overview.data?.aiSummary && (
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500/10 via-cyan-500/10 to-purple-500/10 border border-border/50"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-violet-500/20 mt-0.5 sm:mt-1 shrink-0">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2">AI Analysis</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {overview.data.aiSummary}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Grid */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Overview Card */}
          <OverviewCard
            efficiencyScore={overview.data?.efficiencyScore || 0}
            peakHours={overview.data?.peakHours || ''}
            topError={overview.data?.topError || ''}
            updatedAt={overview.data?.updatedAt || ''}
            lastAnswerCount={overview.data?.lastAnswerCount || 0}
            loading={overview.loading}
            onSuggestedSession={handleSuggestedSession}
            onWeeklyReport={handleWeeklyReport}
          />

          {/* Mistake Genome Card */}
          <MistakeGenomeCard
            genes={genome.data}
            loading={genome.loading}
            onFixIt={handleFixIt}
          />

          {/* Cognitive Energy Tracker */}
          {energy.data && (
            <EnergyTrackerCard data={energy.data} loading={energy.loading} />
          )}

          {/* Confidence Accuracy Index */}
          {confidence.data && (
            <ConfidenceIndexCard data={confidence.data} loading={confidence.loading} />
          )}
        </div>
      </div>

      {/* Suggested Session Modal */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-500" />
              Suggested Study Session
            </DialogTitle>
            <DialogDescription>
              Based on your Mindprint analysis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Optimal Time</h4>
              <Badge variant="secondary" className="text-sm">
                {overview.data?.peakHours} (Your peak performance window)
              </Badge>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-foreground">Focus Areas</h4>
              <div className="flex flex-wrap gap-2">
                {genome.data.slice(0, 2).map((gene, index) => (
                  <Badge key={index} variant="outline">
                    {gene.type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setSessionModalOpen(false)}
              className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700"
            >
              Start Now
            </Button>
            <Button
              variant="outline"
              onClick={() => setSessionModalOpen(false)}
              className="flex-1"
            >
              Schedule Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weekly Report Modal */}
      <Dialog open={weeklyReportOpen} onOpenChange={setWeeklyReportOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
              Weekly Learning Report
            </DialogTitle>
            <DialogDescription>
              Your performance summary for the past week
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Efficiency Score */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Efficiency Score</h4>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">
                      {overview.data?.efficiencyScore || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated {overview.data?.updatedAt}
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Based on {overview.data?.lastAnswerCount || 0} answers
                </Badge>
              </div>
            </div>

            {/* Peak Performance */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Peak Performance Hours</h4>
              <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Optimal study time</span>
                  <Badge className="bg-cyan-600 hover:bg-cyan-700">
                    {overview.data?.peakHours || 'Not enough data'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You perform best during these hours. Consider scheduling your most challenging topics during this window.
                </p>
              </div>
            </div>

            {/* Mistake Analysis */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Top Mistakes</h4>
              <div className="space-y-2">
                {genome.data.slice(0, 3).map((gene, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {gene.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">{gene.example}</p>
                    </div>
                    <Badge variant="outline">{gene.frequencyPct}%</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Analysis */}
            {confidence.data && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Confidence Accuracy</h4>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Your confidence matches reality</span>
                    <span className="text-lg font-bold text-foreground">
                      {Math.round((confidence.data.confidenceAccuracy || 0) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-violet-600 to-cyan-600 h-2 rounded-full"
                      style={{ width: `${(confidence.data.confidenceAccuracy || 0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {overview.data?.aiSummary && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-foreground">AI Recommendations</h4>
                <div className="p-4 bg-gradient-to-br from-violet-500/10 via-cyan-500/10 to-purple-500/10 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {overview.data.aiSummary}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => setWeeklyReportOpen(false)}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setWeeklyReportOpen(false);
                handleGenerateInsights();
              }}
              className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Insights
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fix It Drawer */}
      <Drawer open={fixItDrawerOpen} onOpenChange={setFixItDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="capitalize">Fix: {selectedGene?.type.replace(/_/g, ' ')}</DrawerTitle>
              <DrawerDescription>
                Targeted practice to improve this weakness
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground">AI Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  This error pattern appears in {selectedGene?.frequencyPct}% of your mistakes.
                  Common in questions requiring multi-step reasoning.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground">Practice Pack</h4>
                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-sm text-foreground">10 targeted questions</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Algebra</Badge>
                    <Badge variant="outline" className="text-xs">Number</Badge>
                    <Badge variant="outline" className="text-xs">Medium-Hard</Badge>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: {selectedGene?.example}
              </p>
            </div>
            <DrawerFooter>
              <Button 
                onClick={() => {
                  setFixItDrawerOpen(false);
                  navigate('/mocks');
                }}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700"
              >
                Start Practice
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
