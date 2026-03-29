import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, AlertTriangle, Lock, Search, Highlighter, MapPin, Sparkles, ChevronRight, Flag, Timer, Zap, Trophy, ShieldAlert, Check, Type, SpellCheck, TextCursorInput, ListChecks, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// --- DATA ARCHITECTURE DEFINITION ---
// Mock exams contain multiple sections, each with its OWN distinct passage/text block on the left.
// --- MOCK GENERATOR HELPERS ---
const generateOptions = (correctAnswer: string, traps: string[], isMock = false) => {
  return [
    { id: "A", text: correctAnswer, correct: true },
    { id: "B", text: traps[0] || "A convincing distractor that tests selective reading.", trap: "Context Trap: Plausible but directly contradicted later in the passage.", correct: false },
    { id: "C", text: traps[1] || "A literal interpretation of a metaphorical phrase.", trap: "Literal Trap: Fails to understand the figurative language used.", correct: false },
    { id: "D", text: traps[2] || "Extrapolated information not present in the text.", trap: "Inference Trap: You assumed facts not in evidence.", correct: false },
  ].sort(() => Math.random() - 0.5).map((opt, i) => ({ ...opt, id: ['A', 'B', 'C', 'D'][i] }));
};

const generateComprehensionQuestions = (count: number) => {
  const tags = ["Retrieval", "Inference", "Analysis", "Synthesis", "Word Meaning"];
  const colors = [
    "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "bg-rose-500/10 text-rose-600 border-rose-500/20",
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20"
  ];
  const stems = [
    "What implies the main character's true motivation in paragraph",
    "Identify the literary device used to build tension in paragraph",
    "Based on the description of the setting in paragraph",
    "Which phrase best captures the author's tone in paragraph",
    "The word 'miasma' or its equivalent is used to establish what atmosphere?"
  ];

  return Array.from({ length: count }).map((_, i) => {
    const typeIdx = i % 5;
    const passageIdx = (i % 8) + 1; // p1 to p8
    return {
      id: `c_q${i + 1}`,
      tag: tags[typeIdx],
      tagColor: colors[typeIdx],
      text: `${stems[typeIdx]} ${passageIdx}...?`,
      evidenceLine: `p${passageIdx}`,
      options: generateOptions(`The nuanced answer deriving from paragraph ${passageIdx}.`, [
        "A surface-level assumption.",
        "An exaggerated interpretation.",
        "A perfectly logical but completely unsupported claim."
      ])
    };
  });
};

