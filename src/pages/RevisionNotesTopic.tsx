import React, { Fragment, type ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock, ChevronRight, CheckCircle, ChevronDown, Lightbulb, AlertTriangle, Target, FileText, Zap, HelpCircle, PenLine, Eye, EyeOff, Sparkles } from "lucide-react";
import notesData from "@/data/edexcel_gcse_notes.json";
import elevenPlusNotesData from "@/data/eleven_plus_notes.json";
import elevenPlusEnglishNotesData from "@/data/eleven_plus_english_notes.json";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { useSubject } from "@/contexts/SubjectContext";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { BlockVisual, hasBlockVisual, blockVisualKeys } from "@/components/exam/BlockVisual";
import { getInteractiveDiagram } from "@/components/revision-diagrams/InteractiveDiagrams";
import MathText from "@/components/MathText";
import { statisticsPracticeQuestions } from "@/data/statisticsPracticeQuestions";
import { ratioPracticeQuestions } from "@/data/ratioPracticeQuestions";
import { geometryPracticeQuestions } from "@/data/geometryPracticeQuestions";
import { replaceExamBoardReferences } from "@/lib/examBoard";
import { resolveUserTrack } from "@/lib/track";
import { getTrackSections } from "@/lib/trackCurriculum";

const extraDiagramsBySlug: Record<string, string> = {
  // 11+ Maths - Specific Systematic Slugs (High-Fidelity SVGs ONLY)
  "geometry_measures-coords_trans": "![Reflections and coordinate transformations.](/notes-diagrams/general/coordinates-grid.svg)",

  // GCSE Statistics (Restored Premium SVGs)
  "frequency-tables": "![Finding the median class using cumulative frequency](/notes-diagrams/statistics/frequency-cf-median-class.svg)",
  "box-plots-cumulative-frequency": "![Interquartile range (IQR) highlighted on a box plot](/notes-diagrams/statistics/boxplot-iqr-highlight.svg)",
  "histograms": "![Histogram: area equals frequency](/notes-diagrams/statistics/histogram-area-frequency.svg)",
  "scatter-graphs": "![Interpolation vs extrapolation on a scatter graph](/notes-diagrams/statistics/scatter-interp-extrap.svg)",
  "pie-charts": "![Pie chart check: angles sum to 360°](/notes-diagrams/statistics/pie-360-check.svg)",
  "comparing-distributions": "![Outliers affect the mean more than the median](/notes-diagrams/statistics/compare-outlier-mean-median.svg)",
  "sampling": "![Sampling bias: quick examples](/notes-diagrams/statistics/sampling-bias-examples.svg)",
};

function injectTopicDiagrams(md: string, slug?: string) {
  if (!slug) return md;
  // Check for exact slug match or inclusion (e.g. for generic 'rucsac' diagrams)
  const extra = extraDiagramsBySlug[slug] || (slug.includes('rucsac') ? extraDiagramsBySlug['rucsac'] : null);
  if (!extra) return md;

  const firstImage = md.match(/!\[[^\]]*\]\([^)]+\)/);
  if (firstImage?.[0]) {
    return md.replace(firstImage[0], `${firstImage[0]}\n\n${extra}`);
  }

  // If no image exists, inject after the first header
  if (md.startsWith('#')) {
    const firstHeaderEnd = md.indexOf('\n');
    if (firstHeaderEnd !== -1) {
      return md.slice(0, firstHeaderEnd) + `\n\n${extra}` + md.slice(firstHeaderEnd);
    }
  }

  return `${extra}\n\n${md}`;
}

// Allow a small, safe subset of HTML in notes markdown.
// This primarily enables <details>/<summary> for inline learning-point dropdowns.
const notesSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "details", "summary", "u", "div", "span", "table", "thead", "tbody", "tr", "th", "td", "b", "i", "strong", "em", "math", "mi", "mn", "mo", "mfrac", "msqrt", "mroot", "msup", "msub", "msubsup", "munder", "mover", "munderover", "mrow", "semantics", "annotation"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "className", "style", "aria-hidden"],
    details: [...((defaultSchema.attributes as any)?.details || []), "open"],
    div: ["className", "style"],
    span: ["className", "style", "aria-hidden"],
    table: ["className", "style"],
    td: ["className", "style", "rowspan", "colspan"],
    th: ["className", "style", "rowspan", "colspan"],
  },
} as const;




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

const sectionDisplayName: Record<string, string> = {
  "Ratio, Proportion & Rates of Change": "Ratio & Proportion",
};

// Section config with proper GCSE codes - matching exact JSON keys
const sectionConfig: Record<string, { abbr: string; color: string; gradient: string }> = {
  "Number": { abbr: "N", color: "hsl(221 83% 53%)", gradient: "from-blue-500 to-blue-600" },
  "Algebra": { abbr: "A", color: "hsl(221 83% 53%)", gradient: "from-blue-600 to-blue-700" },
  "Ratio, Proportion & Rates of Change": { abbr: "R", color: "hsl(142 76% 36%)", gradient: "from-emerald-500 to-emerald-600" },
  "Geometry & Measures": { abbr: "G", color: "hsl(199 89% 48%)", gradient: "from-cyan-500 to-cyan-600" },
  "Probability": { abbr: "P", color: "hsl(38 92% 50%)", gradient: "from-amber-500 to-amber-600" },
  "Statistics": { abbr: "S", color: "hsl(174 72% 42%)", gradient: "from-teal-500 to-teal-600" },
  "Number & Arithmetic": { abbr: "N", color: "hsl(221 83% 53%)", gradient: "from-blue-500 to-blue-600" },
  "Algebra & Ratio": { abbr: "A", color: "hsl(199 89% 48%)", gradient: "from-blue-500 to-cyan-500" },
  "Statistics & Data": { abbr: "S", color: "hsl(174 72% 42%)", gradient: "from-teal-500 to-cyan-500" },
  "Exam Preparation": { abbr: "E", color: "hsl(221 100% 43%)", gradient: "from-blue-600 to-blue-800" },
  "Comprehension": { abbr: "C", color: "hsl(221 83% 53%)", gradient: "from-blue-500 to-blue-600" },
  "Vocabulary": { abbr: "V", color: "hsl(38 92% 50%)", gradient: "from-amber-500 to-amber-600" },
  "SPaG": { abbr: "S", color: "hsl(38 92% 50%)", gradient: "from-orange-500 to-orange-600" },
};

