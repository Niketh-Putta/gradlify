import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Youtube, FileText, Newspaper, BookOpen, Download, Trophy, TrendingUp, Target } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { useSubject } from "@/contexts/SubjectContext";
import { normalizeExamBoard } from "@/lib/examBoard";
import { AI_FEATURE_ENABLED } from "@/lib/featureFlags";
import { resolveUserTrack } from "@/lib/track";

type SupportedExamBoard = "Edexcel" | "AQA" | "OCR" | "IGCSE";

type PastPaper = {
  board: SupportedExamBoard;
  title: string;
  questionUrl: string | null;
  answerUrl: string | null;
};

const Resources = () => {
  const { profile } = useAppContext();
  const { currentSubject } = useSubject();
  type OnboardingDetails = { examBoard?: string | null; [key: string]: unknown };
  const onboarding = profile?.onboarding as OnboardingDetails | undefined;
  const examBoard = normalizeExamBoard(typeof onboarding?.examBoard === 'string' ? onboarding.examBoard : undefined);
  const activeBoard =
    examBoard && examBoard !== "Unsure" && ["Edexcel", "AQA", "OCR", "IGCSE"].includes(examBoard)
      ? (examBoard as SupportedExamBoard)
      : null;

  const newsItems = [
    {
      title: "2025 GCSE Maths Paper 1 Analysis & Revision Topics",
      url: "https://thirdspacelearning.com/blog/gcse-maths-paper-1-2025/"
    },
    {
      title: "GCSE Maths 2024 Summary: Insights, Highlights & What's Next",
      url: "https://thirdspacelearning.com/blog/summary-of-all-gcse-maths-papers-2024/"
    },
    ...(AI_FEATURE_ENABLED
      ? [
          {
            title: "AI Tools for GCSE Maths: A Practical Guide for Teachers",
            url: "https://thirdspacelearning.com/blog/ai-maths/"
          }
        ]
      : []),
    {
      title: "GCSE Maths Curriculum and Assessment: Time for Change?",
      url: "https://www.ocr.org.uk/blog/gcse-maths-curriculum-and-assessment-time-for-change/"
    },
    {
      title: "GCSE Changes 2025-2027: Formula Sheets & New Exam Features",
      url: "https://whichschooladvisor.com/thailand/school-news/gcse-changes-for-2025-2027-formula-sheets-online-exams-and-new-subjects"
    }
  ];

  const examBoardResourceLinks: Record<SupportedExamBoard, { label: string; url: string }> = {
    Edexcel: {
      label: "Pearson Edexcel GCSE Maths (1MA1) materials",
      url: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
    },
    AQA: {
      label: "AQA GCSE Maths (8300) assessment resources",
      url: "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/assessment-resources",
    },
    OCR: {
      label: "OCR GCSE Maths (J560) assessment resources",
      url: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
    },
    IGCSE: {
      label: "Pearson Edexcel International GCSE Maths A (4MA1) materials",
      url: "https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-mathematics-a-2016.coursematerials.html",
    },
  };

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

  const openResource = (url: string, filenameHint?: string) => {
    if (isExternalUrl(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    if (filenameHint) link.download = filenameHint;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const youtubeChannels = [
    {
      name: "ExamSolutions",
      description: "Comprehensive GCSE and A-Level maths tutorials with step-by-step solutions",
      url: "https://www.youtube.com/@ExamSolutions_Maths",
      subscribers: "500K+"
    },
    {
      name: "TLMaths",
      description: "Clear explanations and exam technique videos for GCSE Mathematics",
      url: "https://www.youtube.com/@TLMaths",
      subscribers: "200K+"
    },
    {
      name: "HegartyMaths",
      description: "Interactive maths lessons and practice questions for all levels",
      url: "https://www.youtube.com/@hegartymaths",
      subscribers: "150K+"
    }
  ];

  const pastPapers = useMemo<{
    foundation: { calculator: PastPaper[]; nonCalculator: PastPaper[] };
    higher: { calculator: PastPaper[]; nonCalculator: PastPaper[] };
  }>(() => ({
    foundation: {
      calculator: [
        {
          board: "AQA",
          title: "AQA Foundation (Calculator) — Browse official papers",
          questionUrl: "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/assessment-resources",
          answerUrl: "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/assessment-resources",
        },
        {
          board: "OCR",
          title: "OCR Foundation (Calculator) — Browse official papers",
          questionUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
          answerUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
        },
        {
          board: "Edexcel",
          title: "Edexcel Foundation (Calculator) — Browse official papers",
          questionUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
          answerUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
        },
      ],
      nonCalculator: [
        {
          board: "AQA",
          title: "AQA Foundation Paper 1 (Non-Calculator) - June 2023",
          questionUrl: "/past-papers/AQA-Foundation-Paper1-NonCalculator-June2023.pdf",
          answerUrl: "/past-papers/AQA-Foundation-Paper1-NonCalculator-MarkScheme-Jun2023.pdf"
        },
        {
          board: "AQA",
          title: "AQA Foundation Paper 1 (Non-Calculator) - November 2021",
          questionUrl: "/past-papers/AQA-Foundation-Paper1-NonCalculator-Nov2021.pdf",
          answerUrl: "/past-papers/AQA-Foundation-Paper1-NonCalculator-MarkScheme-Nov2021.pdf"
        },
        {
          board: "AQA",
          title: "AQA Foundation Mark Scheme - November 2023",
          questionUrl: null,
          answerUrl: "/past-papers/AQA-Foundation-Paper1-NonCalculator-MarkScheme-Nov2023.pdf"
        },
        {
          board: "OCR",
          title: "OCR Foundation (Non-Calculator) — Browse official papers",
          questionUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
          answerUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
        },
        {
          board: "Edexcel",
          title: "Edexcel Foundation (Non-Calculator) — Browse official papers",
          questionUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
          answerUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
        },
      ]
    },
    higher: {
      calculator: [
        {
          board: "AQA",
          title: "AQA Higher Paper 3 (Calculator) - June 2018",
          questionUrl: "/past-papers/AQA-Higher-Paper3-Calculator-Jun2018.pdf",
          answerUrl: null
        },
        {
          board: "AQA",
          title: "AQA Higher Paper 2 (Calculator) - November 2021",
          questionUrl: "/past-papers/AQA-Higher-Paper2-Calculator-Nov2021.pdf",
          answerUrl: "/past-papers/AQA-Higher-Paper2-Calculator-MarkScheme-Nov2021.pdf"
        },
        {
          board: "Edexcel",
          title: "Edexcel Higher (Calculator) — Mark scheme example (Nov 2023)",
          questionUrl: null,
          answerUrl: "/past-papers/Edexcel-Higher-Paper3-Calculator-MarkScheme-Nov2023.pdf"
        },
        {
          board: "Edexcel",
          title: "Edexcel Higher (Calculator) — Browse official papers",
          questionUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
          answerUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
        },
        {
          board: "OCR",
          title: "OCR Higher (Calculator) — Browse official papers",
          questionUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
          answerUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
        },
        {
          board: "IGCSE",
          title: "Edexcel International GCSE (Calculator) — Browse official papers",
          questionUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-mathematics-a-2016.coursematerials.html",
          answerUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-mathematics-a-2016.coursematerials.html",
        },
      ],
      nonCalculator: [
        {
          board: "AQA",
          title: "AQA Higher Paper 1 (Non-Calculator) - June 2018",
          questionUrl: "/past-papers/AQA-Higher-Paper1-NonCalculator-Jun2018.pdf",
          answerUrl: null
        },
        {
          board: "AQA",
          title: "AQA Higher Paper 1 (Non-Calculator) - June 2022",
          questionUrl: "/past-papers/AQA-Higher-Paper1-NonCalculator-Jun2022.pdf",
          answerUrl: "/past-papers/AQA-Higher-Paper1-NonCalculator-MarkScheme-Jun2022.pdf"
        },
        {
          board: "IGCSE",
          title: "Edexcel International GCSE — Mark scheme example (Summer 2023)",
          questionUrl: null,
          answerUrl: "/past-papers/Edexcel-International-Paper1HR-MarkScheme-Summer2023.pdf"
        },
        {
          board: "IGCSE",
          title: "Edexcel International GCSE — Browse official papers",
          questionUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-mathematics-a-2016.coursematerials.html",
          answerUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses/international-gcse-mathematics-a-2016.coursematerials.html",
        },
        {
          board: "OCR",
          title: "OCR Higher (Non-Calculator) — Browse official papers",
          questionUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
          answerUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
        },
        {
          board: "Edexcel",
          title: "Edexcel Higher (Non-Calculator) — Browse official papers",
          questionUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
          answerUrl: "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html",
        },
      ]
    }
  }), []);

  const filteredPastPapers = useMemo(() => {
    const filterByBoard = (papers: PastPaper[]) => {
      if (!activeBoard) return papers;
      return papers.filter((paper) => paper.board === activeBoard);
    };

    return {
      foundation: {
        calculator: filterByBoard(pastPapers.foundation.calculator),
        nonCalculator: filterByBoard(pastPapers.foundation.nonCalculator)
      },
      higher: {
        calculator: filterByBoard(pastPapers.higher.calculator),
        nonCalculator: filterByBoard(pastPapers.higher.nonCalculator)
      }
    };
  }, [activeBoard, pastPapers]);

  const pastPaperAvailability = useMemo(() => {
    if (!activeBoard) return null;

    const isLocal = (url: string | null) => Boolean(url && url.startsWith("/past-papers/"));

    const all = [
      ...filteredPastPapers.foundation.calculator,
      ...filteredPastPapers.foundation.nonCalculator,
      ...filteredPastPapers.higher.calculator,
      ...filteredPastPapers.higher.nonCalculator,
    ];

    const local = all.filter((paper) => isLocal(paper.questionUrl) || isLocal(paper.answerUrl));

    return {
      totalCount: all.length,
      localCount: local.length,
      hasAny: all.length > 0,
      hasAnyLocal: local.length > 0,
      hasOnlyExternal: all.length > 0 && local.length === 0,
      hasMix: local.length > 0 && local.length < all.length,
    };
  }, [activeBoard, filteredPastPapers]);

  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === "11plus";

  const elevenPlusSections = [
    {
      title: "Best practice papers",
      description: "Official and high-quality paper sources that parents consistently use for realistic 11+ preparation.",
      sectionClass: "from-blue-50/50 to-cyan-50/40 dark:from-blue-950/10 dark:to-cyan-950/10 border-blue-100/70 dark:border-blue-900/40",
      accentClass: "bg-blue-500",
      items: [
        {
          label: "GL Assessment official 11+ maths papers",
          url: "https://11plus.gl-assessment.co.uk/maths-practice-papers/",
          tag: "Official"
        },
        {
          label: "11 Plus Guide free maths papers library",
          url: "https://www.11plusguide.com/11-plus-papers-books/free-11-plus-papers/free-sample-11-plus-maths-papers/",
          tag: "Free"
        },
        {
          label: "ExamBerry curated free 11+ maths papers",
          url: "https://examberrypapers.co.uk/resources/free-11-plus-practice-papers/maths/",
          tag: "Updated list"
        },
        {
          label: "Mentor Education free 11+ papers",
          url: "https://mentoreducation.co.uk/11-plus/resources/11-plus-practice/",
          tag: "Free"
        },
      ],
    },
    {
      title: "Best YouTube channels",
      description: "Focused channels that explain exam methods, worked solutions, and timed thinking for 11+ style questions.",
      sectionClass: "from-rose-50/50 to-orange-50/40 dark:from-rose-950/10 dark:to-orange-950/10 border-rose-100/70 dark:border-rose-900/40",
      accentClass: "bg-rose-500",
      items: [
        {
          label: "Oxford Education (Bond 11+ videos)",
          url: "https://www.youtube.com/@OxfordEducation",
          tag: "11+ focused"
        },
        {
          label: "Corbettmaths (core KS2/KS3 fluency support)",
          url: "https://www.youtube.com/@Corbettmaths",
          tag: "Core maths"
        },
      ],
    },
    {
      title: "Continuously updated 11+ articles",
      description: "Live hubs and frequently refreshed guides so parents can track key dates, exam changes, and preparation strategy.",
      sectionClass: "from-emerald-50/50 to-teal-50/40 dark:from-emerald-950/10 dark:to-teal-950/10 border-emerald-100/70 dark:border-emerald-900/40",
      accentClass: "bg-emerald-500",
      items: [
        {
          label: "11 Plus Guide blog (frequent 11+ updates)",
          url: "https://www.11plusguide.com/blog/",
          tag: "Live"
        },
        {
          label: "GL Assessment 11+ news and updates",
          url: "https://11plus.gl-assessment.co.uk/",
          tag: "Live"
        },
      ],
    },
  ];

  const elevenPlusEnglishSections = [
    {
      title: "Best practice papers",
      description: "Official and high-quality paper sources that parents consistently use for realistic 11+ English preparation.",
      sectionClass: "from-blue-50/50 to-cyan-50/40 dark:from-blue-950/10 dark:to-cyan-950/10 border-blue-100/70 dark:border-blue-900/40",
      accentClass: "bg-blue-500",
      items: [
        {
          label: "GL Assessment official 11+ English papers",
          url: "https://11plus.gl-assessment.co.uk/english-practice-papers/",
          tag: "Official"
        },
        {
          label: "11 Plus Guide free English practice papers",
          url: "https://www.11plusguide.com/11-plus-papers-books/free-11-plus-papers/free-sample-11-plus-english-papers/",
          tag: "Free"
        },
        {
          label: "ExamBerry curated free 11+ English papers",
          url: "https://examberrypapers.co.uk/resources/free-11-plus-practice-papers/english/",
          tag: "Library"
        },
      ],
    },
    {
      title: "Vocabulary & Reading",
      description: "Focused tools that improve reading stamina, inference, and advanced vocabulary for the 11+ English exams.",
      sectionClass: "from-emerald-50/50 to-teal-50/40 dark:from-emerald-950/10 dark:to-teal-950/10 border-emerald-100/70 dark:border-emerald-900/40",
      accentClass: "bg-emerald-500",
      items: [
        {
          label: "Vocabulary Ninja (Word of the Day)",
          url: "https://vocabularyninja.co.uk/",
          tag: "Vocabulary"
        },
        {
          label: "CGP 11+ English Resources Directory",
          url: "https://www.cgpbooks.co.uk/11-plus/english",
          tag: "Workbooks"
        },
      ],
    },
    {
      title: "Continuously updated 11+ articles",
      description: "Live hubs and frequently refreshed guides so parents can track key dates, exam changes, and preparation strategy.",
      sectionClass: "from-rose-50/50 to-orange-50/40 dark:from-rose-950/10 dark:to-orange-950/10 border-rose-100/70 dark:border-rose-900/40",
      accentClass: "bg-rose-500",
      items: [
        {
          label: "11 Plus Guide blog (frequent 11+ updates)",
          url: "https://www.11plusguide.com/blog/",
          tag: "Live"
        },
        {
          label: "GL Assessment 11+ news and updates",
          url: "https://11plus.gl-assessment.co.uk/",
          tag: "Live"
        },
      ],
    },
  ];

  const getResourceImage = (url: string) =>
    `https://image.thum.io/get/width/360/crop/200/noanimate/${encodeURIComponent(url)}`;
  const getFavicon = (url: string) => {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
    } catch {
      return "";
    }
  };

  if (isElevenPlus) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-16 space-y-24">
        {/* Editorial Hero */}
        <header className="space-y-6 max-w-2xl">
          <Badge variant="outline" className="px-3 py-1 font-serif text-xs tracking-widest uppercase bg-transparent border-foreground/20 text-foreground/80">
            Study Resources
          </Badge>
          <h1 className="text-4xl md:text-5xl font-serif text-foreground leading-[1.1] tracking-tight">
            {currentSubject === 'english' ? '11+ English Resources' : '11+ Maths Resources'}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed tracking-wide">
            High-fidelity practice papers, expert channels, and live strategy feeds—expertly selected for intentional 11+ {currentSubject === 'english' ? 'English' : 'Mathematics'} preparation.
          </p>
        </header>

        {/* Resources Layout */}
        <div className="space-y-20">
          {(currentSubject === 'english' ? elevenPlusEnglishSections : elevenPlusSections).map((section) => (
            <section key={section.title} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-16 items-start">
              <div className="md:sticky md:top-24 pt-2">
                <h2 className="text-2xl font-serif text-foreground tracking-tight leading-snug">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-4 leading-relaxed font-light">
                  {section.description}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => openResource(item.url)}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border border-border/40 transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05), 0 4px 16px -4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 rounded bg-gradient-to-br ${section.sectionClass} flex items-center justify-center shrink-0 border border-border/50 shadow-inner overflow-hidden flex-none relative p-3`}>
                          <div className="absolute inset-0 bg-background/50 dark:bg-background/80 backdrop-blur-[2px]"></div>
                          <img
                            src={getFavicon(item.url)}
                            alt={item.label}
                            className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-sm hover:drop-shadow-md"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                       </div>
                       <div className="flex flex-col items-start gap-1.5 text-left">
                         <span className="text-[14px] font-medium text-foreground tracking-wide group-hover:text-primary transition-colors">
                           {item.label}
                         </span>
                         <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground px-2 py-0.5 rounded-full border border-border/50">
                           {item.tag}
                         </span>
                       </div>
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-secondary/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Sprint Premium Banner - Editorial format */}
        <section className="mt-24 pt-16 border-t border-border/30">
          <div className="max-w-3xl mx-auto text-center space-y-8">
             <h3 className="text-3xl font-serif text-foreground">Gradlify Sprint Access</h3>
             <p className="text-base text-muted-foreground font-light leading-relaxed">
               Transcend standard revision. Encounter our proprietary daily drills, topic-driven structural guides, and precision-timed mock examinations within an undisturbed environment.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                 <Link
                   to="/mocks?track=11plus"
                   className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-foreground text-background font-medium text-sm transition-all duration-300 hover:opacity-90 tracking-wide shadow-sm hover:shadow-md"
                 >
                    Start a Mock
                 </Link>
                 <Link
                   to="/notes?track=11plus"
                   className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-secondary text-foreground font-medium text-sm transition-all duration-300 hover:bg-muted tracking-wide border border-border/50"
                 >
                    Read Topic Notes
                 </Link>
             </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                Study Resources
              </h1>
              <p className="text-lg text-muted-foreground">
                Your complete toolkit for GCSE Mathematics success
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center p-4 bg-background/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Past Paper Questions</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold text-primary">10+</div>
              <div className="text-sm text-muted-foreground">Study Guides</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold text-primary">5+</div>
              <div className="text-sm text-muted-foreground">YouTube Channels</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold text-primary">Daily</div>
              <div className="text-sm text-muted-foreground">Updates</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-2xl"></div>
      </div>

      {/* Maths News Section */}
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Newspaper className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                Latest Maths News
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">Stay ahead with the latest in mathematics education and exam updates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {newsItems.map((news, index) => (
              <div 
                key={index}
                className="group/item p-4 bg-white/60 dark:bg-gray-900/60 rounded-xl border border-white/20 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200 cursor-pointer"
                onClick={() => window.open(news.url, '_blank')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.open(news.url, '_blank');
                  }
                }}
                aria-label={`Read article: ${news.title}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 group-hover/item:scale-150 transition-transform"></div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground group-hover/item:text-blue-600 group-hover/item:underline transition-all">{news.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(Date.now() - index * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                        <Badge variant="outline" className="text-xs">Education Today</Badge>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/item:text-blue-600 group-hover/item:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Channels Section */}
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-950/10 dark:to-pink-950/10">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Youtube className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                Top YouTube Channels
                <Badge variant="secondary" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  Expert Picks
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">Curated channels from top mathematics educators</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {youtubeChannels.map((channel, index) => (
              <Card key={index} className="group/card hover:shadow-lg transition-all duration-300 border-0 bg-white/80 dark:bg-gray-900/80">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Youtube className="h-5 w-5 text-red-600" />
                    </div>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {channel.subscribers}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover/card:text-red-600 transition-colors">{channel.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {channel.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="outline" 
                    className="w-full group-hover/card:bg-red-50 group-hover/card:border-red-200 dark:group-hover/card:bg-red-950/30 dark:group-hover/card:border-red-800 transition-colors"
                    onClick={() => window.open(channel.url, '_blank')}
                  >
                    <Youtube className="h-4 w-4 mr-2" />
                    Visit Channel
                    <ExternalLink className="h-3 w-3 ml-2 group-hover/card:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Past Papers Section */}
      <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                Official Past Papers
                <Badge variant="secondary" className="text-xs">
                  <Download className="h-3 w-3 mr-1" />
                  {activeBoard ?? 'GCSE'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-base">Complete collection of GCSE Mathematics past papers with mark schemes</CardDescription>
              {activeBoard ? (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => window.open(examBoardResourceLinks[activeBoard].url, "_blank", "noopener,noreferrer")}
                  >
                    Official {activeBoard} papers
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
              {activeBoard && pastPaperAvailability?.hasOnlyExternal ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                  <p className="font-semibold">No downloadable {activeBoard} past papers in Gradlify yet.</p>
                  <p className="mt-1 text-amber-800/90 dark:text-amber-100/80">
                    Use Gradlify practice questions for exam-style revision, or open the official {activeBoard} resources above.
                  </p>
                  <div className="mt-3">
                    <Button asChild size="sm" className="h-8">
                      <Link to="/practice-page">Practise questions in Gradlify</Link>
                    </Button>
                  </div>
                </div>
              ) : activeBoard && pastPaperAvailability?.hasMix ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Some links open on the official exam board site (↗).
                </p>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Foundation Tier */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Badge variant="secondary" className="font-semibold text-blue-700 dark:text-blue-300">Foundation Tier</Badge>
                  <p className="text-sm text-muted-foreground mt-1">Grades 1-5 | Essential fundamentals</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-4 border border-white/20">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Calculator Papers
                  </h4>
                  <div className="space-y-2">
                     {filteredPastPapers.foundation.calculator.map((paper, index) => (
                       <div key={index} className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                         <div className="flex items-start gap-2">
                           <FileText className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                           <span className="text-sm font-medium text-foreground leading-tight">{paper.title}</span>
                         </div>
                         <div className="flex gap-2 justify-end">
                           {paper.questionUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-green-50 dark:hover:bg-green-950/30 group/btn"
                               onClick={() => openResource(paper.questionUrl!, `${paper.title}-Questions`)}
                             >
                               Questions
                               {isExternalUrl(paper.questionUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Questions
                             </Button>
                           )}
                           
                           {paper.answerUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 group/btn"
                               onClick={() => openResource(paper.answerUrl!, `${paper.title}-Answers`)}
                             >
                               Answers
                               {isExternalUrl(paper.answerUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                          ) : (
                            <Button 
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                              disabled
                            >
                              Answers
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredPastPapers.foundation.calculator.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No {activeBoard ?? 'GCSE'} calculator papers available yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-4 border border-white/20">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Non-Calculator Papers
                  </h4>
                  <div className="space-y-2">
                     {filteredPastPapers.foundation.nonCalculator.map((paper, index) => (
                       <div key={index} className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                         <div className="flex items-start gap-2">
                           <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                           <span className="text-sm font-medium text-foreground leading-tight">{paper.title}</span>
                         </div>
                         <div className="flex gap-2 justify-end">
                           {paper.questionUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-green-50 dark:hover:bg-green-950/30 group/btn"
                               onClick={() => openResource(paper.questionUrl!, `${paper.title}-Questions`)}
                             >
                               Questions
                               {isExternalUrl(paper.questionUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Questions
                             </Button>
                           )}
                           
                           {paper.answerUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 group/btn"
                               onClick={() => openResource(paper.answerUrl!, `${paper.title}-Answers`)}
                             >
                               Answers
                               {isExternalUrl(paper.answerUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Answers
                             </Button>
                           )}
                         </div>
                       </div>
                    ))}
                    {filteredPastPapers.foundation.nonCalculator.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No {activeBoard ?? 'GCSE'} non-calculator papers available yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Higher Tier */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <Badge variant="default" className="font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white">Higher Tier</Badge>
                  <p className="text-sm text-muted-foreground mt-1">Grades 4-9 | Advanced challenges</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-4 border border-white/20">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Calculator Papers
                  </h4>
                  <div className="space-y-2">
                     {filteredPastPapers.higher.calculator.map((paper, index) => (
                       <div key={index} className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                         <div className="flex items-start gap-2">
                           <FileText className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                           <span className="text-sm font-medium text-foreground leading-tight">{paper.title}</span>
                         </div>
                         <div className="flex gap-2 justify-end">
                           {paper.questionUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-green-50 dark:hover:bg-green-950/30 group/btn"
                               onClick={() => openResource(paper.questionUrl!, `${paper.title}-Questions`)}
                             >
                               Questions
                               {isExternalUrl(paper.questionUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Questions
                             </Button>
                           )}
                           
                           {paper.answerUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 group/btn"
                               onClick={() => openResource(paper.answerUrl!, `${paper.title}-Answers`)}
                             >
                               Answers
                               {isExternalUrl(paper.answerUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Answers
                             </Button>
                           )}
                         </div>
                       </div>
                    ))}
                    {filteredPastPapers.higher.calculator.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No {activeBoard ?? 'GCSE'} calculator papers available yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-gray-900/60 rounded-lg p-4 border border-white/20">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Non-Calculator Papers
                  </h4>
                  <div className="space-y-2">
                     {filteredPastPapers.higher.nonCalculator.map((paper, index) => (
                       <div key={index} className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                         <div className="flex items-start gap-2">
                           <FileText className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                           <span className="text-sm font-medium text-foreground leading-tight">{paper.title}</span>
                         </div>
                         <div className="flex gap-2 justify-end">
                           {paper.questionUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-green-50 dark:hover:bg-green-950/30 group/btn"
                               onClick={() => openResource(paper.questionUrl!, `${paper.title}-Questions`)}
                             >
                               Questions
                               {isExternalUrl(paper.questionUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Questions
                             </Button>
                           )}
                           
                           {paper.answerUrl ? (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30 group/btn"
                               onClick={() => openResource(paper.answerUrl!, `${paper.title}-Answers`)}
                             >
                               Answers
                               {isExternalUrl(paper.answerUrl!) ? (
                                 <ExternalLink className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               ) : (
                                 <Download className="h-3 w-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                               )}
                             </Button>
                           ) : (
                             <Button 
                               size="sm"
                               variant="outline"
                               className="h-8 px-3 text-xs opacity-50 cursor-not-allowed"
                               disabled
                             >
                               Answers
                             </Button>
                           )}
                         </div>
                       </div>
                    ))}
                    {filteredPastPapers.higher.nonCalculator.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No {activeBoard ?? 'GCSE'} non-calculator papers available yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Download className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-800 dark:text-green-200">Pro Tip</p>
            </div>
            <p className="text-center text-green-700 dark:text-green-300 text-sm">
              Download past papers to practice offline. Use mark schemes to understand marking criteria and improve your exam technique.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Resources;
