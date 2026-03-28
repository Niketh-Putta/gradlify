import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import notesData from "@/data/edexcel_gcse_notes.json";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { getExamBoardBadge, getExamBoardSubtitle, replaceExamBoardReferences } from "@/lib/examBoard";
import { resolveUserTrack } from "@/lib/track";
import { getTrackLabel, getTrackSections } from "@/lib/trackCurriculum";

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
};

const sectionDisplayName: Record<string, string> = {
  "Ratio, Proportion & Rates of Change": "Ratio & Proportion",
};

const elevenPlusSectionDescriptions: Record<string, string> = {
  "Number & Arithmetic": "Place value, rounding, operations, number properties, fractions, decimals, and percentages.",
  "Algebra & Ratio": "Ratio, proportion, algebra basics, solving equations, and sequences.",
  "Geometry & Measures": "2D/3D shape properties, angles, perimeter/area/volume, measures/time, coordinates and transformations.",
  "Statistics & Data": "Averages, charts, and probability fundamentals.",
};

export default function RevisionNotes() {
  const { user, profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === '11plus';
  const elevenPlusSections = getTrackSections(userTrack);
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
        ? elevenPlusSections.map((section) => section.label)
        : Object.keys(boardAwareNotesData)
    ),
    [boardAwareNotesData, elevenPlusSections, isElevenPlus]
  );
  
  const allTopics = useMemo(() => {
    if (isElevenPlus) {
      return elevenPlusSections.flatMap((section) =>
        section.subtopics.map((topic) => ({
          slug: `${section.key}-${topic.key}`,
          title: topic.name,
          level: "11+",
          md: "",
          section: section.label,
        }))
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
      const match = elevenPlusSections.find((item) => item.label === section);
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
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12 sm:py-20">
        {/* Hero Section */}
        <section className="text-center max-w-[800px] mx-auto mb-16">
          <span className="notes-hero-badge mb-6">
            {isElevenPlus ? getTrackLabel(userTrack) : getExamBoardBadge((profile?.onboarding as any)?.examBoard)}
          </span>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-5">
            <span className="notes-gradient-text">Master Mathematics</span>
          </h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed max-w-[600px] mx-auto">
            {isElevenPlus
              ? "11+ notes are being rolled out by section. You can browse the full structure now, with content placeholders visible."
              : "Comprehensive lessons with interactive diagrams, worked examples, and practice questions. Everything you need to achieve your best grade."}
          </p>

          {/* Stats Row */}
          <div className="flex justify-center gap-12 mt-12 pt-12 border-t border-border/40">
            <div className="text-center">
              <div className="notes-stat-value">{totalTopics}</div>
              <div className="text-sm text-muted-foreground mt-1">Topics</div>
            </div>
            <div className="text-center">
              <div className="notes-stat-value">{sections.length}</div>
              <div className="text-sm text-muted-foreground mt-1">Units</div>
            </div>
            <div className="text-center">
              <div className="notes-stat-value">{completedTopics}</div>
              <div className="text-sm text-muted-foreground mt-1">Completed</div>
            </div>
          </div>

          {/* Progress Section */}
          {user && (
            <div className="mt-12 bg-card border border-border/40 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="text-base font-semibold text-foreground">Your Progress</span>
                <button 
                  onClick={handleResetProgress}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-8">
                {/* Progress Ring */}
                <div className="relative w-[120px] h-[120px] shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(262 83% 58%)" />
                        <stop offset="50%" stopColor="hsl(262 83% 68%)" />
                        <stop offset="100%" stopColor="hsl(280 70% 75%)" />
                      </linearGradient>
                    </defs>
                    <circle 
                      cx="60" cy="60" r="50" 
                      fill="none" 
                      stroke="hsl(var(--muted))" 
                      strokeWidth="10"
                    />
                    <circle 
                      cx="60" cy="60" r="50" 
                      fill="none" 
                      stroke="url(#progressGradient)" 
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="notes-progress-ring"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold notes-gradient-text">{overallProgress}%</span>
                  </div>
                </div>

                {/* Progress Info */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Topics Mastered</div>
                    <div className="text-2xl font-semibold text-foreground">{completedTopics} / {totalTopics}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Focus</div>
                    <div className="text-2xl font-semibold text-foreground">{currentUnit}</div>
                  </div>
                </div>
              </div>

              {/* Continue Button */}
              {continueFromTopic && (
                <Link 
                  to={`/notes/${encodeURIComponent(continueFromTopic.section)}/${continueFromTopic.slug}`}
                  className="block mt-8"
                >
                  <Button className="w-full sm:w-auto gap-2 notes-completion-btn">
                    Continue Learning
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Topics Section */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Choose a Topic</h2>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-2xl border-border/40 bg-card text-base"
              />
            </div>
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  className="fade-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="notes-topic-card group">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white mb-6"
                      style={{ background: 'var(--notes-gradient)' }}
                    >
                      {config.abbr}
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
                      {displayName}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-2">
                      {description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {stats.total} topic{stats.total !== 1 ? "s" : ""}
                      </span>
                      <div className="notes-progress-bar w-[100px]">
                        <div 
                          className="notes-progress-fill"
                          style={{ width: `${sectionProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Search className="h-10 w-10 text-primary/80" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try searching with different keywords
              </p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center mt-20 pt-10 border-t border-border/40">
          <p className="text-sm text-muted-foreground/60">
            {isElevenPlus
              ? `11+ Maths track · Gradlify © ${new Date().getFullYear()}`
              : `${getExamBoardSubtitle((profile?.onboarding as any)?.examBoard)} · Gradlify © ${new Date().getFullYear()}`}
          </p>
        </footer>
      </div>
    </div>
  );
}