// Block type configuration with enhanced visual hierarchy
const blockConfig: Record<string, { 
  icon: ReactNode; 
  color: string; 
  bgClass: string; 
  borderClass: string;
  headerClass: string;
  priority: 'high' | 'medium' | 'low';
}> = {
  concepts: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-primary",
    bgClass: "bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10",
    borderClass: "border-primary/40 border-l-4 border-l-primary",
    headerClass: "bg-primary/10",
    priority: 'high'
  },
  example: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-amber-400",
    bgClass: "bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/15 dark:to-amber-600/5",
    borderClass: "border-amber-500/40 border-l-4 border-l-amber-500",
    headerClass: "bg-amber-500/10",
    priority: 'medium'
  },
  mistakes: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-rose-400",
    bgClass: "bg-gradient-to-br from-rose-500/15 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/10",
    borderClass: "border-rose-500/50 border-l-4 border-l-rose-500 ring-1 ring-rose-500/20",
    headerClass: "bg-rose-500/15",
    priority: 'high'
  },
  tips: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-emerald-400",
    bgClass: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/10",
    borderClass: "border-emerald-500/50 border-l-4 border-l-emerald-500 ring-1 ring-emerald-500/20",
    headerClass: "bg-emerald-500/15",
    priority: 'high'
  },
  summary: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-cyan-400",
    bgClass: "bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/15 dark:to-cyan-600/5",
    borderClass: "border-cyan-500/30",
    headerClass: "bg-cyan-500/5",
    priority: 'medium'
  },
  formula: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-blue-400",
    bgClass: "bg-gradient-to-br from-blue-500/15 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/10",
    borderClass: "border-blue-500/40 border-l-4 border-l-blue-500",
    headerClass: "bg-blue-500/10",
    priority: 'high'
  },
  checks: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-blue-400",
    bgClass: "bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/15 dark:to-blue-600/5",
    borderClass: "border-blue-500/30",
    headerClass: "bg-blue-500/5",
    priority: 'low'
  },
  info: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-primary",
    bgClass: "bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10",
    borderClass: "border-primary/30 border-l-4 border-l-primary",
    headerClass: "bg-primary/10",
    priority: 'low'
  },
  passage: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-amber-500",
    bgClass: "bg-orange-50/80 dark:bg-orange-950/20",
    borderClass: "border-amber-400/50 border-l-4 border-l-amber-500 shadow-inner",
    headerClass: "bg-amber-500/10",
    priority: 'high'
  },
  vocab_list: { 
    icon: <Sparkles className="h-5 w-5" />, 
    color: "text-orange-500",
    bgClass: "bg-orange-50/80 dark:bg-orange-950/20",
    borderClass: "border-orange-400/50 border-l-4 border-l-orange-500 shadow-inner",
    headerClass: "bg-orange-500/10",
    priority: 'high'
  },
};

// Parse markdown into structured content blocks
function parseMarkdownToBlocks(md: string) {
  const blocks: { type: string; title: string; content: string }[] = [];
  const lines = md.split('\n');
  let currentBlock: { type: string; title: string; content: string } | null = null;

  lines.forEach((line) => {
    if (line.startsWith('## ')) {
      if (currentBlock) blocks.push(currentBlock);
      const title = line.replace('## ', '').trim();
      let type = 'info';
      if (
        title.includes('Overview') ||
        title.includes('Key Concepts') ||
        title.includes('Definition') ||
        title.includes('Key Methods') ||
        title.includes('Key Formulae') ||
        title.includes('Key Conversions') ||
        title.includes('Key Rules') ||
        title.includes('Key Theorems') ||
        title.includes('Architecture of Numbers') ||
        title.includes('Ordering Decimals')
      )
        type = 'concepts';
      else if (title.includes('Worked Example') || title.includes('Method') || title.includes('Exam-Style'))
        type = 'example';
      else if (title.includes('Common Mistakes') || title.includes('Critical Errors'))
        type = 'mistakes';
      else if (title.includes('Exam Tips') || title.includes('Exam Strategy'))
        type = 'tips';
      else if (title.includes('Summary'))
        type = 'summary';
      else if (title.includes('Formula'))
        type = 'formula';
      else if (title.includes('Quick Checks') || title.includes('Knowledge Check') || title.includes('Practice Questions') || title.includes('Official'))
        type = 'checks';
      else if (title.includes('Passage') || title.includes('Extract') || title.includes('Reference')) {
        if (title.includes('Vocabulary Reference')) {
          type = 'vocab_list';
        } else {
          type = 'passage';
        }
      }
      currentBlock = { type, title, content: '' };
    } else if (currentBlock) {
      currentBlock.content += line + '\n';
    } else if (line.trim() !== '') {
      // If we encounter content before any ## heading, create a default 'Overview' block
      currentBlock = { type: 'concepts', title: 'Overview', content: line + '\n' };
    }
  });
  if (currentBlock) blocks.push(currentBlock);
  return blocks;
}

