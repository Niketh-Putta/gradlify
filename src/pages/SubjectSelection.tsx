import { useNavigate } from "react-router-dom";
import { useSubject } from "@/contexts/SubjectContext";
import { useMembership } from "@/hooks/useMembership";
import { motion } from "framer-motion";
import { BookOpen, Calculator, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubjectSelection() {
  const navigate = useNavigate();
  const { setSubject } = useSubject();
  const { isUltra, isPremium } = useMembership();
  
  const displayTier = isUltra ? 'Ultra' : isPremium ? 'Premium' : 'Free';

  const handleSelect = (subject: 'maths' | 'english') => {
    setSubject(subject);
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative">
      
      {/* Top Right Plan Badge */}
      <div className="sm:absolute sm:top-8 sm:right-8 z-20 mb-10 sm:mb-0">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm text-xs font-bold uppercase tracking-widest transition-all",
          displayTier === 'Ultra' 
            ? "bg-gradient-to-r from-amber-200 to-amber-500 text-slate-900 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
            : displayTier === 'Premium'
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              : "bg-card border-border text-muted-foreground"
        )}>
          {displayTier} Plan
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[900px] relative z-10"
      >
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">
            Select Your Subject
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-medium">
            Choose a curriculum to begin your focused revision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Maths Professional Card */}
          <button
            onClick={() => handleSelect('maths')}
            className="group relative flex flex-col justify-between text-left p-8 sm:p-10 rounded-2xl bg-card border border-border dark:border-blue-500/30 border-t-4 border-t-blue-500/70 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-400 transition-all duration-300"
          >
            <div>
              <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center mb-8 shadow-sm group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Calculator className="w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">Mathematics</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
                Comprehensive curriculum covering advanced number theory, algebraic reasoning, and geometrical patterns.
              </p>
            </div>

            <div className="w-full flex items-center justify-between mt-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-blue-600 transition-colors duration-300">
                Select Subject
              </span>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </button>

          {/* English Professional Card */}
          <button
            onClick={() => handleSelect('english')}
            className="group relative flex flex-col justify-between text-left p-8 sm:p-10 rounded-2xl bg-card border border-border dark:border-amber-500/30 border-t-4 border-t-amber-500/70 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-400 transition-all duration-300"
          >
            <div>
              <div className="w-14 h-14 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mb-8 shadow-sm group-hover:bg-amber-500 group-hover:border-amber-500 transition-all duration-300">
                <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-400 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
              </div>
              
              <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">English</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
                Advanced curriculum covering extensive vocabulary, reading comprehension, and critical literary analysis.
              </p>
            </div>

            <div className="w-full flex items-center justify-between mt-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground group-hover:text-amber-600 transition-colors duration-300">
                Select Subject
              </span>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
