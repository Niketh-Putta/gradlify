import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SubtopicSlider } from "./SubtopicSlider";
import { TOPIC_SUBTOPICS } from "@/lib/topicConstants";
import { BarChart3, Calculator, Check, PieChart, Save, Sparkles, Target, TrendingUp, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";

interface EditScoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditScoresModal({ open, onOpenChange }: EditScoresModalProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const getTopicIcon = (topicKey: string) => {
    switch(topicKey) {
      case 'number': return <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'algebra': return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'ratio': return <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'geometry': return <Target className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'probability': return <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'statistics': return <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />;
      default: return <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 500);
  };

  useEffect(() => {
    if (open) {
      setSaveStatus('idle');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl sm:max-w-3xl max-h-[82vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-1 sm:pb-2 flex-shrink-0">
          <DialogTitle className="text-base sm:text-xl font-bold text-center">Edit Readiness Scores</DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">Update your progress for each GCSE Mathematics topic</p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-6 pr-2 pb-16 sm:pb-20">
          {Object.entries(TOPIC_SUBTOPICS).map(([topicKey, topic]) => (
            <div key={topicKey} className="space-y-2 sm:space-y-3">
              {/* Topic Header with Icon and Background Strip */}
              <div className="bg-muted/30 rounded-lg p-1.5 sm:p-3 flex items-center gap-2 sm:gap-3">
                <div className="p-1 sm:p-2 bg-background rounded-lg shadow-sm text-muted-foreground">
                  {getTopicIcon(topicKey)}
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-bold text-foreground">{topic.name}</h3>
                  <p className="text-xs text-muted-foreground hidden sm:block">GCSE Mathematics Topic</p>
                </div>
              </div>
              
              {/* Subtopics Grid */}
              <div className="grid gap-2 sm:gap-4 lg:grid-cols-2">
                {topic.subtopics.map((subtopic) => (
                  <Card key={subtopic.key} className="border-0 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardContent className="p-2.5 sm:p-4">
                      <SubtopicSlider
                        topicKey={topicKey}
                        subtopicKey={subtopic.key}
                        label={subtopic.name}
                        onSave={handleSave}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          
        </div>
        
        {/* Floating Save Button */}
        <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 flex-shrink-0">
          <Button 
            onClick={() => onOpenChange(false)}
            className={`
              shadow-xl border-0 px-3 py-1.5 sm:px-4 sm:py-2.5 font-semibold text-xs sm:text-sm rounded-xl
              transition-all duration-300 hover:scale-105 h-9 sm:h-auto
              ${saveStatus === 'saved' 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : saveStatus === 'saving'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }
            `}
            size="default"
          >
            {saveStatus === 'saved' ? (
              <>
                <Check className="h-4 w-4 mr-1.5 animate-pulse" />
                <span className="hidden sm:inline">Changes Saved!</span>
                <span className="sm:hidden">Saved!</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1.5"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Save & Close</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}