// Parse Quick Checks into practice questions
function parseQuickChecks(content: string): { question: string; answer: string }[] {
  if (content.includes("[QUIZ_OPTION:")) {
    const quizBlocks = content.split(/\n---\n/g).map((block) => block.trim()).filter(Boolean);
    const parsed: { question: string; answer: string }[] = [];

    for (const block of quizBlocks) {
      const lines = block.split("\n");
      const stemLines: string[] = [];
      const optionLines: string[] = [];
      const explanationLines: string[] = [];
      let inExplanation = false;

      for (const line of lines) {
        if (/^\s*\*\*Explanation:\*\*/i.test(line)) {
          inExplanation = true;
          explanationLines.push(line.replace(/^\s*\*\*Explanation:\*\*\s*/i, "").trim());
          continue;
        }

        if (inExplanation) {
          explanationLines.push(line);
          continue;
        }

        const optionMatch = line.match(/^\s*\[QUIZ_OPTION:\s*([A-Z])\]\s*(.*?)(\s*\[CORRECT\])?\s*$/);
        if (optionMatch) {
          const [, label, text, correctTag] = optionMatch;
          optionLines.push(`- ${label}) ${text}`);
          if (correctTag) {
            explanationLines.unshift(`**Correct option:** ${label}) ${text}`);
          }
          continue;
        }

        if (/^\s*\*\*Q\d+/i.test(line) || line.trim() === "") {
          stemLines.push(line);
          continue;
        }

        stemLines.push(line);
      }

      const questionText = [...stemLines, "", ...optionLines].join("\n").trim();
      const answerText = explanationLines.join("\n").trim();
      if (questionText) {
        parsed.push({ question: questionText, answer: answerText });
      }
    }

    return parsed;
  }

  const parsedQuestions: Array<{ number: number; question: string; answer: string }> = [];

  const answersHeaderMatch =
    content.match(/^\s*\*\*Answers?\*\*\s*:??\s*$/m) ||
    content.match(/^\s*Answers?\s*:??\s*$/m);
  let questionsText = answersHeaderMatch
    ? content.slice(0, answersHeaderMatch.index).trimEnd()
    : content.trimEnd();
  let answersText = answersHeaderMatch
    ? content.slice((answersHeaderMatch.index || 0) + answersHeaderMatch[0].length).trim()
    : "";

  // Fallback split when headers are malformed: move explanation and below into answer content.
  if (!answersText) {
    const explanationStart = questionsText.match(/^\s*\*\*?Explanation\*\*?\s*:??/im);
    if (explanationStart) {
      answersText = questionsText.slice(explanationStart.index || 0).trim();
      questionsText = questionsText.slice(0, explanationStart.index).trimEnd();
    }
  }

  const lines = questionsText.split("\n");
  let currentQuestionNumber: number | null = null;
  let currentQuestionBuffer: string[] = [];

  const flushQuestion = () => {
    if (currentQuestionNumber === null) return;
    let text = currentQuestionBuffer.join("\n").trim();
    text = text
      .replace(/\n\s*\*\*Answers?\*\*[\s\S]*$/im, "")
      .replace(/\n\s*Answers?\s*:[\s\S]*$/im, "")
      .replace(/\n\s*\*\*?Explanation\*\*?[\s\S]*$/im, "")
      .trim();
    if (!text) return;
    parsedQuestions.push({ number: currentQuestionNumber, question: text, answer: "" });
  };

  for (const line of lines) {
    const questionStart = line.match(/^\s*(\d+)[.)]\s*(.*)$/);
    if (questionStart) {
      const candidateText = (questionStart[2] || "").trim();
      const isPromptLine =
        /\*\*Question:\*\*/i.test(candidateText) ||
        /\?\s*$/.test(candidateText);
      if (!isPromptLine) {
        if (currentQuestionNumber !== null) {
          currentQuestionBuffer.push(line);
        }
        continue;
      }

      flushQuestion();
      currentQuestionNumber = Number(questionStart[1]);
      currentQuestionBuffer = [];
      if (candidateText) currentQuestionBuffer.push(candidateText);
      continue;
    }

    if (currentQuestionNumber !== null) {
      currentQuestionBuffer.push(line);
    }
  }
  flushQuestion();

  // Parse answers by lines that start with "1)", "2)", ... (also anchored to line start)
  const answersByNumber: Record<number, string> = {};
  if (answersText) {
    const lines = answersText.split('\n');
    let currentNumber: number | null = null;
    let buffer: string[] = [];

    const flush = () => {
      if (currentNumber === null) return;
      const text = buffer.join('\n').trim();
      answersByNumber[currentNumber] = text;
    };

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)[.)]\s*(.*)$/);
      if (match) {
        flush();
        currentNumber = Number(match[1]);
        buffer = [match[2] ?? ''];
      } else if (currentNumber !== null) {
        buffer.push(line);
      }
    }
    flush();
  }

  // Attach parsed answers to the question cards in order.
  return parsedQuestions.map((question) => ({
    question: question.question,
    answer: answersByNumber[question.number] || "",
  }));
}

function PracticeQuestionCard({ question, answer, number }: { question: string; answer: string; number: number }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const markers = ["**Answers:**", "Answers:", "**Explanation:**", "Explanation:"];
  const markerIndexes = markers
    .map((marker) => question.indexOf(marker))
    .filter((index) => index >= 0);
  const firstMarkerIndex = markerIndexes.length > 0 ? Math.min(...markerIndexes) : -1;
  const visibleQuestion = firstMarkerIndex >= 0 ? question.slice(0, firstMarkerIndex).trim() : question.trim();
  const inlineAnswer = firstMarkerIndex >= 0 ? question.slice(firstMarkerIndex).trim() : "";
  const resolvedAnswer = (answer && answer.trim()) ? answer.trim() : inlineAnswer;
  
  return (
    <div className="notes-practice-card">
      <div className="flex items-start justify-between mb-4">
        <span className="notes-question-badge">Question {number}</span>
        <span className="text-xs text-muted-foreground">[2 marks]</span>
      </div>
      <div className="text-foreground text-base leading-relaxed mb-4">
        <NotesMarkdown>{visibleQuestion}</NotesMarkdown>
      </div>
      <button
        onClick={() => setShowAnswer(!showAnswer)}
        className="notes-show-answer-btn"
      >
        {showAnswer ? (
          <>
            <EyeOff className="h-4 w-4" />
            Hide Answer
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            Show Answer
          </>
        )}
      </button>
      {showAnswer && resolvedAnswer && (
        <div className="notes-answer-reveal">
          <NotesMarkdown>{resolvedAnswer}</NotesMarkdown>
        </div>
      )}
    </div>
  );
}

