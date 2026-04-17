import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import notesData from "@/data/edexcel_gcse_notes.json";
import elevenPlusNotesData from "@/data/eleven_plus_notes.json";
import elevenPlusEnglishNotesData from "@/data/eleven_plus_english_notes.json";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { getExamBoardBadge, getExamBoardSubtitle, replaceExamBoardReferences } from "@/lib/examBoard";
import { resolveUserTrack } from "@/lib/track";
import { getTrackLabel, getTrackSections } from "@/lib/trackCurriculum";
import { useSubject } from "@/contexts/SubjectContext";

interface Topic {
  slug: string;
  title: string;
  level: string;
  md: string;
}

type NotesData = {
  [section: string]: Topic[];
};

const typedNotesData = notesData as NotesData;
const typedElevenPlusNotesData = elevenPlusNotesData as NotesData;
const typedElevenPlusEnglishNotesData = elevenPlusEnglishNotesData as NotesData;

// Section config with purple accent theme
const sectionConfig: Record<string, {
  abbr: string;
  desc: string;
}> = {
  "Number": {
    abbr: "N",
    desc: "Master integers, decimals, fractions, indices, surds and standard form."
  },
  "Algebra": {
    abbr: "A",
    desc: "Learn expressions, equations, graphs, and sequences."
  },
  "Ratio, Proportion & Rates of Change": {
    abbr: "R",
    desc: "Understand ratios, proportions, percentages, and rates of change."
  },
  "Geometry & Measures": {
    abbr: "G",
    desc: "Explore shapes, angles, transformations, and trigonometry."
  },
  "Probability": {
    abbr: "P",
    desc: "Calculate probabilities for single and combined events."
  },
  "Statistics": {
    abbr: "S",
    desc: "Collect, represent, and analyse data effectively."
  },
  "Number & Arithmetic": {
    abbr: "N",
    desc: "Place value, operations, number properties, fractions, decimals and percentages."
  },
  "Algebra & Ratio": {
    abbr: "A",
    desc: "Ratio and proportion, algebra basics, equations and sequences."
  },
  "Statistics & Data": {
    abbr: "S",
    desc: "Data handling with averages/charts and core probability."
  },
  "Comprehension": {
    abbr: "C",
    desc: "Master reading speed, factual retrieval, and advanced inference techniques for 11+ GL texts."
  },
  "Vocabulary": {
    abbr: "V",
    desc: "Synonyms, antonyms, prefixes, suffixes, and cloze passage mastery to boost your verbal score."
  },
  "SPaG": {
    abbr: "S",
    desc: "Perfect your punctuation, word classes, and technical accuracy for the SPaG section."
  },
};

const sectionDisplayName: Record<string, string> = {
  "Ratio, Proportion & Rates of Change": "Ratio & Proportion",
};

const elevenPlusSectionDescriptions: Record<string, string> = {
  "Number & Arithmetic": "Place value, rounding, operations, number properties, fractions, decimals, and percentages.",
  "Algebra & Ratio": "Ratio, proportion, algebra basics, solving equations, and sequences.",
  "Geometry & Measures": "2D/3D shape properties, angles, perimeter/area/volume, measures/time, coordinates and transformations.",
  "Statistics & Data": "Averages, charts, and probability fundamentals.",
  "Comprehension": "Master reading speed, factual retrieval, and advanced inference techniques for 11+ GL texts.",
  "Vocabulary": "Synonyms, antonyms, prefixes, suffixes, and cloze passage mastery to boost your verbal score.",
  "SPaG": "Perfect your punctuation, word classes, and technical accuracy for the SPaG section.",
  "Writing": "Story planning, descriptive techniques, figurative language, sentence rhythm, and narrative voice.",
};



