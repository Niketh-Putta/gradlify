import React, { Fragment, type ReactNode, useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, BookOpen, Clock, ChevronRight, CheckCircle, ChevronDown, Lightbulb, AlertTriangle, Target, FileText, Zap, HelpCircle, PenLine, Eye, EyeOff } from "lucide-react";
import notesData from "@/data/edexcel_gcse_notes.json";
import elevenPlusNotesData from "@/data/eleven_plus_notes.json";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/hooks/useAppContext";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { getInteractiveDiagram } from "@/components/revision-diagrams/InteractiveDiagrams";
import MathText from "@/components/MathText";
import { statisticsPracticeQuestions } from "@/data/statisticsPracticeQuestions";
import { ratioPracticeQuestions } from "@/data/ratioPracticeQuestions";
import { geometryPracticeQuestions } from "@/data/geometryPracticeQuestions";
import { replaceExamBoardReferences } from "@/lib/examBoard";
import { resolveUserTrack } from "@/lib/track";
import { getTrackSections } from "@/lib/trackCurriculum";

const statisticsExtraInlineImages: Record<string, string> = {
  "frequency-tables": "![Finding the median class using cumulative frequency](/notes-diagrams/statistics/frequency-cf-median-class.svg)",
  "box-plots-cumulative-frequency": "![Interquartile range (IQR) highlighted on a box plot](/notes-diagrams/statistics/boxplot-iqr-highlight.svg)",
  "histograms": "![Histogram: area equals frequency](/notes-diagrams/statistics/histogram-area-frequency.svg)",
  "scatter-graphs": "![Interpolation vs extrapolation on a scatter graph](/notes-diagrams/statistics/scatter-interp-extrap.svg)",
  "pie-charts": "![Pie chart check: angles sum to 360°](/notes-diagrams/statistics/pie-360-check.svg)",
  "comparing-distributions": "![Outliers affect the mean more than the median](/notes-diagrams/statistics/compare-outlier-mean-median.svg)",
  "sampling": "![Sampling bias: quick examples](/notes-diagrams/statistics/sampling-bias-examples.svg)",
};

function injectStatisticsExtraInlineImage(md: string, slug?: string) {
  if (!slug) return md;
  const extra = statisticsExtraInlineImages[slug];
  if (!extra) return md;

  const firstImage = md.match(/!\[[^\]]*\]\([^)]+\)/);
  if (firstImage?.[0]) {
    return md.replace(firstImage[0], `${firstImage[0]}\n\n${extra}`);
  }

  return `${md}\n\n${extra}`;
}

// Allow a small, safe subset of HTML in notes markdown.
// This primarily enables <details>/<summary> for inline learning-point dropdowns.
const notesSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "details", "summary", "u", "div", "span", "table", "thead", "tbody", "tr", "th", "td", "b", "i", "strong", "em"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] || []), "className", "style"],
    details: [...((defaultSchema.attributes as any)?.details || []), "open"],
    div: ["className", "style"],
    span: ["className", "style"],
    table: ["className", "style"],
    td: ["className", "style", "rowspan", "colspan"],
    th: ["className", "style", "rowspan", "colspan"],
  },
} as const;