function renderTextWithMath(children: ReactNode) {
  const asArray = Array.isArray(children) ? children : [children];
  const allText = asArray.every((child) => typeof child === 'string' || typeof child === 'number');
  if (!allText) {
    return (
      <>
        {asArray.map((child, idx) =>
          typeof child === 'string' || typeof child === 'number' ? (
            <MathText key={`mixed-math-${idx}`} text={String(child)} />
          ) : (
            <Fragment key={`mixed-node-${idx}`}>{child}</Fragment>
          ),
        )}
      </>
    );
  }

  const text = asArray
    .map((child) => String(child))
    .reduce((acc, part) => {
      if (!acc) return part;
      const accLast = acc[acc.length - 1] || '';
      const partFirst = part[0] || '';
      const needsSpace =
        accLast &&
        partFirst &&
        !/\s$/.test(acc) &&
        !/^\s/.test(part) &&
        /[A-Za-z0-9)]/.test(accLast) &&
        /[A-Za-z0-9(]/.test(partFirst);
      return needsSpace ? `${acc} ${part}` : `${acc}${part}`;
    }, '');
  return <MathText text={text} />;
}

function NotesMarkdown({ children, blockType }: { children: string, blockType?: string }) {
  // Pre-process markdown to handle [!NOTE] etc before it gets parsed into complex React structures
  const processedMd = children
    .replace(/^> \[!NOTE\]/gim, '> @@NOTE-ALERT@@')
    .replace(/^> \[!TIP\]/gim, '> @@TIP-ALERT@@')
    .replace(/^> \[!IMPORTANT\]/gim, '> @@IMPORTANT-ALERT@@');

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, notesSanitizeSchema], rehypeKatex]}
      children={processedMd}
      components={{
        p: ({ children }) => (
          <p className="mb-8 text-foreground/90 leading-relaxed text-[16px] sm:text-[18px] tracking-tight">{renderTextWithMath(children)}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-serif italic font-medium text-foreground tracking-tight underline decoration-amber-400/60 underline-offset-[3px] decoration-2">{renderTextWithMath(children)}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/80 not-italic font-medium">{renderTextWithMath(children)}</em>
        ),
        ul: ({ children }) => (
          <ul className="space-y-5 mb-8 ml-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="space-y-5 mb-8 list-decimal list-outside ml-10 font-serif italic">{children}</ol>
        ),
        li: ({ children }) => (
          <li className={cn(
            "leading-relaxed text-[16px] sm:text-[18px] text-foreground/90 tracking-tight font-medium relative pl-5 before:absolute before:left-0 before:top-3 before:w-1.5 before:h-1.5 before:rounded-full before:opacity-100",
            (blockType === 'passage' || blockType === 'vocab_list') ? "before:bg-amber-500/50" : "before:bg-primary/50"
          )}>
            {renderTextWithMath(children)}
          </li>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-sm font-mono font-medium">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        h3: ({ children }) => (
          <h3 className={cn(
            "text-xl sm:text-2xl font-black mt-8 mb-4 flex items-center gap-3",
            (blockType === 'passage' || blockType === 'vocab_list') ? "text-amber-950 border-t border-amber-950/10 pt-6 mt-6" : "text-foreground"
          )}>
            <span className={cn(
               "w-1.5 h-6 rounded-full shrink-0",
               (blockType === 'passage' || blockType === 'vocab_list') ? "bg-amber-500/60" : "bg-primary/60"
            )}></span>
            {renderTextWithMath(children)}
          </h3>
        ),
        blockquote: ({ children }) => {
          let alertType: 'note' | 'tip' | 'important' | null = null;
          
          const processNode = (node: React.ReactNode): React.ReactNode => {
            if (typeof node === 'string') {
              if (node.includes('@@NOTE-ALERT@@')) alertType = 'note';
              else if (node.includes('@@TIP-ALERT@@')) alertType = 'tip';
              else if (node.includes('@@IMPORTANT-ALERT@@')) alertType = 'important';
              
              if (alertType) {
                return node.replace(/@@[A-Z-]+-ALERT@@\s?/g, '').replace(/:(\S)/g, ': $1');
              }
              return node;
            }
            if (React.isValidElement(node) && node.props.children) {
               const newChildren = React.Children.map(node.props.children, processNode);
               return React.cloneElement(node as any, {}, ...newChildren);
            }
            return node;
          };

          const cleanedChildren = React.Children.map(children, processNode);

          if (alertType) {
            const config = {
              note: { icon: <Zap className="h-5 w-5" />, label: 'Note', border: 'border-blue-500/50', bg: 'from-blue-500/10', color: 'text-blue-600 dark:text-blue-400' },
              tip: { icon: <Lightbulb className="h-5 w-5" />, label: 'Tip', border: 'border-emerald-500/50', bg: 'from-emerald-500/10', color: 'text-emerald-600 dark:text-emerald-400' },
              important: { icon: <AlertTriangle className="h-5 w-5" />, label: 'Important', border: 'border-amber-500/50', bg: 'from-amber-500/10', color: 'text-amber-600 dark:text-amber-400' }
            }[alertType];

            return (
              <div className={cn(
                "border-l-4 pl-6 py-5 my-10 bg-gradient-to-r to-transparent rounded-r-2xl relative group transition-all duration-300 hover:shadow-sm",
                config.border,
                config.bg
              )}>
                <div className={cn("flex items-center gap-2 mb-3 font-black uppercase tracking-widest text-[11px]", config.color)}>
                  {config.icon}
                  {config.label}
                </div>
                <div className="text-foreground/90 text-[16px] sm:text-[18px] font-medium leading-relaxed tracking-tight">
                  {renderTextWithMath(cleanedChildren)}
                </div>
              </div>
            );
          }

          return (
            <blockquote className="border-l-[4px] border-primary/50 pl-6 py-4 my-8 bg-gradient-to-r from-primary/10 to-transparent rounded-r-2xl text-foreground/90 text-[16px] sm:text-[18px] font-medium leading-relaxed tracking-tight">
              {renderTextWithMath(children)}
            </blockquote>
          );
        },
        details: ({ children, open }) => (
          <details open={Boolean(open)} className="notes-details">
            {children}
          </details>
        ),
        summary: ({ children }) => (
          <summary className="notes-summary">{renderTextWithMath(children)}</summary>
        ),
        u: ({ children }) => (
          <u className="underline decoration-primary/60 underline-offset-4">{renderTextWithMath(children)}</u>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse border border-border/50 rounded-lg overflow-hidden bg-background/30">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-foreground/5">{children}</thead>,
        tr: ({ children }) => <tr className="border-b border-border/50">{children}</tr>,
        th: ({ children }) => (
          <th className="px-4 py-3 text-left font-semibold text-foreground text-sm">{renderTextWithMath(children)}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-foreground/90 text-sm">{renderTextWithMath(children)}</td>
        ),
        img: ({ src, alt }) => {
          const srcString = String(src || "");
          const isSvg = srcString.toLowerCase().endsWith(".svg");
          const isNotesDiagram = srcString.includes("/notes-diagrams/");
          // Keep diagrams readable without overflowing the viewport.
          const maxHeight = isSvg || isNotesDiagram ? "min(520px, 70vh)" : "min(260px, 60vh)";

          return (
            <figure className="my-6 w-full">
              <div className="w-full flex justify-center">
                <img
                  src={srcString}
                  alt={String(alt || '')}
                  loading="lazy"
                  className="block w-full max-w-full h-auto rounded-md border border-border/30 object-contain"
                  style={{
                    maxHeight,
                    width: "100%",
                    height: "auto",
                  }}
                  onError={(e: any) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              {alt && <figcaption className="text-xs text-muted-foreground mt-2 text-center">{alt}</figcaption>}
            </figure>
          );
        },
      }}
    />
  );
}