export default function RevisionNotes() {
  const { user, profile } = useAppContext();
  const { currentSubject } = useSubject();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === '11plus';
  const elevenPlusSections = getTrackSections(userTrack, currentSubject);
  const [searchQuery, setSearchQuery] = useState("");
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const examBoard = (profile?.onboarding as any)?.examBoard;

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("notes_progress")
        .select("topic_slug, done")
        .eq("user_id", user.id);
      
      if (!error && data) {
        const progressMap: Record<string, boolean> = {};
        data.forEach(item => {
          progressMap[item.topic_slug] = item.done;
        });
        setProgress(progressMap);
      }
      setLoading(false);
    };
    fetchProgress();
  }, [user]);

  const boardAwareNotesData = useMemo(() => {
    const updated: NotesData = {};
    Object.entries(typedNotesData).forEach(([section, topics]) => {
      updated[section] = topics.map((topic) => ({
        ...topic,
        title: replaceExamBoardReferences(topic.title, examBoard),
        md: replaceExamBoardReferences(topic.md, examBoard),
      }));
    });
    return updated;
  }, [examBoard]);

  const sections = useMemo(
    () => (
      isElevenPlus
        ? elevenPlusSections.map((section) => section.id)
        : Object.keys(boardAwareNotesData)
    ),
    [boardAwareNotesData, elevenPlusSections, isElevenPlus]
  );
  
  const allTopics = useMemo(() => {
    if (isElevenPlus) {
      return elevenPlusSections.flatMap((section) =>
        section.subtopics.map((topic) => {
          const expectedSlug = `${section.key}-${topic.key}`;
          const typedNotes = currentSubject === 'english' ? typedElevenPlusEnglishNotesData : typedElevenPlusNotesData;
          const authoredTopic = typedNotes[section.id]?.find(t => t.slug === expectedSlug);
          return {
            slug: expectedSlug,
            title: topic.name,
            level: "11+",
            md: authoredTopic?.md || "",
            section: section.id,
          };
        })
      );
    }

    return sections.flatMap(section =>
      boardAwareNotesData[section].map(topic => ({
        ...topic,
        section
      }))
    );
  }, [sections, boardAwareNotesData, elevenPlusSections, isElevenPlus]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    const matchingSections = new Set<string>();
    
    allTopics.forEach(topic => {
      const titleMatch = topic.title.toLowerCase().includes(query);
      const sectionMatch = topic.section.toLowerCase().includes(query);
      const contentMatch = topic.md.substring(0, 160).toLowerCase().includes(query);
      if (titleMatch || sectionMatch || contentMatch) {
        matchingSections.add(topic.section);
      }
    });
    return Array.from(matchingSections);
  }, [searchQuery, allTopics, sections]);

  const getSectionStats = (section: string) => {
    if (isElevenPlus) {
      const match = elevenPlusSections.find((item) => item.id === section);
      return { total: match?.subtopics.length ?? 0, completed: 0 };
    }

    const topics = boardAwareNotesData[section];
    const completed = topics.filter(t => progress[t.slug]).length;
    return { total: topics.length, completed };
  };

  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter(t => progress[t.slug]).length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Find next uncompleted topic
  const continueFromTopic = useMemo(() => {
    if (isElevenPlus) return null;
    return allTopics.find(t => !progress[t.slug]);
  }, [allTopics, progress, isElevenPlus]);

  // Get current unit
  const currentUnit = useMemo(() => {
    if (isElevenPlus) return "11+ sections";
    for (const section of sections) {
      const topics = boardAwareNotesData[section];
      if (topics.some(t => !progress[t.slug])) {
        return section.split(",")[0];
      }
    }
    return "Complete!";
  }, [boardAwareNotesData, sections, progress, isElevenPlus]);

  const handleResetProgress = async () => {
    if (!user) return;
    if (!confirm('Reset all progress? This cannot be undone.')) return;
    await supabase.from("notes_progress").delete().eq("user_id", user.id);
    setProgress({});
  };

  // Progress ring calculation
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference - (overallProgress / 100) * circumference;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10 sm:py-16">
        {/* Sleek Header & Progress Section */}
        <section className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 mb-16">
          <div className="max-w-2xl flex-1 mt-2">
            <div className="flex items-center gap-3 mb-5">
              <span className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
                currentSubject === "english" 
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
              )}>
                {isElevenPlus ? getTrackLabel(userTrack, currentSubject) : getExamBoardBadge((profile?.onboarding as any)?.examBoard)}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              <span className={cn(
                "bg-clip-text text-transparent",
                currentSubject === "english" 
                  ? "bg-gradient-to-br from-slate-900 via-slate-800 to-amber-700 dark:from-white dark:via-slate-200 dark:to-amber-500" 
                  : "bg-gradient-to-br from-slate-900 via-slate-800 to-blue-700 dark:from-white dark:via-slate-200 dark:to-blue-500"
              )}>
                {currentSubject === 'english' ? "Master English" : "Master Mathematics"}
              </span>
            </h1>
            
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
              {isElevenPlus
                ? (currentSubject === "english" ? "Premium curated study material to master comprehension, advanced vocabulary, and critical grammar for the 11+ English exams." : "Comprehensive 11+ Maths lessons with interactive diagrams, worked examples, and practice questions.")
                : "Comprehensive lessons with interactive diagrams, worked examples, and practice questions. Everything you need to achieve your best grade."}
            </p>

            {/* Subtle Inline Stats */}
            <div className="flex items-center gap-6 sm:gap-10 mt-10 pb-6 border-b border-border/40 lg:border-none lg:pb-0">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{totalTopics}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Topics</span>
              </div>
              <div className="w-px h-10 bg-border"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{sections.length}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Units</span>
              </div>
              <div className="w-px h-10 bg-border"></div>
              <div className="flex flex-col">
                <span className={cn(
                  "text-2xl font-bold text-foreground",
                  currentSubject === "english" ? "text-amber-600 dark:text-amber-500" : "text-blue-600 dark:text-blue-500"
                )}>
                  {completedTopics}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Completed</span>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          {user && (
            <div className={cn(
              "w-full lg:w-[360px] shrink-0 bg-card border rounded-2xl p-6 md:p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-500",
              currentSubject === "english" 
                ? "border-amber-500/20 shadow-[0_8px_30px_rgba(245,158,11,0.06)] hover:border-amber-500/40 hover:shadow-[0_8px_30px_rgba(245,158,11,0.12)]" 
                : "border-blue-500/20 shadow-[0_8px_30px_rgba(59,130,246,0.06)] hover:border-blue-500/40 hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)]"
            )}>
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full pointer-events-none",
                currentSubject === "english" ? "bg-amber-500/10" : "bg-blue-500/10"
              )} />
              <div className="flex items-center justify-between mb-8">
                 <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                   <div className={cn(
                     "w-2 h-2 rounded-full animate-pulse",
                     currentSubject === "english" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                   )} />
                   Your Progress
                 </span>
                 <button 
                  onClick={handleResetProgress}
                  className={cn(
                    "text-xs text-muted-foreground transition-colors flex items-center gap-1.5 font-medium",
                    currentSubject === "english" ? "hover:text-amber-600" : "hover:text-blue-600"
                  )}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-4xl font-bold text-foreground tracking-tight">{overallProgress}%</span>
                  <span className="text-[13px] font-medium text-muted-foreground mb-1">{completedTopics} of {totalTopics} Mastered</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden relative">
                   <div 
                     className={cn(
                       "h-full rounded-full transition-all duration-1000 ease-out",
                       currentSubject === "english" ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-blue-400 to-blue-500"
                     )}
                     style={{ width: `${overallProgress}%` }}
                   />
                </div>
              </div>

              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">Current Focus</div>
                <div className="text-sm font-semibold text-foreground mb-5 truncate">{currentUnit}</div>
                
                {continueFromTopic && (
                  <Link 
                    to={`/notes/${encodeURIComponent(continueFromTopic.section)}/${continueFromTopic.slug}`}
                    className="block"
                  >
                    <Button className="w-full text-sm font-semibold h-11 bg-foreground text-background hover:bg-foreground/90 gap-2 rounded-xl transition-transform active:scale-[0.98]">
                      Continue Learning
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Topics Section */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-1.5 h-6 rounded-full",
                currentSubject === "english" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
              )} />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Curriculum Units</h2>
            </div>
            
            <div className="relative w-full md:w-80 group">
              <Search className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                currentSubject === "english" ? "text-muted-foreground group-focus-within:text-amber-500" : "text-muted-foreground group-focus-within:text-blue-500"
              )} />
              <Input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-12 h-11 rounded-xl border-border/60 bg-card text-sm w-full transition-all shadow-sm",
                  currentSubject === "english" ? "focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20" : "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                )}
              />
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSections.map((section, index) => {
              const config = sectionConfig[section] || { abbr: section[0] || "?", desc: "" };
              const stats = getSectionStats(section);
              const sectionProgress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
              const displayName = sectionDisplayName[section] || section;
              const description = isElevenPlus ? (elevenPlusSectionDescriptions[section] || "11+ section") : config.desc;

              return (
                <Link 
                  key={section} 
                  to={`/notes/${encodeURIComponent(section)}`}
                  className="fade-up block h-full"
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className={cn(
                    "bg-card border rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 flex flex-col h-full group relative overflow-hidden",
                    currentSubject === "english" 
                      ? "border-border/60 hover:border-amber-500/50 hover:shadow-[0_12px_35px_rgba(245,158,11,0.1)]" 
                      : "border-border/60 hover:border-blue-500/50 hover:shadow-[0_12px_35px_rgba(59,130,246,0.1)]"
                  )}>
                    {/* Hover Glow Behind Card Accent */}
                    <div className={cn(
                      "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                      currentSubject === "english" ? "bg-amber-500/20" : "bg-blue-500/20"
                    )} />
                    
                    <div className="flex gap-4 items-start mb-4 relative z-10">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm shrink-0"
                        style={{ 
                          background: currentSubject === "english" 
                            ? 'linear-gradient(135deg, hsl(38 92% 50%) 0%, hsl(43 96% 56%) 100%)' 
                            : 'linear-gradient(135deg, hsl(221 83% 53%) 0%, hsl(217 91% 60%) 100%)',
                          color: 'white'
                        }}
                      >
                        {config.abbr}
                      </div>
                      <div className="flex-1 mt-1">
                        <h3 className={cn(
                          "font-semibold text-[17px] text-foreground tracking-tight transition-colors line-clamp-2",
                          currentSubject === "english" ? "group-hover:text-amber-600 dark:group-hover:text-amber-500" : "group-hover:text-blue-600 dark:group-hover:text-blue-500"
                        )}>
                          {displayName}
                        </h3>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-2 flex-grow">
                      {description}
                    </p>

                    {/* Footer Progress */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-5 mt-auto">
                      <span className="text-[13px] font-semibold text-muted-foreground">
                        {stats.completed} / {stats.total} complete
                      </span>
                      <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden relative">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${sectionProgress}%`,
                            background: sectionProgress === 100 ? '#10b981' : (currentSubject === "english" ? '#f59e0b' : '#3b82f6')
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="text-center py-20 bg-card rounded-2xl border border-border/40 mt-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-1">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try searching with different keywords
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center mt-20 pt-10 border-t border-border/40">
          <p className="text-sm text-muted-foreground/60">
            {isElevenPlus
              ? `11+ ${currentSubject === "english" ? "English" : "Maths"} track · Gradlify © ${new Date().getFullYear()}`
              : `${getExamBoardSubtitle((profile?.onboarding as any)?.examBoard)} · Gradlify © ${new Date().getFullYear()}`}
          </p>
        </footer>
      </div>
    </div>
  );
}
