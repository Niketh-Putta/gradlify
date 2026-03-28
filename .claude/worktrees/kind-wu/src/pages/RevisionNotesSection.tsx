import { useState, useMemo, useEffect } from "react";
import { PremiumLoader } from "@/components/PremiumLoader";
import { Link, useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, CheckCircle2, ChevronRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import notesData from "@/data/edexcel_gcse_notes.json";
import elevenPlusNotesData from "@/data/eleven_plus_notes.json";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getExamBoardSpecSubtitle, replaceExamBoardReferences } from "@/lib/examBoard";
import { resolveUserTrack } from "@/lib/track";
import { getTrackSections } from "@/lib/trackCurriculum";

interface Topic {
  slug: string;
  title: string;
  level: string;
  md: string;
}

const estimateReadMinutes = (markdown: string): number => {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#*_>~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = plainText ? plainText.split(" ").filter(Boolean).length : 0;
  const minutes = Math.ceil(wordCount / 220);
  return Math.min(12, Math.max(1, minutes));
};

type NotesData = {
  [section: string]: Topic[];
};

const typedNotesData = notesData as NotesData;
const typedElevenPlusNotesData = elevenPlusNotesData as NotesData;

const sectionDisplayName: Record<string, string> = {
  "Ratio, Proportion & Rates of Change": "Ratio & Proportion",
};

// Section config - matching exact JSON keys
const sectionConfig: Record<string, { abbr: string; gradient: string }> = {
  "Number": { abbr: "N", gradient: "from-purple-500 to-purple-600" },
  "Algebra": { abbr: "A", gradient: "from-blue-500 to-blue-600" },
  "Ratio, Proportion & Rates of Change": { abbr: "R", gradient: "from-emerald-500 to-emerald-600" },
  "Geometry & Measures": { abbr: "G", gradient: "from-violet-500 to-violet-600" },
  "Probability": { abbr: "P", gradient: "from-amber-500 to-amber-600" },
  "Statistics": { abbr: "S", gradient: "from-cyan-500 to-cyan-600" },
  "Arithmetic & Number Skills": { abbr: "A", gradient: "from-purple-500 to-purple-600" },
  "Number & Arithmetic": { abbr: "N", gradient: "from-purple-500 to-purple-600" },
  "Algebra & Ratio": { abbr: "A", gradient: "from-pink-500 to-pink-600" },
  "Statistics & Data": { abbr: "S", gradient: "from-teal-500 to-teal-600" },
};

