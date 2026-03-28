import { Fragment } from "react";
import { Target, Zap, BookOpen, ArrowRight, PenLine, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const blockVisualKeys = [
  "long division", "multiplying fractions", "volume of a cuboid", "parts of a circle", "interpreting data",
  "reflections", "translations", "compass points", "adding and subtracting fractions",
  "reading scales", "parts of a pie chart", "adding and subtracting fractions", "the midpoint trick", "types of angles",
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

export const hasBlockVisual = (title: string) => {
  const norm = title.toLowerCase();
  return blockVisualKeys.some(k => norm.includes(k));
};

export const BlockVisual = ({ title }: { title: string }) => {
  const normTitle = title.toLowerCase();
  

  if (normTitle.includes("types of angles")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-blue-700 uppercase tracking-widest">
          The Angle Protractor
        </h3>
        <div className="relative flex justify-center py-4">
           <svg width="240" height="130" viewBox="0 0 240 130" className="overflow-visible">
             <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-200 dark:text-blue-800" strokeDasharray="4 4" />
             <line x1="20" y1="120" x2="220" y2="120" stroke="currentColor" strokeWidth="2" className="text-blue-300 dark:text-blue-800" />
             <circle cx="120" cy="120" r="4" className="fill-blue-500" />
             
             {/* Acute Angle */}
             <path d="M 120 120 L 190.7 49.3" stroke="currentColor" strokeWidth="4" className="text-emerald-500" strokeLinecap="round" />
             <path d="M 160 120 A 40 40 0 0 0 148.3 91.7" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400" />
             <text x="175" y="90" className="fill-emerald-600 text-[10px] font-black uppercase">Acute (&lt;90°)</text>

             {/* Right Angle */}
             <path d="M 120 120 L 120 20" stroke="currentColor" strokeWidth="3" className="text-blue-400" strokeLinecap="round" strokeDasharray="4 4" />

             {/* Obtuse Angle */}
             <path d="M 120 120 L 35.1 68.2" stroke="currentColor" strokeWidth="4" className="text-rose-500" strokeLinecap="round" />
             <path d="M 120 80 A 40 40 0 0 0 85.8 99.1" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-400" />
             <text x="45" y="60" className="fill-rose-600 text-[10px] font-black uppercase">Obtuse (&gt;90°)</text>
           </svg>
        </div>
      </div>
    );
  }

  if (normTitle.includes("reading scales")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden text-center">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-amber-700 uppercase tracking-widest">
          <Target className="h-4 w-4 text-amber-500" />
          The Gauge Method
        </h3>
        <div className="relative pt-6 pb-2">
           <div className="w-full h-8 bg-amber-500/10 rounded-full border border-amber-500/20 relative shadow-inner overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[44%] bg-gradient-to-r from-amber-400 to-amber-500 shadow-md" />
           </div>
           
           {/* Scale Marks */}
           <div className="w-full flex justify-between mt-2 px-1 relative h-6">
              {[0, 10, 20, 30, 40, 50].map((mark) => (
                 <div key={mark} className="flex flex-col items-center absolute" style={{ left: `${mark * 2}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-0.5 h-2 bg-amber-300 mb-1" />
                    <span className="text-[10px] font-black text-amber-900/60 dark:text-amber-100/60">{mark}</span>
                 </div>
              ))}
              {[5, 15, 25, 35, 45].map((mark) => (
                 <div key={mark} className="flex flex-col items-center absolute" style={{ left: `${mark * 2}%`, transform: 'translateX(-50%)' }}>
                    <div className="w-px h-1 bg-amber-200 mb-1" />
                 </div>
              ))}
           </div>
           
           {/* Pointer */}
           <div className="absolute top-[22px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-rose-500 z-10 filter drop-shadow-md" style={{ left: '44%', transform: 'translateX(-50%) rotate(180deg)' }} />
           
           <div className="mt-8 flex justify-center gap-4 text-left">
              <div className="p-3 bg-white dark:bg-black/20 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30">
                 <div className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">Gap Value</div>
                 <div className="text-xl font-black text-amber-700 dark:text-amber-500">22</div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (normTitle.includes("the midpoint trick")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] relative overflow-hidden text-center">
        <h3 className="text-[11px] font-black mb-8 flex items-center justify-center gap-2 text-indigo-700 uppercase tracking-widest">
          The Decimal Midpoint
        </h3>
        <div className="relative pt-4 pb-8 max-w-sm mx-auto">
           {/* Main Line */}
           <div className="absolute top-8 left-0 w-full h-1 bg-indigo-200 dark:bg-indigo-800 rounded-full" />
           
           {/* Nodes */}
           <div className="absolute top-6 left-0 -translate-x-1/2 flex flex-col items-center group">
              <div className="w-5 h-5 rounded-full bg-white dark:bg-background border-[3px] border-indigo-400 z-10 shadow-sm transition-transform group-hover:scale-125" />
              <div className="mt-2 text-sm font-black text-indigo-900 dark:text-indigo-100">1.4<span className="text-indigo-400 dark:text-indigo-600 transition-opacity opacity-0 group-hover:opacity-100 font-bold">0</span></div>
           </div>
           
           <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center group">
              <div className="w-6 h-6 rounded-full bg-indigo-500 border-[3px] border-white dark:border-background z-20 shadow-md transform scale-110" />
              <div className="mt-2 text-lg font-black text-indigo-600 dark:text-indigo-400">1.45</div>
           </div>
           
           <div className="absolute top-6 right-0 translate-x-1/2 flex flex-col items-center group">
              <div className="w-5 h-5 rounded-full bg-white dark:bg-background border-[3px] border-indigo-400 z-10 shadow-sm transition-transform group-hover:scale-125" />
              <div className="mt-2 text-sm font-black text-indigo-900 dark:text-indigo-100">1.5<span className="text-indigo-400 dark:text-indigo-600 transition-opacity opacity-0 group-hover:opacity-100 font-bold">0</span></div>
           </div>
           
           <div className="absolute top-0 left-1/4 w-1/2 h-16 border-t-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-t-xl opacity-50" />
           <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black text-indigo-500 uppercase bg-white dark:bg-background px-2 py-0.5 rounded-full shadow-sm">+0.05</div>
        </div>
      </div>
    );
  }

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


  if (normTitle.includes("reflections")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-pink-700 uppercase tracking-widest">
          Mirror Reflection
        </h3>
        <div className="relative flex justify-center py-4">
           <svg width="240" height="150" viewBox="0 0 240 150">
             {/* Mirror Line */}
             <line x1="120" y1="10" x2="120" y2="140" stroke="currentColor" strokeWidth="3" className="text-pink-400" strokeDasharray="6 4" />
             <text x="120" y="10" className="fill-pink-500 text-[9px] font-black uppercase text-center" transform="translate(-10, -5)">Mirror Line</text>

             {/* Original Shape */}
             <rect x="40" y="50" width="40" height="40" fill="currentColor" className="text-blue-500" rx="4" />
             <text x="60" y="75" className="fill-white text-[12px] font-bold text-center" alignmentBaseline="middle" textAnchor="middle">A</text>

             {/* Reflection Strings */}
             <line x1="80" y1="50" x2="160" y2="50" stroke="currentColor" strokeWidth="1" className="text-pink-300" strokeDasharray="3 3" />
             <line x1="80" y1="90" x2="160" y2="90" stroke="currentColor" strokeWidth="1" className="text-pink-300" strokeDasharray="3 3" />

             {/* Reflected Shape */}
             <rect x="160" y="50" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500" rx="4" />
             <text x="180" y="75" className="fill-emerald-600 text-[12px] font-bold text-center" alignmentBaseline="middle" textAnchor="middle">A'</text>
             
             {/* Distance Labels */}
             <text x="100" y="45" className="fill-pink-600 text-[8px] font-black uppercase" textAnchor="middle">2 Units</text>
             <text x="140" y="45" className="fill-pink-600 text-[8px] font-black uppercase" textAnchor="middle">2 Units</text>
           </svg>
        </div>
      </div>
    );
  }

  if (normTitle.includes("translations")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-blue-700 uppercase tracking-widest">
          Vector Translation (Slide)
        </h3>
        <div className="relative flex justify-center py-4">
           <svg width="240" height="150" viewBox="0 0 240 150">
             {/* Grid */}
             <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
               <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
             </pattern>
             <rect width="100%" height="100%" fill="url(#grid)" />

             {/* Original Shape */}
             <rect x="20" y="80" width="40" height="40" fill="currentColor" className="text-blue-500" rx="4" />
             <text x="40" y="105" className="fill-white text-[12px] font-bold text-center" alignmentBaseline="middle" textAnchor="middle">A</text>

             {/* Vector Path */}
             <path d="M 60 100 L 140 100 L 140 40" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400" strokeDasharray="4 4" />
             <circle cx="140" cy="40" r="4" className="fill-emerald-500" />
             <polygon points="137,45 143,45 140,38" className="fill-emerald-500" />

             {/* Reflected Shape */}
             <rect x="140" y="20" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500" rx="4" />
             <text x="160" y="45" className="fill-emerald-600 text-[12px] font-bold text-center" alignmentBaseline="middle" textAnchor="middle">A'</text>
             
             {/* Labels */}
             <text x="100" y="115" className="fill-blue-600 text-[10px] font-black uppercase" textAnchor="middle">+4 Right</text>
             <text x="155" y="70" className="fill-blue-600 text-[10px] font-black uppercase" textAnchor="middle">+3 Up</text>
           </svg>
        </div>
      </div>
    );
  }

  if (normTitle.includes("compass points")) {
    return (
       <div className="my-8 p-6 rounded-3xl border border-slate-500/20 bg-gradient-to-br from-slate-50 to-white dark:from-slate-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative text-center">
         <h3 className="text-[11px] font-black mb-6 text-slate-700 uppercase tracking-widest">
           The 8-Point Compass & Bearings
         </h3>
         <div className="relative flex justify-center py-4">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-800" strokeDasharray="2 4" />
              {/* Primary Nav */}
              <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="3" className="text-slate-400" />
              <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="3" className="text-slate-400" />
              {/* Secondary Nav */}
              <line x1="36" y1="36" x2="164" y2="164" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-700" strokeDasharray="4 4" />
              <line x1="36" y1="164" x2="164" y2="36" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-700" strokeDasharray="4 4" />
              
              <polygon points="90,100 110,100 100,20" fill="currentColor" className="text-rose-500" />
              <polygon points="90,100 110,100 100,180" fill="currentColor" className="text-blue-500 text-opacity-30" />

              <text x="100" y="15" className="fill-rose-600 text-[14px] font-black" alignmentBaseline="middle" textAnchor="middle">N</text>
              <text x="100" y="30" className="fill-slate-500 text-[8px] font-bold" alignmentBaseline="middle" textAnchor="middle">000°</text>

              <text x="185" y="100" className="fill-slate-700 dark:fill-slate-300 text-[14px] font-black" alignmentBaseline="middle" textAnchor="middle">E</text>
              <text x="170" y="115" className="fill-slate-500 text-[8px] font-bold" alignmentBaseline="middle" textAnchor="middle">090°</text>

              <text x="100" y="190" className="fill-slate-700 dark:fill-slate-300 text-[14px] font-black" alignmentBaseline="middle" textAnchor="middle">S</text>
              <text x="100" y="170" className="fill-slate-500 text-[8px] font-bold" alignmentBaseline="middle" textAnchor="middle">180°</text>

              <text x="15" y="100" className="fill-slate-700 dark:fill-slate-300 text-[14px] font-black" alignmentBaseline="middle" textAnchor="middle">W</text>
              <text x="30" y="115" className="fill-slate-500 text-[8px] font-bold" alignmentBaseline="middle" textAnchor="middle">270°</text>
            </svg>
         </div>
       </div>
    );
  }

  if (normTitle.includes("adding and subtracting fractions")) {
    return (
       <div className="my-8 p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden text-center">
         <h3 className="text-[11px] font-black mb-8 text-purple-700 uppercase tracking-widest">
           Matching The Base (LCD)
         </h3>
         <div className="flex items-center justify-center gap-4 text-xl font-black text-purple-900/80 dark:text-purple-100/80">
            <div className="flex flex-col items-center">
              <div>1</div><div className="w-full border-t-2 border-current"></div><div>3</div>
            </div>
            <div>+</div>
            <div className="flex flex-col items-center">
              <div>2</div><div className="w-full border-t-2 border-current"></div><div>5</div>
            </div>
            <div>=</div>
            <div className="flex flex-col items-center text-rose-500">
              <div className="text-3xl">?</div>
            </div>
         </div>
         <div className="my-6 w-full border-t border-purple-200 dark:border-purple-800 border-dashed" />
         <div className="flex items-center justify-center gap-4 text-xl font-black text-purple-900 dark:text-purple-100">
            <div className="flex flex-col items-center">
              <div className="text-emerald-600 text-sm">×5</div>
              <div>5</div><div className="w-full border-t-2 border-current"></div><div>15</div>
            </div>
            <div>+</div>
            <div className="flex flex-col items-center">
              <div className="text-emerald-600 text-sm">×3</div>
              <div>6</div><div className="w-full border-t-2 border-current"></div><div>15</div>
            </div>
            <div>=</div>
            <div className="flex flex-col items-center">
              <div className="text-emerald-500">11</div><div className="w-full border-t-2 border-emerald-500"></div><div className="text-emerald-500">15</div>
            </div>
         </div>
         <div className="mt-4 text-[10px] text-purple-600/60 uppercase font-black uppercase tracking-widest">Only merge the top layer. Base remains locked.</div>
       </div>
    );
  }

  if (normTitle.includes("long division") || normTitle.includes("bus stop")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-sky-700 uppercase tracking-widest">
          The Bus Stop Method
        </h3>
        <div className="relative flex justify-center py-4">
           <svg width="240" height="150" viewBox="0 0 240 150" className="font-mono font-black text-2xl">
             {/* The Bus Stop */}
             <path d="M 80,60 L 80,40 L 180,40" fill="none" stroke="currentColor" strokeWidth="4" className="text-sky-500" strokeLinecap="round" strokeLinejoin="round" />
             
             {/* Divisor */}
             <text x="60" y="65" className="fill-sky-700" textAnchor="end">7</text>
             
             {/* Dividend */}
             <text x="100" y="65" className="fill-slate-800 dark:fill-slate-200" textAnchor="middle">8</text>
             <text x="130" y="65" className="fill-slate-800 dark:fill-slate-200" textAnchor="middle">4</text>
             <text x="160" y="65" className="fill-slate-800 dark:fill-slate-200" textAnchor="middle">7</text>

             {/* Remainders */}
             <text x="114" y="50" className="fill-rose-500 text-[10px]" textAnchor="middle">1</text>
             <text x="144" y="50" className="fill-rose-500 text-[10px]" textAnchor="middle">0</text>

             {/* Quotient (Answer) */}
             <text x="100" y="30" className="fill-emerald-600" textAnchor="middle">1</text>
             <text x="130" y="30" className="fill-emerald-600" textAnchor="middle">2</text>
             <text x="160" y="30" className="fill-emerald-600" textAnchor="middle">1</text>
             
             {/* Explanatory arrows/text */}
             <path d="M 100,75 L 100,90 L 114,90 L 114,55" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-400" strokeDasharray="3 3"/>
             <text x="107" y="105" className="fill-sky-600 text-[8px] uppercase tracking-widest font-sans" textAnchor="middle">7 into 8 = 1</text>
             <text x="107" y="115" className="fill-rose-500 text-[8px] uppercase tracking-widest font-sans" textAnchor="middle">Rem 1</text>
           </svg>
        </div>
      </div>
    );
  }

  if (normTitle.includes("multiplying fractions")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-rose-700 uppercase tracking-widest">
          Multiply Across
        </h3>
        <div className="relative flex justify-center py-4">
           <svg width="280" height="120" viewBox="0 0 280 120" className="font-black text-3xl">
             <text x="40" y="50" className="fill-rose-600" textAnchor="middle">2</text>
             <line x1="20" y1="60" x2="60" y2="60" stroke="currentColor" strokeWidth="4" className="text-rose-400" strokeLinecap="round" />
             <text x="40" y="90" className="fill-slate-800 dark:fill-slate-200" textAnchor="middle">3</text>

             <text x="90" y="70" className="fill-slate-400 text-2xl" textAnchor="middle">×</text>

             <text x="140" y="50" className="fill-rose-600" textAnchor="middle">4</text>
             <line x1="120" y1="60" x2="160" y2="60" stroke="currentColor" strokeWidth="4" className="text-rose-400" strokeLinecap="round" />
             <text x="140" y="90" className="fill-slate-800 dark:fill-slate-200" textAnchor="middle">5</text>

             <text x="190" y="70" className="fill-slate-400 text-2xl" textAnchor="middle">=</text>

             <text x="240" y="50" className="fill-emerald-600" textAnchor="middle">8</text>
             <line x1="220" y1="60" x2="260" y2="60" stroke="currentColor" strokeWidth="4" className="text-emerald-500" strokeLinecap="round" />
             <text x="240" y="90" className="fill-emerald-600" textAnchor="middle">15</text>

             {/* Multiply Indicators */}
             <path d="M 65,40 Q 90,20 115,40" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400" strokeDasharray="4 4"/>
             <path d="M 65,85 Q 90,105 115,85" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" strokeDasharray="4 4"/>
             
             <text x="90" y="25" className="fill-rose-600 text-[10px] uppercase font-sans tracking-widest" textAnchor="middle">Top × Top</text>
             <text x="90" y="115" className="fill-slate-500 text-[10px] uppercase font-sans tracking-widest" textAnchor="middle">Bottom × Bottom</text>
           </svg>
        </div>
      </div>
    );
  }

  if (normTitle.includes("volume") || normTitle.includes("cuboid")) {
    return (
      <div className="my-8 p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative group">
        <h3 className="text-[11px] font-black mb-6 flex items-center justify-center gap-2 text-indigo-700 uppercase tracking-widest">
          Volume of a Cuboid
        </h3>
        <div className="relative flex justify-center py-4">
           {/* Isometric projection SVG */}
           <svg width="220" height="160" viewBox="0 0 220 160">
             <polygon points="110,30 180,65 110,100 40,65" fill="hsl(240, 50%, 95%)" stroke="currentColor" strokeWidth="2" className="text-indigo-600" />
             <polygon points="40,65 110,100 110,150 40,115" fill="hsl(240, 50%, 85%)" stroke="currentColor" strokeWidth="2" className="text-indigo-600" />
             <polygon points="110,100 180,65 180,115 110,150" fill="hsl(240, 50%, 75%)" stroke="currentColor" strokeWidth="2" className="text-indigo-600" />

             {/* Dotted hidden lines */}
             <line x1="40" y1="65" x2="110" y2="30" stroke="currentColor" strokeWidth="1" className="text-indigo-300" strokeDasharray="4 4"/>
             <line x1="180" y1="65" x2="110" y2="30" stroke="currentColor" strokeWidth="1" className="text-indigo-300" strokeDasharray="4 4"/>
             <line x1="110" y1="100" x2="110" y2="30" stroke="currentColor" strokeWidth="1" className="text-indigo-300" strokeDasharray="4 4"/>

             {/* Dimension Labels */}
             <text x="65" y="140" className="fill-indigo-700 font-black text-xs" textAnchor="middle">Length</text>
             <text x="155" y="140" className="fill-indigo-700 font-black text-xs" textAnchor="middle">Width</text>
             <text x="195" y="95" className="fill-indigo-700 font-black text-xs" textAnchor="middle">Height</text>
           </svg>
        </div>
        <div className="text-center mt-2 text-indigo-800 dark:text-indigo-300 font-black">
          V = L × W × H
        </div>
      </div>
    );
  }

  if (normTitle.includes("parts of a circle") || normTitle.includes("circle terminology")) {
    return (
       <div className="my-8 p-6 rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden relative text-center">
         <h3 className="text-[11px] font-black mb-6 text-teal-700 uppercase tracking-widest">
           Anatomy of a Circle
         </h3>
         <div className="relative flex justify-center py-4">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="90" fill="hsl(160, 50%, 95%)" stroke="currentColor" strokeWidth="4" className="text-teal-600 opacity-20" />
              {/* Diameter */}
              <line x1="20" y1="110" x2="200" y2="110" stroke="currentColor" strokeWidth="3" className="text-rose-500" />
              {/* Radius */}
              <line x1="110" y1="110" x2="110" y2="20" stroke="currentColor" strokeWidth="3" className="text-indigo-500" />
              {/* Centre */}
              <circle cx="110" cy="110" r="6" fill="currentColor" className="text-slate-800 dark:text-white" />
              {/* Chord */}
              <line x1="46" y1="173" x2="160" y2="184" stroke="currentColor" strokeWidth="3" className="text-amber-500" />
              {/* Circumference Arc highlight */}
              <path d="M 200,110 A 90 90 0 0 1 110,200" fill="none" stroke="currentColor" strokeWidth="5" className="text-teal-500" />

              <text x="160" y="100" className="fill-rose-600 font-black text-[10px] uppercase tracking-wider">Diameter</text>
              <text x="90" y="65" className="fill-indigo-600 font-black text-[10px] uppercase tracking-wider" transform="rotate(-90 90,65)">Radius</text>
              <text x="100" y="195" className="fill-amber-600 font-black text-[10px] uppercase tracking-wider">Chord</text>
              <text x="195" y="170" className="fill-teal-600 font-black text-[10px] uppercase tracking-wider" transform="rotate(-40 195,170)">Arc / Circumference</text>
            </svg>
         </div>
       </div>
    );
  }

  if (normTitle.includes("interpreting data") || normTitle.includes("bar chart")) {
    return (
       <div className="my-8 p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-transparent shadow-[0_8px_30px_rgb(0,0,0,0.04),0_20px_50px_rgb(0,0,0,0.02)] overflow-hidden text-center">
         <h3 className="text-[11px] font-black mb-8 text-amber-700 uppercase tracking-widest">
           Reading a Bar Chart
         </h3>
         <div className="flex justify-center">
           <svg width="240" height="180" viewBox="0 0 240 180">
             {/* Y-Axis scale lines */}
             <line x1="30" y1="30" x2="230" y2="30" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 2" />
             <line x1="30" y1="70" x2="230" y2="70" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 2" />
             <line x1="30" y1="110" x2="230" y2="110" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 2" />

             {/* Y-Axis numbers */}
             <text x="20" y="35" className="fill-slate-500 text-[10px] font-bold" textAnchor="end">15-</text>
             <text x="20" y="75" className="fill-slate-500 text-[10px] font-bold" textAnchor="end">10-</text>
             <text x="20" y="115" className="fill-slate-500 text-[10px] font-bold" textAnchor="end">5-</text>
             <text x="20" y="155" className="fill-slate-500 text-[10px] font-bold" textAnchor="end">0-</text>

             {/* Axes */}
             <path d="M 30,20 L 30,150 L 230,150" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800 dark:text-slate-200" />

             {/* Bars */}
             <rect x="50" y="70" width="30" height="80" fill="currentColor" className="text-amber-400" rx="2" />
             <rect x="110" y="46" width="30" height="104" fill="currentColor" className="text-amber-500" rx="2" />
             <rect x="170" y="110" width="30" height="40" fill="currentColor" className="text-amber-300" rx="2" />

             {/* Bar Values Hidden initially, explicitly pointed out */}
             <path d="M 65,70 L 65,55" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-600" />
             <text x="65" y="50" className="fill-amber-700 text-[12px] font-black" textAnchor="middle">10</text>

             <path d="M 125,46 L 125,31" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-600" />
             <text x="125" y="26" className="fill-amber-700 text-[12px] font-black" textAnchor="middle">13</text>

             <path d="M 185,110 L 185,95" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-600" />
             <text x="185" y="90" className="fill-amber-700 text-[12px] font-black" textAnchor="middle">5</text>

             {/* X-Axis Labels */}
             <text x="65" y="170" className="fill-slate-600 text-[10px] font-black uppercase" textAnchor="middle">Cats</text>
             <text x="125" y="170" className="fill-slate-600 text-[10px] font-black uppercase" textAnchor="middle">Dogs</text>
             <text x="185" y="170" className="fill-slate-600 text-[10px] font-black uppercase" textAnchor="middle">Birds</text>
           </svg>
         </div>
       </div>
    );
  }

  return null;
};