export default function RevisionNotesTopic() {
  const { currentSubject } = useSubject();
  const { section, topic: topicSlug } = useParams<{ section: string; topic: string }>();
  const { user, profile } = useAppContext();
  const examBoardValue = (profile?.onboarding as any)?.examBoard;
  const navigate = useNavigate();
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const decodedSection = section ? decodeURIComponent(section) : "";
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === "11plus";
  const trackSections = getTrackSections(userTrack, currentSubject);
  const topics = useMemo(() => {
    if (isElevenPlus) {
      const isEnglish = currentSubject === 'english';
      const typedNotes = isEnglish ? typedElevenPlusEnglishNotesData : typedElevenPlusNotesData;
      
      const sectionMeta = trackSections.find((item) => item.label === decodedSection);
      const authoredTopics = typedNotes[decodedSection] || [];
      const authoredByTitle = new Map(
        authoredTopics.map((topic) => [topic.title.toLowerCase().trim(), topic])
      );
      const authoredBySlug = new Map(authoredTopics.map((topic) => [topic.slug, topic]));
      const mergedTopics = (sectionMeta?.subtopics || []).map((subtopic) => {
        const fallbackTopic = {
          slug: `${sectionMeta?.key || "11plus"}-${subtopic.key}`,
          title: subtopic.name,
          level: "11+",
          md: "## Overview\n\nNotes placeholder. Full content coming soon.",
        };
        const authored =
          authoredBySlug.get(fallbackTopic.slug) ||
          authoredByTitle.get(subtopic.name.toLowerCase().trim());
        return authored
          ? { ...fallbackTopic, ...authored, slug: fallbackTopic.slug, title: subtopic.name }
          : fallbackTopic;
      });

      return mergedTopics;
    }

    const rawTopics = typedNotesData[decodedSection] || [];

    return rawTopics.map((topic) => ({
      ...topic,
      title: replaceExamBoardReferences(topic.title, examBoardValue),
      md: replaceExamBoardReferences(topic.md, examBoardValue),
    }));
  }, [decodedSection, examBoardValue, isElevenPlus, trackSections, currentSubject]);
  const currentTopic = topics.find((t) => t.slug === topicSlug);
  const currentIndex = topics.findIndex((t) => t.slug === topicSlug);
  const fallbackAbbr = decodedSection.trim().charAt(0).toUpperCase() || "N";
  const config =
    sectionConfig[decodedSection] ||
    { abbr: fallbackAbbr, color: "hsl(38 92% 50%)", gradient: "from-amber-500 to-amber-600" };
  const sectionTitle = sectionDisplayName[decodedSection] || decodedSection;

  const subjectThemeVariables = useMemo(() => {
    if (!isElevenPlus) return {};
    if (currentSubject === 'maths') {
      return { 
        '--notes-accent': '221 83% 53%', 
        '--notes-accent-light': '218 91% 65%',
        '--notes-accent-dark': '226 71% 40%',
        '--notes-gradient': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' 
      } as React.CSSProperties;
    }
    return { 
      '--notes-accent': '38 92% 50%', 
      '--notes-accent-light': '43 96% 56%',
      '--notes-accent-dark': '35 92% 33%',
      '--notes-gradient': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' 
    } as React.CSSProperties;
  }, [isElevenPlus, currentSubject]);

  const activeGradient = isElevenPlus 
    ? (currentSubject === 'maths' ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600') 
    : config.gradient;

  const { contentBlocks, practiceQuestions } = useMemo(() => {
    if (!currentTopic) return { contentBlocks: [], practiceQuestions: [] };

    // Some older notes referenced a diagram panel that no longer exists.
    // We strip that line at render-time to avoid confusing learners.
    let cleanedMd =
      decodedSection === "Statistics" && currentTopic.slug === "mean-median-mode-range"
        ? currentTopic.md.replace(
            /\n> A quick visual \(box plot\) appears below this topic to help you see \*\*median\*\* and \*\*spread\*\*\.\n/g,
            "\n"
          )
        : currentTopic.md;

    cleanedMd = injectTopicDiagrams(cleanedMd, currentTopic.slug);

    const blocks = parseMarkdownToBlocks(cleanedMd);
    
    // Find and extract Quick Checks section for practice questions
    const checksBlock = blocks.find(b => b.type === 'checks');

    const statisticsQuestions =
      decodedSection === "Statistics" ? statisticsPracticeQuestions[currentTopic.slug] : undefined;

    const ratioQuestions =
      decodedSection === "Ratio, Proportion & Rates of Change"
        ? ratioPracticeQuestions[currentTopic.slug]
        : undefined;

    const geometryQuestions =
      decodedSection === "Geometry & Measures"
        ? geometryPracticeQuestions[currentTopic.slug]
        : undefined;

    const questions = statisticsQuestions
      ? statisticsQuestions
      : ratioQuestions
        ? ratioQuestions
        : geometryQuestions
          ? geometryQuestions
        : checksBlock
          ? parseQuickChecks(checksBlock.content)
          : [];
    
    // Filter out Quick Checks from main content blocks
    const filteredBlocks = blocks.filter(b => b.type !== 'checks');
    
    return { contentBlocks: filteredBlocks, practiceQuestions: questions };
  }, [currentTopic, decodedSection]);

  // Keep each accordion independent; start all open for a new topic.
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedBlocks(new Set(contentBlocks.map((_, idx) => idx)));
  }, [topicSlug, contentBlocks]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the block that's most visible or the first one that's intersecting
        const visibleEntry = entries.find(entry => entry.isIntersecting);
        if (visibleEntry) {
          setActiveBlockId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px', // Adjust so the active block is roughly in the top third
        threshold: 0
      }
    );

    // Observe all content blocks
    contentBlocks.forEach((_, idx) => {
      const el = document.getElementById(`block-${idx}`);
      if (el) observer.observe(el);
    });

    // Also observe practice questions if they exist
    const practiceEl = document.getElementById('practice-questions');
    if (practiceEl) observer.observe(practiceEl);

    return () => observer.disconnect();
  }, [contentBlocks, practiceQuestions]);

  const { prevTopic, nextTopic } = useMemo(() => {
    const prev = currentIndex > 0 ? topics[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < topics.length - 1 ? topics[currentIndex + 1] : null;
    return { prevTopic: prev, nextTopic: next };
  }, [currentIndex, topics]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user || !topicSlug) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("notes_progress")
        .select("done")
        .eq("user_id", user.id)
        .eq("topic_slug", topicSlug)
        .maybeSingle();

      if (!error && data) {
        setIsDone(data.done);
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user, topicSlug]);

  const handleToggleDone = async () => {
    if (!user || !topicSlug) {
      toast({
        title: "Sign in required",
        description: "Please sign in to track your progress.",
        variant: "destructive",
      });
      return;
    }

    const newStatus = !isDone;
    setIsDone(newStatus);

    const { error } = await supabase
      .from("notes_progress")
      .upsert(
        {
          user_id: user.id,
          topic_slug: topicSlug,
          done: newStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_slug" }
      );

    if (error) {
      console.error("Error updating progress:", error);
      setIsDone(!newStatus);
      toast({
        title: "Error",
        description: "Failed to update progress.",
        variant: "destructive",
      });
    } else {
      toast({
        title: newStatus ? "Topic completed!" : "Marked incomplete",
        description: newStatus ? "Great job! Keep it up." : "Progress updated.",
      });
    }
  };

  const navigateToTopic = (topic: Topic) => {
    navigate(`/notes/${encodeURIComponent(decodedSection)}/${topic.slug}`);
  };

  const toggleBlock = (index: number) => {
    setExpandedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (!currentTopic) {
    return (
      <div className="min-h-screen bg-background" style={subjectThemeVariables}>
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link to="/notes" className="inline-flex items-center gap-2 text-sm hover:underline mb-4 text-purple-400">
            <ArrowLeft className="h-4 w-4" />
            Back to notes
          </Link>
          <p className="text-center text-muted-foreground">Topic not found.</p>
        </div>
      </div>
    );
  }

  const wordCount = currentTopic.md.split(/\s+/).length;
  const readingTime = Math.max(5, Math.ceil(wordCount / 200));

  const useSplitPane = currentSubject === 'english';
  const practiceTitle = decodedSection === "Comprehension" ? "Comprehension Practice" : 
                       decodedSection === "Vocabulary" ? "Vocabulary Practice" : "SPaG Practice";
  const practiceDesc = decodedSection === "Comprehension" 
    ? "Test your ability to synthesize the analytical methods taught in this masterclass."
    : "Test your mastery of the advanced vocabulary techniques taught in this module.";

  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8 flex-wrap">
      <Link to="/notes" className="hover:text-foreground transition-colors flex items-center gap-1">
        <BookOpen className="h-4 w-4" />
        Notes
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link to={`/notes/${encodeURIComponent(decodedSection)}`} className="hover:text-foreground transition-colors">
        {sectionTitle}
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium truncate max-w-[200px]">{currentTopic.title}</span>
    </div>
  );

  const renderHeader = () => (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
      <div className={cn("px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r", config.gradient)}>
        {config.abbr.toUpperCase()}{currentIndex + 1}
      </div>
      <span className="text-sm text-muted-foreground">
        {sectionTitle}
      </span>
    </div>

    <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight mb-4 leading-tight font-serif italic">
      {currentTopic.title}
    </h1>

    <div className="flex flex-wrap items-center gap-4 mb-6">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Clock className="h-4 w-4" />
        {readingTime} min read
      </span>
      <span className="text-sm text-muted-foreground">
        Topic {currentIndex + 1} of {topics.length}
      </span>
    </div>

    {user && (
      <Button
        onClick={handleToggleDone}
        disabled={loading}
        className={cn(
          "gap-2 notes-completion-btn",
          isDone && "complete"
        )}
      >
        {isDone ? (
          <>
            <CheckCircle className="h-4 w-4" />
            Completed
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Mark Complete
          </>
        )}
      </Button>
    )}
  </div>
  );

  const renderedVisualKeywords = new Set<string>();

  const renderBlocks = (blocks: any[]) => (
    blocks.map((block, index) => {
      const blockStyle = blockConfig[block.type] || blockConfig.info;
      const isHighPriority = blockStyle.priority === 'high';
      
      const visualKey = blockVisualKeys.find(k => block.title.toLowerCase().includes(k));
      let shouldShowVisual = false;
      if (visualKey && !renderedVisualKeywords.has(visualKey)) {
        shouldShowVisual = true;
        renderedVisualKeywords.add(visualKey);
      }
      
      return (
        <div 
          key={index}
          id={`block-${index}`}
          className={cn(
            "notes-block-card rounded-2xl overflow-hidden mb-8 scroll-mt-24",
            blockStyle.bgClass,
            blockStyle.borderClass,
            isHighPriority && "shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)]",
            (block.type === 'passage' || block.type === 'vocab_list') && "border shadow-lg border-amber-200/50"
          )}
        >
          <div
            className={cn(
              "w-full flex items-center justify-between p-6 text-left border-b border-black/5 dark:border-white/5",
              blockStyle.headerClass,
              (block.type === 'passage' || block.type === 'vocab_list') && 'bg-amber-100/50 border-amber-200/50'
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/5",
                blockStyle.color,
                isHighPriority ? "bg-background/90 shadow-black/10" : "bg-background/70 shadow-black/5"
              )}>
                {blockStyle.icon}
              </div>
              <h2 className={cn(
                "font-black text-foreground tracking-widest uppercase",
                isHighPriority ? "text-lg sm:text-xl" : "text-base sm:text-lg",
                (block.type === 'passage' || block.type === 'vocab_list') && 'font-serif text-amber-900 tracking-normal capitalize'
              )}>
                {block.title}
              </h2>
            </div>
            {shouldShowVisual && (
              <div className="px-4 py-1.5 rounded-full bg-background/50 border border-black/5 dark:border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 shadow-sm">
                <Eye className="h-3 w-3 text-primary/60" /> Visual Step
              </div>
            )}
            {block.type !== 'passage' && (
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-300",
                expandedBlocks.has(index) && "rotate-180"
              )} />
            )}
          </div>
          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              (expandedBlocks.has(index) || block.type === 'passage' || block.type === 'vocab_list') ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {/* Call specialized block visual diagrams if available */}
            {shouldShowVisual && (
              <div className="px-6 pt-6 -mb-2">
                <BlockVisual title={block.title} />
              </div>
            )}
              <div className={cn(
                "p-8 sm:p-10 notes-content-wrapper", 
                block.type === 'passage' && 'font-serif text-[1.15rem] leading-[1.8] text-amber-950/90 tracking-normal overflow-y-auto max-h-[calc(100vh-16rem)] custom-scrollbar',
                block.type === 'vocab_list' && 'text-[1.1rem] leading-[1.7] text-amber-950/90 tracking-tight overflow-y-auto max-h-[calc(100vh-16rem)] custom-scrollbar'
              )}>
                <NotesMarkdown blockType={block.type}>{block.content}</NotesMarkdown>
              </div>
          </div>
        </div>
      );
    })
  );

  if (useSplitPane) {
    const stickyBlocks = contentBlocks.filter(b => b.type === 'passage' || b.type === 'vocab_list');
    const utilityBlocks = contentBlocks.filter(b => b.type !== 'passage' && b.type !== 'vocab_list');

    return (
      <div className="min-h-screen bg-background" style={subjectThemeVariables}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="w-full mb-8">
            {renderBreadcrumb()}
            {renderHeader()}
          </div>

          <div className="w-full flex flex-col xl:flex-row items-stretch gap-8 xl:gap-12 relative pb-24">
            {/* Left Column - Sticky Reference Box */}
            <div className="w-full xl:w-[45%] shrink-0">
              <div className="sticky top-24">
                {stickyBlocks.length > 0 ? (
                  renderBlocks(stickyBlocks)
                ) : (
                  <div className="p-8 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-center text-amber-800/80 shadow-sm font-medium">
                    No dedicated active reference in this section.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Lesson Notes & Practice */}
            <div className="flex-1 w-full xl:w-[55%] space-y-8">
              {/* Lesson notes */}
              {renderBlocks(utilityBlocks)}

              {/* Practice Questions */}
              {practiceQuestions.length > 0 && (
                <div className="mt-12 bg-gradient-to-br from-card to-background border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 sm:p-8 border-b border-border/50 bg-muted/30">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Zap className="h-6 w-6 text-primary" />
                      {practiceTitle}
                    </h2>
                    <p className="text-muted-foreground mt-2">{practiceDesc}</p>
                  </div>
                  <div className="p-6 sm:p-8 space-y-6">
                    {practiceQuestions.map((pq, idx) => (
                      <PracticeQuestionCard
                        key={idx}
                        question={pq.question}
                        answer={pq.answer}
                        number={idx + 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between gap-4 mt-8 pt-8 border-t border-border/10">
                {prevTopic ? (
                  <Button
                    variant="ghost"
                    onClick={() => navigateToTopic(prevTopic)}
                    className="gap-2 text-muted-foreground hover:text-foreground flex-1 justify-start h-auto py-4"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <div className="text-left min-w-0">
                      <span className="text-xs block opacity-70">Previous Section</span>
                      <span className="font-medium truncate block max-w-[200px]">{prevTopic.title}</span>
                    </div>
                  </Button>
                ) : (
                  <div className="flex-1" />
                )}

                {nextTopic && (
                  <Button
                    onClick={() => navigateToTopic(nextTopic)}
                    className={cn(
                      "gap-2 flex-1 justify-end h-auto py-4 text-white shadow-lg hover:shadow-xl transition-all border-0 ring-1 ring-white/10",
                      currentSubject === 'english'
                        ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20"
                        : "bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary/90 shadow-primary/20"
                    )}
                  >
                    <div className="text-right min-w-0">
                      <span className="text-xs block font-bold tracking-widest uppercase opacity-90">Next Section</span>
                      <span className="font-medium truncate block max-w-[200px]">{nextTopic.title}</span>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={subjectThemeVariables}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col xl:flex-row items-start gap-8 xl:gap-16">
        <div className="flex-1 w-full max-w-[800px] mx-auto xl:mx-0 shrink-0">
          {renderBreadcrumb()}
          {renderHeader()}
        
        {/* Content Blocks */}
        <div className="space-y-5 mb-10">
          {renderBlocks(contentBlocks)}
        </div>

        {/* Practice Questions Section */}
        {practiceQuestions.length > 0 && (
          <div id="practice-questions" className="mb-10 scroll-mt-24">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn("p-2.5 rounded-xl", currentSubject === 'english' ? "bg-amber-500/10" : "bg-primary/10")}>
                <PenLine className={cn("h-5 w-5", currentSubject === 'english' ? "text-amber-500" : "text-primary")} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Practice Questions</h2>
            </div>
            <div className="notes-practice-container">
              {practiceQuestions.map((q, i) => (
                <PracticeQuestionCard
                  key={i}
                  question={q.question}
                  answer={q.answer}
                  number={i + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completion Block */}
        <div className="notes-completion-block mb-10">
          <h3 className="text-2xl font-bold text-foreground mb-3">
            {isDone ? "Topic Completed!" : "Finished reading?"}
          </h3>
          <p className="text-muted-foreground mb-6">
            {isDone 
              ? "Great work! Move on to the next topic or review anytime." 
              : "Mark this topic as complete to track your progress."
            }
          </p>
          {user && (
            <Button
              onClick={handleToggleDone}
              disabled={loading}
              className={cn(
                "notes-completion-btn",
                isDone && "complete"
              )}
            >
              {isDone ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Completed
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Mark as Complete
                </>
              )}
            </Button>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between gap-4">
          {prevTopic ? (
            <Button
              variant="ghost"
              onClick={() => navigateToTopic(prevTopic)}
              className="gap-2 text-muted-foreground hover:text-foreground flex-1 justify-start h-auto py-4"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <div className="text-left min-w-0">
                <span className="text-xs block opacity-70">Previous</span>
                <span className="font-medium truncate block max-w-[150px]">{prevTopic.title}</span>
              </div>
            </Button>
          ) : (
            <div className="flex-1" />
          )}
          
          {nextTopic && (
            <Button
              onClick={() => navigateToTopic(nextTopic)}
              className="gap-2 flex-1 justify-end h-auto py-4 notes-completion-btn"
            >
              <div className="text-right min-w-0">
                <span className="text-xs block opacity-80">Next</span>
                <span className="font-medium truncate block max-w-[150px]">{nextTopic.title}</span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          )}
        </div>
      </div>

      {/* Sticky Table of Contents Sidebar */}
        <div className="hidden xl:block w-[300px] shrink-0 sticky top-24 self-start">
          <div className="p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Table of Contents</h3>
            <ul className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
              {contentBlocks.map((block, idx) => {
                const isActive = activeBlockId === `block-${idx}`;
                return (
                  <li key={idx} className="relative z-10 transition-transform hover:translate-x-1">
                    <a 
                      href={`#block-${idx}`} 
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`block-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={cn(
                        "flex items-center gap-4 font-medium transition-all group",
                        isActive ? "text-[15px] text-foreground translate-x-1" : "text-sm text-foreground/60 hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-background border-[3px] transition-all shrink-0",
                        isActive 
                          ? ((currentSubject as string) === 'english' ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]")
                          : "border-muted-foreground/30 group-hover:border-primary/50"
                      )} />
                      <span className={cn(
                        "truncate",
                        isActive && "font-black"
                      )}>{block.title}</span>
                    </a>
                  </li>
                );
              })}
              {practiceQuestions.length > 0 && (
                <li className="relative z-10 pt-4 mt-2 border-t border-border/50 transition-transform hover:translate-x-1">
                  <a 
                    href="#practice-questions" 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('practice-questions')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "flex items-center gap-4 text-[15px] font-bold transition-all group",
                      activeBlockId === 'practice-questions' 
                        ? "text-violet-600 translate-x-1" 
                        : "text-violet-600/60 hover:text-violet-500"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-background border-[3px] transition-all shrink-0",
                      activeBlockId === 'practice-questions'
                        ? "border-violet-600 shadow-[0_0_10px_rgba(124,58,237,0.4)]"
                        : "border-violet-500/30 group-hover:border-violet-500"
                    )} />
                    <span className={cn(
                      "truncate",
                      activeBlockId === 'practice-questions' && "font-black"
                    )}>Practice Questions</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