export default function RevisionNotesSection() {
  const { section } = useParams<{ section: string }>();
  const { user, profile } = useAppContext();
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === "11plus";
  const trackSections = getTrackSections(userTrack);
  const [searchQuery, setSearchQuery] = useState("");
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const examBoard = (profile?.onboarding as any)?.examBoard;

  const decodedSection = section ? decodeURIComponent(section) : "";
  const topics = useMemo(() => {
    if (isElevenPlus) {
      const sectionMeta = trackSections.find((item) => item.label === decodedSection);
      const authoredTopics = typedElevenPlusNotesData[decodedSection] || [];
      const authoredByTitle = new Map(
        authoredTopics.map((topic) => [topic.title.toLowerCase().trim(), topic])
      );
      const authoredBySlug = new Map(authoredTopics.map((topic) => [topic.slug, topic]));

      return (sectionMeta?.subtopics || []).map((subtopic) => {
        const fallbackTopic = {
          slug: `${sectionMeta?.key || "11plus"}-${subtopic.key}`,
          title: subtopic.name,
          level: "11+",
          md: "Notes placeholder. Full content coming soon.",
        };
        const authored =
          authoredBySlug.get(fallbackTopic.slug) ||
          authoredByTitle.get(subtopic.name.toLowerCase().trim());
        return authored
          ? { ...fallbackTopic, ...authored, slug: fallbackTopic.slug, title: subtopic.name }
          : fallbackTopic;
      });
    }

    const rawTopics = typedNotesData[decodedSection] || [];
    return rawTopics.map((topic) => ({
      ...topic,
      title: replaceExamBoardReferences(topic.title, examBoard),
      md: replaceExamBoardReferences(topic.md, examBoard),
    }));
  }, [decodedSection, examBoard, isElevenPlus]);
  const fallbackAbbr = decodedSection.trim().charAt(0).toUpperCase() || "N";
  const config = sectionConfig[decodedSection] || { abbr: fallbackAbbr, gradient: "from-purple-500 to-purple-600" };
  const sectionTitle = sectionDisplayName[decodedSection] || decodedSection;

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
        data.forEach((item) => {
          progressMap[item.topic_slug] = item.done;
        });
        setProgress(progressMap);
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user]);

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;

    const query = searchQuery.toLowerCase();
    return topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(query) ||
        topic.md.substring(0, 160).toLowerCase().includes(query)
    );
  }, [searchQuery, topics]);

  const completedCount = topics.filter((t) => progress[t.slug]).length;
  const sectionProgress = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;
  
  // Find first uncompleted topic
  const nextTopic = useMemo(() => {
    if (isElevenPlus) return null;
    return topics.find((t) => !progress[t.slug]);
  }, [topics, progress, isElevenPlus]);

  // Progress ring calculation
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference - (sectionProgress / 100) * circumference;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PremiumLoader />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-12">
        {/* Back Button */}
        <Link 
          to="/notes" 
          className="inline-flex items-center gap-2 text-sm font-medium mb-10 transition-all hover:gap-3"
          style={{ color: 'hsl(262 83% 58%)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          All Topics
        </Link>

        {/* Header */}
        <div className="mb-12">
          {/* Icon */}
          <div 
            className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-6 shadow-lg bg-gradient-to-r", config.gradient)}
          >
            {config.abbr}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-3">
            {sectionTitle}
          </h1>
          <p className="text-base text-muted-foreground">
            {isElevenPlus ? "11+ notes for this section" : getExamBoardSpecSubtitle((profile?.onboarding as any)?.examBoard)}
          </p>

          {/* Progress Overview */}
          {user && (
            <div className="mt-8 flex items-center gap-5">
              <div className="flex-1">
                <div className="notes-progress-bar h-2">
                  <div 
                    className="notes-progress-fill"
                    style={{ width: `${sectionProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'hsl(262 83% 58%)' }}>
                {completedCount}/{topics.length} complete
              </span>
            </div>
          )}

          {/* Continue Button */}
          {user && nextTopic && (
            <Link
              to={`/notes/${encodeURIComponent(decodedSection)}/${nextTopic.slug}`}
              className="inline-block mt-6"
            >
              <Button className="gap-2 notes-completion-btn">
                Continue: {nextTopic.title.length > 30 ? nextTopic.title.slice(0, 30) + '...' : nextTopic.title}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl border-border/40 bg-card"
          />
        </div>

        {/* Spec List */}
        <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-2 max-w-[950px] mx-auto p-5">
            {filteredTopics.map((topic, index) => {
              const isDone = progress[topic.slug];
              const readMinutes = estimateReadMinutes(topic.md);

              return (
                <Link
                  key={topic.slug}
                  to={`/notes/${encodeURIComponent(decodedSection)}/${topic.slug}`}
                  className="w-full"
                >
                  <div
                    className={cn(
                      "notes-spec-item group bg-card rounded-xl p-5 border border-border shadow-sm hover:shadow-md transition-all",
                      isDone && "completed"
                    )}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {/* Spec Code */}
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 mr-5 bg-gradient-to-r",
                      isDone ? "from-green-500 to-green-600" : config.gradient
                    )}>
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        `${config.abbr.toUpperCase()}${index + 1}`
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-[hsl(262_83%_58%)] transition-colors mb-1">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {`${readMinutes} min read`}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {topic.level === "H" && (
                        <span className="notes-badge notes-badge-higher">Higher</span>
                      )}
                      {isDone && (
                        <span className="notes-badge notes-badge-complete">Complete</span>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[hsl(262_83%_58%)] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {filteredTopics.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary/80" />
            </div>
            <h3 className="font-semibold mb-1">No topics found</h3>
            <p className="text-muted-foreground text-sm">
              Try searching with different keywords
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