const generateSpagQuestions = (type: 'spelling' | 'punctuation' | 'grammar', prefix: string, count: number, passageLen: number = 3) => {
  const meta = {
    spelling: { tag: "Error-Hunt", color: "bg-violet-500/10 text-violet-600 border-violet-500/20", prompt: "Identify the segment with the spelling error, or select 'N'." },
    punctuation: { tag: "Punctuation Hunt", color: "bg-pink-500/10 text-pink-600 border-pink-500/20", prompt: "Identify the punctuation error in this segment." },
    grammar: { tag: "Grammar Cloze", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", prompt: "Select the correct grammatical component for this gap." }
  };

  return Array.from({ length: count }).map((_, i) => {
    const pIdx = (i % passageLen) + 1;
    return {
      id: `${prefix}_q${i + 1}`,
      tag: meta[type].tag,
      tagColor: meta[type].color,
      text: `Line ${20 + i}: ${meta[type].prompt}`,
      evidenceLine: `${prefix}${pIdx}`,
      options: [
        { id: "A", text: `Segment one of line ${20 + i}`, trap: null, correct: false },
        { id: "B", text: `Segment two of line ${20 + i}`, trap: null, correct: false },
        { id: "C", text: `The erroneous segment in line ${20 + i}`, trap: `${type} Trap: Commonly taught exception.`, correct: true },
        { id: "D", text: `Segment four of line ${20 + i}`, trap: null, correct: false },
        ...(type !== 'grammar' ? [{ id: "N", text: "No Mistake", trap: "Vigilance Trap.", correct: false }] : [])
      ]
    };
  });
};

// --- DATA ARCHITECTURE DEFINITION ---
const TEST_DATA = [
  {
    sectionId: 'comprehension',
    subEngine: 'comprehension',
    title: 'SECTION A: READING COMPREHENSION',
    icon: BookOpen,
    desc: 'Read the text excerpt carefully and answer the following questions.',
    leftTitle: 'Passage 1: 19th Century Classic',
    passageBlocks: [
      { id: 'p1', text: "The fog was so thick it seemed to swallow the cobbled streets of London whole. Eliza pulled her shawl tighter against the biting chill, her footsteps echoing like lonely heartbeats against the damp stone. She had been warned not to venture out past curfew, but the letter in her pocket—heavy with a wax seal that bore the crest of a fallen house—demanded urgency." },
      { id: 'p2', text: "Above her, the gas lamps flickered weakly, struggling to pierce the miasma. A sudden clatter from a nearby alleyway made her freeze. Naturally, her mind raced. Was it merely a stray cat, or was she being pursued by the very shadows she sought to evade? The city was a labyrinth of secrets, and she was but a mouse navigating its treacherous corridors." },
      { id: 'p3', text: "Clutching the letter, she turned the corner onto Blackwood Avenue. The imposing silhouette of her destination loomed ahead—a manor that had stood empty for a decade, or so the townsfolk whispered. Yet, a single, pale light burned in the highest window." },
      { id: 'p4', text: "Without hesitation, Eliza ascended the crumbling stone steps. The heavy oak door was ajar, as though expecting her. From deep within the belly of the house, a violin played a haunting, frenetic melody that seemed to pull her forward against her better judgment." },
      { id: 'p5', text: "Inside, the air grew incredibly stale, smelling of undisturbed dust, old parchment, and something metallic. The foyer stretched upwards into darkness, an abyss of mahogany and tarnished silver. Every creak of the floorboards felt thunderous." },
      { id: 'p6', text: "She unfolded the letter. The handwriting was erratic, ink sploshed frantically across the vellum. 'They are watching the pendulum,' it read. Nothing more. What pendulum? Eliza scanned the desolate hallway, her eyes landing on the monolithic grandfather clock ticking rhythmically in the corner." },
      { id: 'p7', text: "As she approached the clock, the ticking seemed to magnify, drowning out the erratic violin from the floor above. She reached out, running a tentative finger along the polished glass. Behind it, a heavy brass pendulum swung with hypnotic consistency." },
      { id: 'p8', text: "Suddenly, the ticking stopped. The violin stopped. The very air seemed to hold its breath. A shadow detached itself from the heavy velvet drapes, moving with a terrifying, liquid grace toward her. She was no longer alone." }
    ],
    questions: generateComprehensionQuestions(20)
  },
  {
    sectionId: 'spelling',
    subEngine: 'spelling',
    title: 'SECTION B: SPELLING EXERCISES',
    icon: SpellCheck,
    desc: 'In these sentences there are some spelling mistakes. Find the group of words with the mistake. If there is no mistake, mark N.',
    leftTitle: 'Spelling Exercises Overview',
    passageBlocks: Array.from({ length: 10 }).map((_, i) => ({
      id: `s${i + 1}`, text: `${20 + i}. The ${i % 2 === 0 ? 'imediate' : 'immediate'} atmosphere around the laboratory was completely chaotic and unpredicable.`
    })),
    questions: generateSpagQuestions('spelling', 's', 10, 10)
  },
  {
    sectionId: 'punctuation',
    subEngine: 'punctuation',
    title: 'SECTION C: PUNCTUATION (HIPPOS)',
    icon: TextCursorInput,
    desc: 'In this passage there are some punctuation mistakes. Find the group of words with the mistake in it.',
    leftTitle: 'Passage 2: Hippos',
    passageBlocks: Array.from({ length: 10 }).map((_, i) => ({
      id: `h${i + 1}`, text: `${20 + i} Mention the word hippo and you will probably think of a cute but robust animal that${i % 3 === 0 ? 's' : "'s"} missing its commas.`
    })),
    questions: generateSpagQuestions('punctuation', 'h', 10, 10)
  },
  {
    sectionId: 'grammar',
    subEngine: 'grammar',
    title: 'SECTION D: PERFORMANCE TIME CLOZE',
    icon: Type,
    desc: 'Choose the best word to complete each numbered line so it makes grammatical sense.',
    leftTitle: 'Passage 3: Performance Time',
    passageBlocks: Array.from({ length: 10 }).map((_, i) => ({
      id: `g${i + 1}`, text: `Waiting in the wings, the students' nerves soared as they listened to the [ ${20 + i} ] whispers from the crowd...`
    })),
    questions: generateSpagQuestions('grammar', 'g', 10, 10)
  }
];

// Completely Separate module for Vocab Practice (Never in Mock Exams)
const VOCAB_PRACTICE = {
  sectionId: 'vocab',
  subEngine: 'vocab',
  title: 'SECTION E: VOCABULARY SYNONYMS',
  icon: Languages,
  desc: 'Vocabulary questions test your raw lexical knowledge and ability to infer meaning.',
  leftTitle: 'Vocabulary Synonyms & Antonyms',
  passageBlocks: [
    { id: 'v1', text: "The ancient manor possessed an incredibly scrupulous and meticulous design, ensuring that every stone was perfectly aligned with the cosmos." },
    { id: 'v2', text: "The wealthy owner was known to be heavily involved in the planning, rejecting any sporadic flashes of inspiration in favor of rigid structure." },
    { id: 'v3', text: "His lethargic successors failed to maintain the facade, allowing ivy to aggressively pillage the grand stonework." },
    { id: 'v4', text: "By sunset, the once-imposing edifice became a sinister silhouette, casting an ominous and deleterious shadow over the surrounding valleys." }
  ],
  questions: Array.from({ length: 10 }).map((_, i) => ({
    id: `v_q${i + 1}`, tag: i % 2 === 0 ? "Synonym" : "Antonym", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    text: `Based on passage ${i % 4 + 1}, find the closest ${i % 2 === 0 ? "synonym" : "antonym"} to the underlined target word.`, 
    evidenceLine: `v${i % 4 + 1}`,
    options: generateOptions(`The accurate lexical ${i % 2 === 0 ? "match" : "opposite"}.`, ["An incorrect shade of meaning.", "A homophone distractor.", "A word with similar prefix but wrong root."])
  }))
};

export function EnglishSplitViewDemo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState<boolean>(true); // Assume true for now or read from hook later
  
  const modeParam = searchParams.get('mode') || 'practice';
  // Topics usually arrives comma separated from MockExams, e.g., "Comprehension,SPaG"
  const rawTopics = searchParams.get('topics') || 'Comprehension';
  const selectedTopics = rawTopics.toLowerCase();
  
  const examMode = modeParam === 'mock-exam' ? 'mock' : 'practice';
  
  const mockConfig: Record<string, boolean> = {
    comprehension: selectedTopics.includes('comprehension'),
    spelling: selectedTopics.includes('spag'),
    punctuation: selectedTopics.includes('spag'),
    grammar: selectedTopics.includes('spag'),
    vocab: selectedTopics.includes('vocabulary')
  };

  const [practiceFocus, setPracticeFocus] = useState<string>(
    selectedTopics.includes('vocabulary') ? 'vocab' : 
    (selectedTopics.includes('spag') ? 'spelling' : 'comprehension')
  );

  const [isFinished, setIsFinished] = useState<boolean>(false);

  const [activeQuestionId, setActiveQuestionId] = useState<string>("q1");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [showTrap, setShowTrap] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  
  const [timeLeft, setTimeLeft] = useState(3000); 

  const passageContainerRef = useRef<HTMLDivElement>(null);
  const passageSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 1. FILTERING LOGIC
  const activeSections = useMemo(() => {
    let sections = examMode === 'mock' 
      ? TEST_DATA.filter(sec => mockConfig[sec.sectionId])
      : (practiceFocus === 'vocab' ? [VOCAB_PRACTICE] : TEST_DATA.filter(sec => sec.sectionId === practiceFocus));

    // If Practice & Free Tier: Hard clamp to 1 question to enforce paywall
    if (examMode === 'practice' && !isPremium && sections.length > 0) {
      return [{
        ...sections[0],
        questions: sections[0].questions.slice(0, 1) // Harsh clamp!
      }];
    }
    return sections;
  }, [examMode, mockConfig, practiceFocus, isPremium]);

  // Timer logic for Mock Mode
  useEffect(() => {
    if (examMode === 'mock' && !isFinished && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [examMode, isFinished, timeLeft]);

  // Handle Highlighting
  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    if (text.length > 2) { 
      setHighlights(prev => [...prev, text]);
      selection.removeAllRanges();
    }
  };

  const renderHighlightedText = (text: string) => {
    if (highlights.length === 0) return text;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${highlights.map(escapeRegExp).join('|')})`, 'gi');
    return text.split(pattern).map((part, i) => {
      if (highlights.some(h => h.toLowerCase() === part.toLowerCase())) {
        return <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-yellow-950 dark:text-yellow-100 rounded-sm px-0.5">{part}</mark>;
      }
      return part;
    });
  };

  const handleSelectAnswer = (qId: string, optId: string, isTrap?: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: optId }));
    if (examMode === 'practice') {
      if (isTrap) setShowTrap(qId);
      else setShowTrap(null);
    }
  };

  const toggleFlag = (qId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFlaggedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // MACRO SCROLL INTELLIGENCE: 
  // Track which question is dominant in the right pane
  useEffect(() => {
    if (isFinished) return;
    const observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries.filter(e => e.isIntersecting);
      if (visibleEntries.length > 0) {
        const sorted = visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const topQ = sorted[0].target.getAttribute('data-qid');
        if (topQ) setActiveQuestionId(topQ);
      }
    }, {
      root: rightPaneRef.current,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0
    });

    Object.values(questionRefs.current).forEach(node => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [activeSections, isFinished, examMode]);

  // SYNCHRONIZED LEFT PASSAGE SCROLLING
  // When active question changes, firmly snap the left pane to the correct Passage Section!
  useEffect(() => {
    if (!activeQuestionId) return;
    
    let targetSectionId = null;
    let targetEvidenceLine = null;
    
    // Find who owns this question
    for (const sec of activeSections) {
      const q = sec.questions.find(x => x.id === activeQuestionId);
      if (q) {
        targetSectionId = sec.sectionId;
        targetEvidenceLine = q.evidenceLine;
        break;
      }
    }

    if (targetSectionId && passageSectionRefs.current[targetSectionId]) {
      // Intelligently scroll the master left-container to the correct passage block
      passageSectionRefs.current[targetSectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeQuestionId, activeSections]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-background p-6" style={{ '--primary': '43 96% 56%', '--primary-glow': '43 96% 66%' } as React.CSSProperties}>
        <div className="max-w-2xl w-full bg-card border border-border/80 shadow-xl rounded-[2rem] p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
          
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">Session Complete</h2>
          
          {isPremium ? (
            <div className="space-y-6 mt-8">
              <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-left">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-2xl flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-amber-500" /> Elite Analytics Dashboard
                  </h3>
                  <div className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-sm tracking-wide border border-amber-500/20">
                    Target: QE Boys
                  </div>
                </div>
                
                <p className="text-foreground leading-relaxed mb-6 bg-background rounded-2xl p-5 border border-border/40 font-medium">
                  Excellent work! You are currently scoring in the <strong className="text-amber-600 dark:text-amber-400 text-xl font-black">92nd percentile</strong> across this selected Mock configuration.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Comprehension</div>
                    <div className="text-4xl font-black text-amber-500">100%</div>
                  </div>
                  <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">SPaG Precision</div>
                    <div className="text-4xl font-black text-emerald-500">80%</div>
                  </div>
                </div>
              </div>
              <Button onClick={() => setIsFinished(false)} variant="outline" className="w-full h-12 rounded-xl font-bold">
                Review Paper Details & Tutor Notes
              </Button>
            </div>
          ) : (
            <div className="space-y-6 mt-8">
              <div className="p-6 rounded-2xl bg-muted/40 border border-border/60">
                <p className="text-lg font-medium mb-2">You got 1 out of 1 correct.</p>
                <p className="text-sm text-muted-foreground mb-6">
                  You are missing <strong className="text-foreground">over 80+ Elite questions</strong> encompassing isolated SPaG passages, Cloze structures, and rigorous full-length exams.
                </p>
                
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold shadow-lg shadow-amber-500/20 py-6 rounded-xl text-lg">
                  <Lock className="w-5 h-5 mr-2" />
                  Unlock Full Access
                </Button>
              </div>
              <Button onClick={() => setIsFinished(false)} variant="ghost" className="w-full text-muted-foreground">
                Return to Demo
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-background font-sans" style={{ '--primary': '43 96% 56%', '--primary-glow': '43 96% 66%' } as React.CSSProperties}>
      
      {/* Production UI start (Demo controls removed) */}

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ---------------- LEFT PANE: DYNAMIC PASSAGES ---------------- */}
        <div className="w-[45%] border-r border-border/80 flex flex-col bg-card/50 relative overflow-hidden transition-all duration-300">
          
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0 z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span className="font-serif font-bold tracking-tight text-foreground line-clamp-1">
                {examMode === 'mock' ? 'Full Mock Examination Paper' : `Practice Source: ${activeSections[0]?.leftTitle}`}
              </span>
            </div>
          </div>

          <div ref={passageContainerRef} className="flex-1 overflow-y-auto p-8 sm:px-10 text-base sm:text-[17px] leading-loose text-foreground/90 font-serif relative scroll-smooth pb-48">
            <div className="absolute top-4 left-4 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60 select-none">Source</div>

            <div className="space-y-16 relative">
              {activeSections.map((section, secIdx) => (
                <div 
                  key={section.sectionId} 
                  ref={(el) => { passageSectionRefs.current[section.sectionId] = el; }}
                  className="scroll-m-8 border-b border-border/40 pb-12 last:border-0"
                >
                  {examMode === 'mock' && (
                    <div className="mb-6 font-sans font-bold text-lg text-foreground/80 tracking-tight flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-sm border border-amber-500/20">
                        {secIdx + 1}
                      </div>
                      {section.leftTitle}
                    </div>
                  )}

                  <div className="space-y-6">
                    {section.passageBlocks.map((p, i) => {
                      // Check if the exact line is being referenced right now based on active question
                      let isTargetEvidence = false;
                      const activeQInfo = section.questions.find(q => q.id === activeQuestionId);
                      if (activeQInfo && activeQInfo.evidenceLine === p.id) {
                        isTargetEvidence = true;
                      }

                      // Scaffold highlighting is strictly practice mode only
                      const showScaffold = examMode === 'practice' && isTargetEvidence;
                      
                      return (
                        <div key={p.id} className="relative group">
                          {p.text.match(/^\d+/) && (
                            <div className="absolute -left-10 top-1.5 text-xs text-amber-500/80 font-black select-none pointer-events-none w-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              ♦
                            </div>
                          )}
                          <p 
                            className={cn(
                              "transition-all duration-500 p-2 -mx-2 rounded-lg cursor-text",
                              showScaffold 
                                ? "bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500 text-foreground" 
                                : "group-hover:bg-black/5 dark:group-hover:bg-white/5 opacity-90"
                            )}
                          >
                            {renderHighlightedText(p.text)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* FOMO Gradient Overlay for Free Tier */}
            {!isPremium && (
              <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-col items-center justify-end pb-8 px-6 text-center select-none pointer-events-none z-20">
                <div className="pointer-events-auto bg-card border border-border/80 shadow-xl rounded-2xl p-6 max-w-sm ring-1 ring-amber-500/20 transform transition-all hover:-translate-y-1">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight mb-2">Paywall Active</h3>
                  <p className="text-xs text-muted-foreground mb-4 px-2 leading-relaxed">
                    {examMode === 'mock' 
                      ? 'You have reached the end of the free Mock trial. Upgrade for access to full timed mock papers.' 
                      : `You have hit the limit for this ${practiceFocus.toUpperCase()} practice session.`}
                  </p>
                  <Button onClick={() => setIsPremium(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold shadow-md">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Unlock Full Version
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* ---------------- RIGHT PANE: QUESTIONS ---------------- */}
        <div className="flex-1 overflow-y-auto bg-background/50 flex flex-col relative" ref={rightPaneRef}>
          
          {examMode === 'mock' && (
            <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border/60 px-6 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 font-bold font-mono">
                <Timer className="w-4 h-4" />
                {formatTime(timeLeft)}
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ListChecks className="w-4 h-4" /> Exam Conditions Active
              </div>
            </div>
          )}

          <div className="max-w-xl mx-auto w-full p-8 pb-48">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                {examMode === 'mock' ? 'Wilsons Format Master Mock' : `${practiceFocus.toUpperCase()} DRILLS`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {examMode === 'mock' ? 'You have configured a custom Mock Exam mixing multiple passages.' : 'Answer the questions based on the source text strictly.'}
              </p>
            </div>

            {/* Render all the loaded sections linearly */}
            {activeSections.length === 0 && (
              <div className="text-center p-12 border border-border border-dashed rounded-3xl text-muted-foreground font-medium">
                No sections selected or configured.
              </div>
            )}

            {activeSections.map((section, secIndex) => {
              const Icon = section.icon || BookOpen;

              return (
                <div key={section.sectionId} className="mb-16">
                  {/* The Section Divider Component */}
                  {examMode === 'mock' && (
                    <div className="mb-10 mt-8 relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-border/80" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-background/95 px-6 py-2.5 rounded-full border border-border bg-card shadow-sm flex items-center gap-3 transform hover:scale-105 transition-transform cursor-default">
                          <div className="p-1.5 rounded-full bg-amber-500 text-amber-950 font-black shadow-inner">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-black tracking-widest text-foreground uppercase pt-0.5">{section.title}</span>
                        </span>
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-6 font-semibold max-w-sm mx-auto tracking-wide uppercase">{section.desc}</p>
                    </div>
                  )}

                  <div className="space-y-12">
                    {section.questions.map((q, qIndex) => {
                      const isSelected = activeQuestionId === q.id;
                      const isFlagged = flaggedQuestions[q.id];
                      
                      return (
                        <div 
                          key={q.id}
                          data-qid={q.id}
                          ref={(el) => { questionRefs.current[q.id] = el; }}
                          onClick={() => setActiveQuestionId(q.id)}
                          className={cn(
                            "p-6 rounded-2xl border transition-all duration-500 cursor-pointer scroll-m-24 relative",
                            isSelected 
                              ? (examMode === 'mock' ? "border-foreground/20 bg-card shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)] ring-1 ring-foreground/10 scale-[1.02]" : "border-amber-500/50 bg-card shadow-[0_10px_40px_-15px_rgba(245,158,11,0.2)] ring-4 ring-amber-500/10 scale-[1.02]")
                              : "border-border/60 bg-card/40 hover:bg-card/80 opacity-60 hover:opacity-100"
                          )}
                        >
                          {examMode === 'mock' && (
                            <button 
                              onClick={(e) => toggleFlag(q.id, e)}
                              className={cn("absolute -top-3 -right-3 p-2 rounded-full border shadow-sm bg-card transition-colors z-10 hover:bg-muted", isFlagged ? "text-rose-500 border-rose-500/50" : "text-muted-foreground border-border")}
                            >
                              <Flag className={cn("w-4 h-4", isFlagged && "fill-rose-500 text-rose-500")} />
                            </button>
                          )}

                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                              {examMode === 'mock' ? `Q${qIndex + 1}` : `Question ${qIndex + 1}`}
                            </span>
                            <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border", q.tagColor)}>
                              {q.tag}
                            </div>
                          </div>
                          
                          <h3 className="text-[15px] font-semibold leading-relaxed mb-6">
                            {q.text}
                          </h3>

                          <div className="space-y-3">
                            {q.options.map((opt) => {
                              const selected = selectedAnswers[q.id] === opt.id;
                              const showDistractor = examMode === 'practice' && showTrap === q.id && selected && opt.trap;
                              const evaluateCorrectness = examMode === 'practice' && selected;

                              return (
                                <div key={opt.id}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectAnswer(q.id, opt.id, opt.trap);
                                      setActiveQuestionId(q.id);
                                    }}
                                    className={cn(
                                      "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 group",
                                      selected 
                                        ? (examMode === 'mock' 
                                            ? "border-foreground/50 bg-foreground/5 text-foreground ring-2 ring-foreground/20" 
                                            : (opt.correct 
                                              ? "border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20" 
                                              : "border-rose-500 bg-rose-500/5 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20"))
                                        : "border-border/60 bg-background hover:border-foreground/30 hover:bg-muted/50"
                                    )}
                                  >
                                    <span className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors shadow-sm",
                                      selected
                                        ? (examMode === 'mock' ? "bg-foreground text-background shadow-md" : (opt.correct ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-rose-500 text-white shadow-md shadow-rose-500/20"))
                                        : "bg-card border border-border/80 text-muted-foreground group-hover:text-foreground"
                                    )}>
                                      {opt.id}
                                    </span>
                                    <span className="flex-1 text-[15px] font-medium leading-normal">
                                      {opt.text}
                                    </span>
                                    {selected && examMode === 'mock' && <Check className="w-4 h-4 text-foreground/50" />}
                                  </button>

                                  {/* The Trap Label / Explainer (PRACTICE MODE ONLY) */}
                                  {showDistractor && (
                                    <div className="mt-3 ml-12 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 animate-in slide-in-from-top-2 fade-in">
                                      <div className="flex items-start gap-3">
                                        <div className="mt-0.5 p-1 rounded-full bg-orange-500/20 text-orange-600">
                                          <MapPin className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <div className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                                            Evidence Path 
                                            <ChevronRight className="w-3 h-3 text-orange-500/50" />
                                            Tutor Note
                                          </div>
                                          <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                                            {opt.trap}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {evaluateCorrectness && opt.correct && (
                                    <div className="mt-3 ml-12 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-in slide-in-from-top-2 fade-in flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-emerald-600" />
                                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                        Excellent! You isolated the correct rule.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {activeSections.length > 0 && (
              <div className="pt-10 border-t border-border/40 mt-12 flex justify-end">
                <Button onClick={() => setIsFinished(true)} className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold px-8 h-12 rounded-xl text-md shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  Submit & Review Results
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default EnglishSplitViewDemo;