const BlockVisual = ({ title }: { title: string }) => {
  const normTitle = title.toLowerCase();


  if (normTitle.includes("hcf and lcm")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-indigo-500/20 bg-indigo-50/50 shadow-xl overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-4 flex items-center justify-center gap-2 text-indigo-700 uppercase tracking-widest">
          <Target className="h-4 w-4 text-indigo-500" />
          The Venn Method (LCM & HCF)
        </h3>
        <div className="relative flex justify-center py-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-[70%] -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full border-[3px] border-blue-500 bg-blue-500/10 mix-blend-multiply flex items-center justify-start pl-6 md:pl-8">
            <div className="flex flex-col gap-2">
               <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-background border border-blue-200 shadow-sm flex items-center justify-center font-bold text-blue-700 text-xs text-center leading-none">2</span>
               <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-background border border-blue-200 shadow-sm flex items-center justify-center font-bold text-blue-700 text-xs text-center leading-none">2</span>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-[30%] -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 rounded-full border-[3px] border-emerald-500 bg-emerald-500/10 mix-blend-multiply flex items-center justify-end pr-6 md:pr-8">
            <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-background border border-emerald-200 shadow-sm flex items-center justify-center font-bold text-emerald-700 text-xs text-center leading-none">5</span>
          </div>
          <div className="relative z-10 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
            <span className="w-6 h-6 md:w-8 md:h-8 rounded-full shadow-lg border-2 border-indigo-400 bg-white flex items-center justify-center font-black text-indigo-600 z-20">3</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center relative z-20">
          <div className="p-3 bg-white/80 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm">
            <div className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-1">HCF (Middle)</div>
            <div className="text-lg md:text-xl font-black text-indigo-600">3</div>
          </div>
          <div className="p-3 bg-white/80 backdrop-blur rounded-2xl border border-indigo-100 shadow-sm">
            <div className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-indigo-400 mb-1">LCM (All)</div>
            <div className="text-lg md:text-xl font-black text-indigo-600"><span className="text-xs font-bold text-indigo-400 block md:inline md:mr-1">2×2×3×5 = </span>60</div>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("fdp connection")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-rose-500/20 bg-rose-50/50 shadow-xl overflow-hidden relative group text-center">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-rose-700 uppercase tracking-widest">
          <Zap className="h-4 w-4 text-rose-500" />
          The F.D.P Connection
        </h3>
        <div className="flex items-center justify-center gap-2 md:gap-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white border border-rose-200 shadow flex items-center justify-center font-black text-base md:text-xl text-rose-600 flex-col leading-none">
                <span className="border-b-2 border-rose-600 w-6 md:w-8 text-center pb-0.5">1</span>
                <span className="pt-0.5">4</span>
             </div>
             <div className="mt-3 text-[8px] md:text-[10px] uppercase font-black text-rose-400">Fraction</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-rose-400 gap-1 pb-6">
             <ArrowRight className="h-4 w-4" />
             <span className="text-[8px] md:text-[9px] font-black uppercase text-center bg-rose-100 px-1 md:px-2 py-0.5 rounded shadow-sm">÷ top by bottom</span>
          </div>
          <div className="flex flex-col items-center">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-rose-500 shadow flex items-center justify-center font-black text-base md:text-xl text-white">
                0.25
             </div>
             <div className="mt-3 text-[8px] md:text-[10px] uppercase font-black text-rose-500">Decimal</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-rose-400 gap-1 pb-6">
             <ArrowRight className="h-4 w-4" />
             <span className="text-[8px] md:text-[9px] font-black uppercase text-center bg-rose-100 px-1 md:px-2 py-0.5 rounded shadow-sm">× 100</span>
          </div>
          <div className="flex flex-col items-center">
             <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-rose-900 shadow flex items-center justify-center font-black text-base md:text-xl text-white">
                25<span className="text-[10px] md:text-sm ml-0.5">%</span>
             </div>
             <div className="mt-3 text-[8px] md:text-[10px] uppercase font-black text-rose-800">Percentage</div>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("function machine")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-50 to-emerald-50 shadow-xl relative overflow-hidden text-center">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-teal-800 uppercase tracking-widest">
          <BookOpen className="h-4 w-4 text-teal-500" />
          The Function Machine
        </h3>
        <div className="flex flex-col items-center justify-center gap-3">
           <div className="flex items-center justify-center w-14 h-14 md:w-20 md:h-20 rounded-full border-4 border-dashed border-teal-300 bg-white shadow font-black text-2xl text-teal-600">
             x
           </div>
           <ArrowRight className="h-6 w-6 text-teal-300 rotate-90" />
           <div className="flex gap-2 p-2 md:p-3 rounded-2xl bg-white border border-teal-200 shadow-md">
              <div className="px-4 py-3 md:px-6 md:py-4 rounded-xl bg-teal-500 text-white font-black text-lg md:text-xl shadow-inner uppercase tracking-wider">
                × 4
              </div>
              <div className="px-4 py-3 md:px-6 md:py-4 rounded-xl bg-rose-400 text-white font-black text-lg md:text-xl shadow-inner uppercase tracking-wider">
                - 7
              </div>
           </div>
           <ArrowRight className="h-6 w-6 text-teal-300 rotate-90" />
           <div className="flex items-center justify-center px-4 md:px-6 h-14 md:h-20 rounded-2xl border-4 border-teal-500 bg-white shadow-lg font-black text-xl md:text-2xl text-teal-800 tracking-wider">
             4x - 7
           </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("balance method")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-sky-500/30 bg-sky-50 shadow-xl overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-sky-800 uppercase tracking-widest">
          <Target className="h-4 w-4 text-sky-500" />
          The Balance Method
        </h3>
        <div className="flex justify-center items-end px-2 pt-4 pb-4 h-32 md:h-40">
           <div className="relative w-full max-w-md border-b-[6px] border-sky-400 flex justify-between rounded-full">
              <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-0 h-0 border-l-[16px] border-r-[16px] border-b-[24px] border-l-transparent border-r-transparent border-b-sky-400" />
              <div className="absolute left-1/2 bottom-5 -translate-x-1/2 text-xl md:text-2xl font-black text-sky-500 bg-sky-50 px-2">=</div>
              
              <div className="flex gap-2 items-end pb-1.5 pl-2 md:pl-8">
                 <div className="w-10 h-14 md:w-12 md:h-16 bg-sky-500 rounded flex items-center justify-center shadow-md font-black text-white text-lg">3y</div>
                 <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-400 rounded-full flex items-center justify-center shadow-md font-black text-white text-xs md:text-sm">+5</div>
              </div>
              
              <div className="flex gap-2 items-end pb-1.5 pr-2 md:pr-8">
                 <div className="w-14 h-16 md:w-16 md:h-20 bg-sky-700/80 rounded flex items-center justify-center shadow-md font-black text-white text-xl md:text-2xl">26</div>
              </div>
           </div>
        </div>
        <p className="text-center text-[9px] font-black uppercase text-sky-400 tracking-[0.1em] mt-6">Whatever you do to one side, you must do to the other</p>
      </div>
    );
  }

  if (normTitle.includes("nth term rule")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-50/50 shadow-xl overflow-hidden">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-fuchsia-800 uppercase tracking-widest">
          <Zap className="h-4 w-4 text-fuchsia-500" />
          Nth Term Stepping Stones
        </h3>
        <div className="flex justify-center items-center gap-2 md:gap-4 pb-4">
           {[5, 8, 11, 14].map((num, i, arr) => (
             <Fragment key={i}>
               <div className="flex flex-col items-center">
                 <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-white border-2 border-fuchsia-200 shadow-md flex items-center justify-center font-black text-lg md:text-2xl text-fuchsia-600 transition-transform hover:scale-105">
                   {num}
                 </div>
                 <span className="mt-2 text-[8px] md:text-[9px] font-black uppercase text-fuchsia-400 bg-white px-2 py-0.5 rounded-full border border-fuchsia-100">
                   n={i+1}
                 </span>
               </div>
               {i < arr.length - 1 && (
                 <div className="flex flex-col items-center justify-center -mt-6">
                    <div className="text-[9px] md:text-[10px] font-black text-white bg-fuchsia-400 px-1.5 md:px-2 py-0.5 rounded-full shadow-sm mb-1">
                      +3
                    </div>
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-fuchsia-300" />
                 </div>
               )}
             </Fragment>
           ))}
        </div>
      </div>
    );
  }

  if (normTitle.includes("perimeter and area")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-emerald-500/20 bg-emerald-50/50 shadow-xl overflow-hidden">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-emerald-800 uppercase tracking-widest">
          <BookOpen className="h-4 w-4 text-emerald-500" />
          The Dimensions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-emerald-100 text-center">
             <div className="w-20 h-20 border-4 border-dashed border-emerald-500 rounded-lg mb-4 flex items-center justify-center text-emerald-600/30 font-black text-xs">Path</div>
             <h4 className="font-black text-emerald-700 uppercase tracking-widest">Perimeter</h4>
             <span className="text-[10px] text-muted-foreground font-bold mt-1">1D (cm) : Outside</span>
           </div>
           <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-emerald-100 text-center">
             <div className="w-20 h-20 border-4 border-emerald-400 bg-emerald-400/20 rounded-lg mb-4 flex items-center justify-center text-emerald-600 font-black text-xs">Surface</div>
             <h4 className="font-black text-emerald-700 uppercase tracking-widest">Area</h4>
             <span className="text-[10px] text-muted-foreground font-bold mt-1">2D (cm²) : Inside</span>
           </div>
           <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-emerald-100 text-center">
             <div className="relative w-24 h-20 mb-4 flex items-center justify-center">
                <div className="absolute w-16 h-16 bg-emerald-500/40 border-2 border-emerald-500 rounded right-2 top-0" />
                <div className="absolute w-16 h-16 bg-emerald-400/80 border-2 border-emerald-600 rounded left-2 bottom-0 flex items-center justify-center text-white font-black text-[10px]">Space</div>
                <svg className="absolute w-full h-full" style={{ pointerEvents: 'none' }}>
                  <line x1="26" y1="16" x2="42" y2="0" stroke="currentColor" className="text-emerald-700" strokeWidth="2" />
                  <line x1="90" y1="16" x2="106" y2="0" stroke="currentColor" className="text-emerald-700" strokeWidth="2" />
                  <line x1="90" y1="80" x2="106" y2="64" stroke="currentColor" className="text-emerald-700" strokeWidth="2" />
                </svg>
             </div>
             <h4 className="font-black text-emerald-700 uppercase tracking-widest">Volume</h4>
             <span className="text-[10px] text-muted-foreground font-bold mt-1">3D (cm³) : Space</span>
           </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("speed, distance, time")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-orange-500/20 bg-orange-50/50 shadow-xl overflow-hidden text-center">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-orange-800 uppercase tracking-widest">
          <Clock className="h-4 w-4 text-orange-500" />
          The Formula Triangle
        </h3>
        <div className="relative flex justify-center py-4">
           <svg width="140" height="120" viewBox="0 0 200 173" className="drop-shadow-xl text-orange-500">
             <path d="M 100 0 L 200 173 L 0 173 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
             <line x1="28" y1="115" x2="172" y2="115" stroke="currentColor" strokeWidth="5" />
             <line x1="100" y1="115" x2="100" y2="173" stroke="currentColor" strokeWidth="5" />
             <text x="100" y="80" textAnchor="middle" fill="currentColor" fontSize="40" fontWeight="900">D</text>
             <text x="50" y="160" textAnchor="middle" fill="currentColor" fontSize="40" fontWeight="900">S</text>
             <text x="150" y="160" textAnchor="middle" fill="currentColor" fontSize="40" fontWeight="900">T</text>
           </svg>
        </div>
        <p className="mt-2 text-[9px] font-black justify-center items-center flex gap-4 uppercase text-orange-400 tracking-widest">
           <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Multiply</span>
           <span className="flex items-center gap-1 flex-col justify-center h-4 w-4">÷<br/></span> Divide
        </p>
      </div>
    );
  }

  if (normTitle.includes("coordinates (the grid)")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-cyan-500/20 bg-cyan-50/50 shadow-xl overflow-hidden flex flex-col items-center">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-cyan-800 uppercase tracking-widest">
          <Target className="h-4 w-4 text-cyan-500" />
          The 4 Quadrants
        </h3>
        <div className="relative w-48 h-48 bg-white border-2 border-cyan-200 rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-4 gap-1">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-cyan-500" />
          <div className="absolute top-0 left-1/2 w-[2px] h-full bg-cyan-500" />
          
          <div className="flex items-center justify-center text-cyan-600/50 font-black text-lg z-10">(-x, y)</div>
          <div className="flex items-center justify-center text-cyan-600/50 font-black text-lg z-10">(x, y)</div>
          <div className="flex items-center justify-center text-cyan-600/50 font-black text-lg z-10">(-x, -y)</div>
          <div className="flex items-center justify-center text-cyan-600/50 font-black text-lg z-10">(x, -y)</div>
          
          <div className="absolute top-1/2 -mt-4 -right-4 text-[10px] font-black text-cyan-700">x</div>
          <div className="absolute left-1/2 -ml-1 -top-4 text-[10px] font-black text-cyan-700">y</div>
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan-600 rounded-full -ml-1 -mt-1 shadow" />
        </div>
      </div>
    );
  }

  if (normTitle.includes("probability scale")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-amber-500/20 bg-amber-50/50 shadow-xl overflow-hidden">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-amber-800 uppercase tracking-widest">
          <CheckCircle className="h-4 w-4 text-amber-500" />
          The Probability Scale
        </h3>
        <div className="relative px-2 pt-4 pb-8">
           <div className="h-3 md:h-4 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 shadow-inner" />
           <div className="absolute top-0 left-2 bottom-0 w-1 bg-white/50" />
           <div className="absolute top-0 left-1/2 -translate-x-1/2 bottom-0 w-1 bg-white/50" />
           <div className="absolute top-0 right-2 bottom-0 w-1 bg-white/50" />
           <div className="flex justify-between mt-3 px-0 text-center relative -ml-4 -mr-4">
             <div className="flex flex-col flex-1 items-start pl-2">
                <span className="font-black text-rose-600">0</span>
                <span className="text-[8px] md:text-[9px] font-bold uppercase text-muted-foreground mt-1">Impossible</span>
             </div>
             <div className="flex flex-col flex-1 items-center">
                <span className="font-black text-amber-600">0.5 (1/2)</span>
                <span className="text-[8px] md:text-[9px] font-bold uppercase text-muted-foreground mt-1">Evens</span>
             </div>
             <div className="flex flex-col flex-1 items-end pr-2">
                <span className="font-black text-emerald-600">1</span>
                <span className="text-[8px] md:text-[9px] font-bold uppercase text-muted-foreground mt-1">Certain</span>
             </div>
           </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("sharing in a ratio")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-indigo-500/20 bg-indigo-50/50 overflow-hidden shadow-xl group">
        <h3 className="text-[11px] font-black mb-4 flex items-center gap-2 text-indigo-700 uppercase tracking-[0.1em]">
          <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-600 shadow-sm"><PenLine className="h-3 w-3" /></span>
          Ratio Bar Model
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-[9px] md:text-[10px] font-bold w-12 md:w-16 text-muted-foreground uppercase leading-tight">Friend A<br/>(2)</div>
            <div className="flex-1 flex gap-1 h-8 md:h-10">
              <div className="flex-1 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">£10</div>
              <div className="flex-1 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">£10</div>
            </div>
            <div className="text-sm font-black text-indigo-600">£20</div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-[9px] md:text-[10px] font-bold w-12 md:w-16 text-muted-foreground uppercase leading-tight">Friend B<br/>(3)</div>
            <div className="flex-1 flex gap-1 h-8 md:h-10">
              <div className="flex-1 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">£10</div>
              <div className="flex-1 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">£10</div>
              <div className="flex-1 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">£10</div>
            </div>
            <div className="text-sm font-black text-blue-600">£30</div>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("equivalent fraction") || normTitle.includes("anatomy of a fraction")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-blue-500/20 bg-blue-50/50 shadow-xl overflow-hidden relative">
        <h3 className="text-[11px] font-black mb-4 flex items-center justify-center gap-2 text-blue-700 uppercase tracking-widest">
          Equivalent Fraction Wall
        </h3>
        <div className="space-y-1 md:space-y-2">
          <div className="h-8 md:h-10 w-full bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">1 WHOLE</div>
          <div className="grid grid-cols-2 gap-1 h-8 md:h-10">
            {[1, 2].map(i => <div key={i} className="bg-blue-500/90 rounded flex items-center justify-center text-white text-xs font-bold border border-white/10">1/2</div>)}
          </div>
          <div className="grid grid-cols-3 gap-1 h-8 md:h-10">
            {[1, 2, 3].map(i => <div key={i} className="bg-blue-400 rounded flex items-center justify-center text-white text-[10px] font-bold border border-white/10">1/3</div>)}
          </div>
          <div className="grid grid-cols-4 gap-1 h-8 md:h-10">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-blue-300 rounded flex items-center justify-center text-blue-900 text-[10px] font-bold border border-blue-900/10">1/4</div>)}
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("2d shapes") || normTitle.includes("properties of shapes")) {
    return (
      <div className="my-4 grid grid-cols-2 gap-3">
        {[
          { name: 'Triangle', sides: 3, d: "M 20 80 L 50 20 L 80 80 Z", color: 'text-orange-500' },
          { name: 'Square', sides: 4, d: "M 25 25 H 75 V 75 H 25 Z", color: 'text-blue-500' },
          { name: 'Pentagon', sides: 5, d: "M 50 15 L 85 41 L 71 83 L 29 83 L 15 41 Z", color: 'text-emerald-500' },
          { name: 'Hexagon', sides: 6, d: "M 50 10 L 85 30 V 70 L 50 90 L 15 70 V 30 Z", color: 'text-violet-500' }
        ].map(s => (
          <div key={s.name} className="p-4 rounded-2xl border border-border/40 bg-card flex flex-col items-center shadow-sm">
            <svg width="40" height="40" viewBox="0 0 100 100" className={cn(s.color, "opacity-90")}>
              <path d={s.d} fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="4" />
            </svg>
            <span className="mt-2 text-[9px] font-black uppercase text-foreground/80">{s.name}</span>
          </div>
        ))}
      </div>
    );
  }

  if (normTitle.includes("the 3 m's") || normTitle.includes("averages")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-emerald-500/20 bg-emerald-50/50 shadow-xl overflow-hidden text-center">
        <h3 className="text-[11px] font-black mb-4 flex items-center justify-center gap-2 text-emerald-800 uppercase tracking-widest">
          Data Toolkit (Averages)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'MEAN', sub: 'The Fair Share', icon: 'Σ' },
            { label: 'MEDIAN', sub: 'The Middle', icon: '↔' },
            { label: 'MODE', sub: 'The Most', icon: '★' },
            { label: 'RANGE', sub: 'The Spread', icon: '±' }
          ].map(tool => (
            <div key={tool.label} className="p-3 bg-white rounded-xl border border-emerald-100 shadow-sm flex flex-col items-center">
              <span className="text-emerald-300 text-lg font-black leading-none mb-1">{tool.icon}</span>
              <span className="text-[10px] font-black text-emerald-700 uppercase">{tool.label}</span>
              <span className="text-[8px] text-muted-foreground uppercase">{tool.sub}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (normTitle.includes("decoding word problems") || normTitle.includes("rucsac")) {
    return (
      <div className="my-4 flex flex-col gap-2">
        {"RUCSAC".split("").map((letter, i) => (
          <div key={letter} className="p-3 rounded-2xl border border-border/40 bg-white flex items-center gap-4 shadow-sm">
            <div className={cn(
              "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-black text-white shadow-sm",
              ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'][i]
            )}>
              {letter}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">
              {['Read', 'Understand', 'Choose', 'Solve', 'Answer', 'Check'][i]}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (normTitle.includes("parallel lines") || normTitle.includes("z, f, c")) {
    return (
      <div className="my-4 p-6 rounded-3xl border border-blue-500/20 bg-blue-50/40 shadow-xl overflow-hidden">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-blue-800 uppercase tracking-widest">
          <BookOpen className="h-4 w-4 text-blue-500" />
          Parallel Line Angle Rules
        </h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
            <span className="text-[10px] font-black uppercase text-blue-600 mb-2 tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">Alternate (Z)</span>
            <svg width="150" height="105" viewBox="0 0 200 140" className="text-blue-500 overflow-visible">
              {/* Parallel lines */}
              <line x1="20" y1="40" x2="180" y2="40" stroke="currentColor" strokeWidth="4" />
              <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="4" />
              {/* Arrows */}
              <path d="M 170 35 L 180 40 L 170 45 M 170 95 L 180 100 L 170 105" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              {/* Transversal (140,10) to (60,130) */}
              <line x1="140" y1="10" x2="60" y2="130" stroke="currentColor" strokeWidth="4" />
              
              {/* Z shape highlight (60,40) -> (120,40) -> (80,100) -> (140,100) */}
              <path d="M 60 40 L 120 40 L 80 100 L 140 100" fill="none" stroke="currentColor" strokeWidth="10" className="opacity-20" strokeLinejoin="round" />
              
              {/* Perfect Angle Arcs */}
              {/* Top angle inside Z: V=(120,40). P0=(100,40). P1=(108.9, 56.6). */}
              <path d="M 100 40 Q 120 40 108.9 56.6" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500" />
              {/* Bottom angle inside Z: V=(80,100). P0=(100,100). P1=(91.1, 83.4). */}
              <path d="M 100 100 Q 80 100 91.1 83.4" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500" />
            </svg>
            <span className="text-[9px] font-black text-amber-600 mt-2 uppercase">Always Equal</span>
          </div>

          <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
            <span className="text-[10px] font-black uppercase text-blue-600 mb-2 tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">Corresponding (F)</span>
            <svg width="150" height="105" viewBox="0 0 200 140" className="text-blue-500 overflow-visible">
              <line x1="20" y1="40" x2="180" y2="40" stroke="currentColor" strokeWidth="4" />
              <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="4" />
              <path d="M 170 35 L 180 40 L 170 45 M 170 95 L 180 100 L 170 105" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              {/* Transversal (60,10) to (140,130) */}
              <line x1="60" y1="10" x2="140" y2="130" stroke="currentColor" strokeWidth="4" />

              {/* F shape highlight (70,25) -> (120,100), branch 1: (80,40)->(140,40), branch 2: (120,100)->(180,100) */}
              <path d="M 70 25 L 120 100 M 80 40 L 140 40 M 120 100 L 180 100" fill="none" stroke="currentColor" strokeWidth="10" className="opacity-20" strokeLinejoin="round" strokeLinecap="round" />

              {/* Top angle: V=(80,40), P0=(100,40), P1=(91.1,56.6) */}
              <path d="M 100 40 Q 80 40 91.1 56.6" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500" />
              {/* Bottom angle: V=(120,100), P0=(140,100), P1=(131.1,116.6) */}
              <path d="M 140 100 Q 120 100 131.1 116.6" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500" />
            </svg>
            <span className="text-[9px] font-black text-emerald-600 mt-2 uppercase">Always Equal</span>
          </div>

          <div className="flex flex-col items-center bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
            <span className="text-[10px] font-black uppercase text-blue-600 mb-2 tracking-widest bg-blue-50 px-2 py-0.5 rounded-full">Co-interior (C)</span>
            <svg width="150" height="105" viewBox="0 0 200 140" className="text-blue-500 overflow-visible">
              <line x1="20" y1="40" x2="180" y2="40" stroke="currentColor" strokeWidth="4" />
              <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="4" />
              <path d="M 170 35 L 180 40 L 170 45 M 170 95 L 180 100 L 170 105" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <line x1="60" y1="10" x2="140" y2="130" stroke="currentColor" strokeWidth="4" />
              
              {/* C shape highlight (130,40) -> (80,40) -> (120,100) -> (170,100) */}
              <path d="M 130 40 L 80 40 L 120 100 L 170 100" fill="none" stroke="currentColor" strokeWidth="10" className="opacity-20" strokeLinejoin="round" />
              
              {/* Top angle: V=(80,40), P0=(100,40), P1=(91.1,56.6) */}
              <path d="M 100 40 Q 80 40 91.1 56.6" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-500" />
              {/* Bottom angle inside C: V=(120,100), P0=(140,100), P1=(108.9,83.4) */}
              <path d="M 140 100 Q 120 100 108.9 83.4" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-500" />
              
              <text x="135" y="75" className="fill-rose-500 text-[14px] font-black">Sum=180°</text>
            </svg>
            <span className="text-[9px] font-black text-rose-600 mt-2 uppercase">Add up to 180°</span>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("architecture of numbers")) {
    return (
      <div className="my-10 p-6 rounded-3xl border-2 border-primary/10 bg-gradient-to-br from-background to-primary/5">
        <h4 className="text-sm font-black mb-6 uppercase tracking-widest text-primary/80">Visualizing Magnitude</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center p-4 bg-background rounded-2xl border border-border shadow-sm">
            <div className="w-16 h-16 bg-blue-600 rounded-lg shadow-lg rotate-12 mb-4" />
            <span className="font-black text-xs uppercase tracking-tighter">1 Unit</span>
            <p className="text-[10px] text-muted-foreground mt-1 text-center font-medium leading-relaxed italic">"The building block of all numbers."</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-primary text-primary-foreground rounded-2xl shadow-xl transform scale-105 border-4 border-background">
            <div className="w-24 h-16 border-2 border-primary-foreground/30 rounded flex items-center justify-center overflow-hidden mb-4 bg-primary-foreground/20">
               {Array.from({length: 10}).map((_, i) => <div key={i} className="w-1.5 h-12 bg-primary-foreground/40 mx-0.5 rounded-full" />)}
            </div>
            <span className="font-black text-xs uppercase tracking-tighter">10 (TEN)</span>
            <p className="text-[10px] text-primary-foreground/80 mt-1 text-center font-medium leading-relaxed italic">"10 units bound together in a single group."</p>
          </div>
          <div className="flex flex-col items-center p-4 bg-background rounded-2xl border border-border shadow-sm">
            <div className="w-20 h-20 border-border border-2 rounded-lg bg-muted flex items-center justify-center mb-4 relative overflow-hidden">
               <div className="grid grid-cols-10 grid-rows-10 w-full h-full p-0.5 gap-0.5">
                  {Array.from({length: 100}).map((_, i) => <div key={i} className="bg-primary/20 rounded-[0.5px]" />)}
               </div>
            </div>
            <span className="font-black text-xs uppercase tracking-tighter">100 (HUNDRED)</span>
            <p className="text-[10px] text-muted-foreground mt-1 text-center font-medium leading-relaxed italic">"A flat plate containing 10 rods."</p>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("stack and fill")) {
    return (
      <div className="my-8 flex justify-center">
        <div className="relative p-6 rounded-2xl border border-primary/20 bg-muted/30 shadow-xl overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary group-hover:w-2 transition-all" />
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between gap-12 tabular-nums">
              <span>0.4<span className="text-primary font-black">00</span></span>
              <span className="text-[9px] text-muted-foreground uppercase font-sans font-bold">Filled to 3dp</span>
            </div>
            <div className="flex justify-between gap-12 tabular-nums">
              <span>0.404</span>
              <span className="text-[9px] text-muted-foreground uppercase font-sans font-bold">Original Max</span>
            </div>
            <div className="flex justify-between gap-12 tabular-nums">
              <span>0.04<span className="text-primary font-black">0</span></span>
              <span className="text-[9px] text-muted-foreground uppercase font-sans font-bold">Filled to 3dp</span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-primary text-[10px] font-black italic">
            <div className="p-1 rounded bg-primary/20"><CheckCircle className="h-3 w-3" /></div>
            ALL NUMBERS NOW HAVE THE SAME LENGTH
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("formal written methods")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-border bg-card shadow-lg flex flex-col md:flex-row gap-8 items-center justify-center">
        <div className="text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-3 tracking-widest leading-none">The Stack</p>
          <div className="font-mono text-xl text-foreground bg-muted p-4 rounded-xl border border-border/50">
            {"  12.50\n+  7.25\n"}
            <div className="h-0.5 bg-foreground/20 my-1" />
            {"  19.75"}
          </div>
        </div>
        <div className="hidden md:block text-muted-foreground/30">
          <ArrowRight className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-[9px] font-bold text-blue-600 uppercase mb-3 tracking-widest leading-none">The Alignment</p>
          <div className="relative">
             <div className="absolute left-[2.4rem] top-0 bottom-0 w-px bg-blue-500/40 border-l border-dashed border-blue-400" />
             <div className="font-mono text-sm leading-8 opacity-40">
               Units . 1/10 1/100
             </div>
             <div className="font-mono text-xl tracking-widest">
                12 . 50<br/>
                07 . 25
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("bidmas") || normTitle.includes("order of operations")) {
    return (
      <div className="my-8 flex justify-center">
        <div className="p-1 rounded-3xl bg-gradient-to-b from-violet-500 via-purple-500 to-indigo-600 shadow-xl">
          <div className="bg-background/95 backdrop-blur-sm rounded-[22px] p-6 text-center">
            <h4 className="text-sm font-black text-purple-600 uppercase tracking-[0.2em] mb-6">The Hierarchy of Operations</h4>
            <div className="space-y-3">
              {[
                { l: 'B', n: 'Brackets', c: 'bg-violet-500' },
                { l: 'I', n: 'Indices', c: 'bg-indigo-500' },
                { l: 'DM', n: 'Division / Mult', c: 'bg-blue-500' },
                { l: 'AS', n: 'Addition / Sub', c: 'bg-sky-400' }
              ].map((step, i) => (
                <div key={step.l} className="flex items-center gap-3 group">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-black/5 group-hover:scale-110 transition-transform", step.c)}>
                    {step.l}
                  </div>
                  <div className="flex-1 text-left py-2 px-4 rounded-xl border border-border/50 bg-muted/30 font-bold text-xs group-hover:bg-muted/50 transition-colors">
                    {step.n}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("prime") || normTitle.includes("factor tree")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-border bg-card shadow-lg flex flex-col items-center">
        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-6 tracking-widest">Visual Factorization (Prime Tree)</p>
        <div className="relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-muted border-2 border-border flex items-center justify-center font-black text-lg">24</div>
          <div className="h-6 w-24 border-x-2 border-t-2 border-border rounded-t-lg mt-0.5" />
          <div className="flex gap-16 -mt-0.5">
             <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center font-black">2</div>
                <span className="text-[8px] font-black text-emerald-600 uppercase mt-1">Prime</span>
             </div>
             <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-muted border-2 border-border flex items-center justify-center font-black">12</div>
                <div className="h-4 w-12 border-x border-t border-border mt-0.5" />
                <div className="flex gap-6">
                   <div className="w-8 h-8 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center font-black text-xs">2</div>
                   <div className="w-8 h-8 rounded-2xl bg-muted border-2 border-border flex items-center justify-center font-black text-xs">6</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("rounding")) {
    return (
      <div className="my-8 p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <h4 className="text-xs font-black text-amber-700 uppercase mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          The Rounding Rule
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background border border-amber-200/50 shadow-sm">
             <div className="text-2xl font-black text-amber-600 mb-1">0 - 4</div>
             <p className="text-xs font-bold text-muted-foreground">Keep it the same.</p>
             <p className="text-[10px] italic mt-2">Example: 42 rounds to 40</p>
          </div>
          <div className="p-4 rounded-xl bg-background border border-amber-200/50 shadow-sm">
             <div className="text-2xl font-black text-amber-600 mb-1">5 - 9</div>
             <p className="text-xs font-bold text-muted-foreground">Round UP.</p>
             <p className="text-[10px] italic mt-2">Example: 45 rounds to 50</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

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

const sectionDisplayName: Record<string, string> = {
  "Ratio, Proportion & Rates of Change": "Ratio & Proportion",
};

// Section config with proper GCSE codes - matching exact JSON keys
const sectionConfig: Record<string, { abbr: string; color: string; gradient: string }> = {
  "Number": { abbr: "N", color: "hsl(262 83% 58%)", gradient: "from-purple-500 to-purple-600" },
  "Algebra": { abbr: "A", color: "hsl(221 83% 53%)", gradient: "from-blue-500 to-blue-600" },
  "Ratio, Proportion & Rates of Change": { abbr: "R", color: "hsl(142 76% 36%)", gradient: "from-emerald-500 to-emerald-600" },
  "Geometry & Measures": { abbr: "G", color: "hsl(280 70% 50%)", gradient: "from-violet-500 to-violet-600" },
  "Probability": { abbr: "P", color: "hsl(43 96% 56%)", gradient: "from-amber-500 to-amber-600" },
  "Statistics": { abbr: "S", color: "hsl(199 89% 48%)", gradient: "from-cyan-500 to-cyan-600" },
  "Number & Arithmetic": { abbr: "N", color: "hsl(221 83% 53%)", gradient: "from-blue-500 to-blue-600" },
  "Algebra & Ratio": { abbr: "A", color: "hsl(330 81% 60%)", gradient: "from-pink-500 to-pink-600" },
  "Statistics & Data": { abbr: "S", color: "hsl(174 72% 42%)", gradient: "from-teal-500 to-cyan-500" },
  "Exam Preparation": { abbr: "E", color: "hsl(199 89% 48%)", gradient: "from-sky-500 to-blue-500" },
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
    icon: <Lightbulb className="h-5 w-5" />, 
    color: "text-purple-400",
    bgClass: "bg-gradient-to-br from-purple-500/15 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
    borderClass: "border-purple-500/40 border-l-4 border-l-purple-500",
    headerClass: "bg-purple-500/10",
    priority: 'high'
  },
  example: { 
    icon: <FileText className="h-5 w-5" />, 
    color: "text-amber-400",
    bgClass: "bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-500/15 dark:to-amber-600/5",
    borderClass: "border-amber-500/40 border-l-4 border-l-amber-500",
    headerClass: "bg-amber-500/10",
    priority: 'medium'
  },
  mistakes: { 
    icon: <AlertTriangle className="h-5 w-5" />, 
    color: "text-rose-400",
    bgClass: "bg-gradient-to-br from-rose-500/15 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/10",
    borderClass: "border-rose-500/50 border-l-4 border-l-rose-500 ring-1 ring-rose-500/20",
    headerClass: "bg-rose-500/15",
    priority: 'high'
  },
  tips: { 
    icon: <Target className="h-5 w-5" />, 
    color: "text-emerald-400",
    bgClass: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/10",
    borderClass: "border-emerald-500/50 border-l-4 border-l-emerald-500 ring-1 ring-emerald-500/20",
    headerClass: "bg-emerald-500/15",
    priority: 'high'
  },
  summary: { 
    icon: <Zap className="h-5 w-5" />, 
    color: "text-cyan-400",
    bgClass: "bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/15 dark:to-cyan-600/5",
    borderClass: "border-cyan-500/30",
    headerClass: "bg-cyan-500/5",
    priority: 'medium'
  },
  formula: { 
    icon: <FileText className="h-5 w-5" />, 
    color: "text-blue-400",
    bgClass: "bg-gradient-to-br from-blue-500/15 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/10",
    borderClass: "border-blue-500/40 border-l-4 border-l-blue-500",
    headerClass: "bg-blue-500/10",
    priority: 'high'
  },
  checks: { 
    icon: <HelpCircle className="h-5 w-5" />, 
    color: "text-violet-400",
    bgClass: "bg-gradient-to-br from-violet-500/10 to-violet-600/5 dark:from-violet-500/15 dark:to-violet-600/5",
    borderClass: "border-violet-500/30",
    headerClass: "bg-violet-500/5",
    priority: 'low'
  },
  info: { 
    icon: <BookOpen className="h-5 w-5" />, 
    color: "text-primary",
    bgClass: "bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10",
    borderClass: "border-primary/30 border-l-4 border-l-primary",
    headerClass: "bg-primary/10",
    priority: 'low'
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
      else if (title.includes('Quick Checks') || title.includes('Knowledge Check') || title.includes('Practice Questions'))
        type = 'checks';
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

function NotesMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, notesSanitizeSchema], rehypeKatex]}
      components={{
        p: ({ children }) => (
          <p className="mb-4 text-foreground/90 leading-relaxed text-[15px]">{renderTextWithMath(children)}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{renderTextWithMath(children)}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/80 not-italic font-medium">{renderTextWithMath(children)}</em>
        ),
        ul: ({ children }) => (
          <ul className="space-y-3 mb-5 ml-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="space-y-3 mb-5 list-decimal list-outside ml-5">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed text-foreground/85 relative pl-4 before:absolute before:left-0 before:top-2.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-50">
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
          <h3 className="text-base font-bold text-foreground mt-5 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary/60 rounded-full"></span>
            {renderTextWithMath(children)}
          </h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/40 pl-4 py-2 my-4 bg-primary/5 rounded-r-lg italic text-foreground/80">
            {renderTextWithMath(children)}
          </blockquote>
        ),
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
    >
      {children}
    </ReactMarkdown>
  );
}


const blockVisualKeys = [
  "architecture of numbers",
  "stack and fill",
  "formal written methods",
  "bidmas", "order of operations",
  "factor tree", "prime factor",
  "rounding rule", "rounding",
  "anatomy of a fraction",
  "sharing in a ratio",
  "2d shapes", "properties of shapes",
  "averages", "the 3 m's",
  "rucsac", "decoding word problems",
  "parallel lines", "z, f, c",
  "hcf and lcm",
  "fdp connection",
  "function machine",
  "balance method",
  "nth term rule",
  "perimeter and area",
  "speed, distance, time",
  "coordinates (the grid)",
  "probability scale"
];

const hasBlockVisual = (title: string) => {
  const norm = title.toLowerCase();
  return blockVisualKeys.some(k => norm.includes(k));
};

export default function RevisionNotesTopic() {

  const { section, topic: topicSlug } = useParams<{ section: string; topic: string }>();
  const { user, profile } = useAppContext();
  const examBoardValue = (profile?.onboarding as any)?.examBoard;
  const navigate = useNavigate();
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const decodedSection = section ? decodeURIComponent(section) : "";
  const userTrack = resolveUserTrack(profile?.track ?? null);
  const isElevenPlus = userTrack === "11plus";
  const trackSections = getTrackSections(userTrack);
  const topics = useMemo(() => {
    if (isElevenPlus) {
      const sectionMeta = trackSections.find((item) => item.label === decodedSection);
      const authoredTopics = typedElevenPlusNotesData[decodedSection] || [];
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
  }, [decodedSection, examBoardValue, isElevenPlus, trackSections]);
  const currentTopic = topics.find((t) => t.slug === topicSlug);
  const currentIndex = topics.findIndex((t) => t.slug === topicSlug);
  const fallbackAbbr = decodedSection.trim().charAt(0).toUpperCase() || "N";
  const config =
    sectionConfig[decodedSection] ||
    { abbr: fallbackAbbr, color: "hsl(262 83% 58%)", gradient: "from-purple-500 to-purple-600" };
  const sectionTitle = sectionDisplayName[decodedSection] || decodedSection;

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

    if (decodedSection === "Statistics") {
      cleanedMd = injectStatisticsExtraInlineImage(cleanedMd, currentTopic.slug);
    }

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
  useEffect(() => {
    setExpandedBlocks(new Set(contentBlocks.map((_, idx) => idx)));
  }, [topicSlug, contentBlocks]);

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
      <div className="min-h-screen bg-background">
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
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

        {/* Header */}
        <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
            <div className={cn("px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r", config.gradient)}>
              {config.abbr.toUpperCase()}{currentIndex + 1}
            </div>
            <span className="text-sm text-muted-foreground">
              {sectionTitle}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4 leading-tight">
            {currentTopic.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mb-6">
            {currentTopic.level === "H" && (
              <span className="notes-badge notes-badge-higher">Higher Tier</span>
            )}
            {currentTopic.level === "F/H" && (
              <span className="notes-badge notes-badge-both">Foundation & Higher</span>
            )}
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

        {/* Interactive Diagram Section for GCSE */}
        {currentTopic.level !== "11+" && getInteractiveDiagram(topicSlug || "") && (
          <div className="mb-10 group transition-all duration-500">
            {getInteractiveDiagram(topicSlug || "")}
          </div>
        )}

        {/* Content Blocks */}
        <div className="space-y-5 mb-10">
          {contentBlocks.map((block, index) => {
            const blockStyle = blockConfig[block.type] || blockConfig.info;
            const isHighPriority = blockStyle.priority === 'high';
            
            return (
              <div 
                key={index}
                className={cn(
                  "notes-block-card rounded-2xl overflow-hidden transition-all duration-300",
                  blockStyle.bgClass,
                  blockStyle.borderClass,
                  isHighPriority && "shadow-lg"
                )}
              >
                <button
                  onClick={() => toggleBlock(index)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 text-left transition-colors",
                    blockStyle.headerClass,
                    "hover:bg-white/5 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      blockStyle.color,
                      isHighPriority ? "bg-background/80 shadow-sm" : "bg-background/50"
                    )}>
                      {blockStyle.icon}
                    </div>
                    <h2 className={cn(
                      "font-semibold text-foreground",
                      isHighPriority ? "text-lg sm:text-xl" : "text-base sm:text-lg"
                    )}>
                      {block.title}
                    </h2>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-300 shrink-0",
                      expandedBlocks.has(index) && "rotate-180"
                    )}
                  />
                </button>

                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  // Some topics are long (multiple images + practice prompts). A low max-height here clips content.
                  expandedBlocks.has(index) ? "max-h-[20000px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className={cn(
                    "px-5 pb-5 prose-container",
                    isHighPriority && "pt-2"
                  )}>
                    {currentTopic.level === "11+" && hasBlockVisual(block.title) ? (
                       <div className="flex flex-col lg:flex-row gap-8 items-start">
                          <div className="flex-1 min-w-[50%] w-full">
                             <NotesMarkdown>{block.content}</NotesMarkdown>
                          </div>
                          <div className="w-full lg:w-[45%] lg:sticky lg:top-24 pb-4 shrink-0 overflow-hidden">
                             <BlockVisual title={block.title} />
                          </div>
                       </div>
                    ) : (
                       <NotesMarkdown>{block.content}</NotesMarkdown>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Diagram Section */}
        {decodedSection !== "Statistics" && getInteractiveDiagram(topicSlug || "") && (
          <div className="mb-10">
            {getInteractiveDiagram(topicSlug || "")}
          </div>
        )}

        {/* Practice Questions Section */}
        {practiceQuestions.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <PenLine className="h-5 w-5 text-violet-400" />
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
    </div>
  );
}
