import { useState } from "react";
import { RightTriangle } from "./RightTriangle";
import { VennDiagram } from "./VennDiagram";
import { NumberLine } from "./NumberLine";
import { Histogram } from "./Histogram";
import { CumulativeFrequencyCurve } from "./CumulativeFrequencyCurve";
import { BoxPlot } from "./BoxPlot";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  Box,
  Circle,
  Divide,
  GitBranch,
  Hash,
  Hexagon,
  LineChart,
  Microscope,
  RectangleHorizontal,
  Ruler,
  TrendingDown,
  TrendingUp,
  Triangle,
  Repeat,
  Target,
} from "lucide-react";

// Pythagoras Interactive Diagram
export function PythagorasInteractive() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const c = Math.sqrt(a * a + b * b);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Triangle className="h-4 w-4" /></span>
        Interactive Pythagoras
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="280" height="200" viewBox="0 0 280 200">
            <polygon
              points={`40,160 ${40 + a * 30},160 40,${160 - b * 30}`}
              fill="none"
              stroke="hsl(262 83% 58%)"
              strokeWidth="3"
            />
            <rect x="40" y={160 - 15} width="15" height="15" fill="none" stroke="hsl(262 83% 58%)" strokeWidth="1.5" />
            <text x={40 + (a * 30) / 2} y="180" textAnchor="middle" className="fill-foreground text-sm font-medium">a = {a}</text>
            <text x="20" y={160 - (b * 30) / 2} textAnchor="middle" className="fill-foreground text-sm font-medium">b = {b}</text>
            <text x={40 + (a * 30) / 2 + 20} y={160 - (b * 30) / 2 - 10} className="fill-purple-400 text-sm font-bold">c = {c.toFixed(2)}</text>
          </svg>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Side a: {a}</label>
            <Slider value={[a]} onValueChange={([v]) => setA(v)} min={1} max={8} step={1} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Side b: {b}</label>
            <Slider value={[b]} onValueChange={([v]) => setB(v)} min={1} max={8} step={1} className="w-full" />
          </div>
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm font-mono text-foreground">
              a² + b² = c²
            </p>
            <p className="text-sm font-mono text-muted-foreground mt-1">
              {a}² + {b}² = {a*a} + {b*b} = {a*a + b*b}
            </p>
            <p className="text-sm font-mono text-purple-400 mt-1">
              c = √{a*a + b*b} = {c.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// SOHCAHTOA Interactive
export function TrigInteractive() {
  const [angle, setAngle] = useState(30);
  const angleRad = (angle * Math.PI) / 180;
  const hyp = 100;
  const opp = hyp * Math.sin(angleRad);
  const adj = hyp * Math.cos(angleRad);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Ruler className="h-4 w-4" /></span>
        Interactive Trigonometry
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="280" height="200" viewBox="0 0 280 200">
            <line x1="40" y1="160" x2={40 + adj * 1.8} y2="160" stroke="hsl(142 76% 36%)" strokeWidth="3" />
            <line x1="40" y1="160" x2={40 + adj * 1.8} y2={160 - opp * 1.8} stroke="hsl(262 83% 58%)" strokeWidth="3" />
            <line x1={40 + adj * 1.8} y1="160" x2={40 + adj * 1.8} y2={160 - opp * 1.8} stroke="hsl(47 96% 53%)" strokeWidth="3" />
            <rect x="40" y={160 - 12} width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path d={`M 60,160 A 20,20 0 0,0 ${40 + 20 * Math.cos(angleRad)},${160 - 20 * Math.sin(angleRad)}`} fill="none" stroke="currentColor" strokeWidth="1.5" />
            <text x="70" y="152" className="fill-foreground text-xs">{angle}°</text>
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Angle θ: {angle}°</label>
            <Slider value={[angle]} onValueChange={([v]) => setAngle(v)} min={10} max={80} step={5} className="w-full" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <p className="text-purple-400 font-bold">Hyp</p>
              <p className="text-foreground">{(hyp / 100).toFixed(2)}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <p className="text-yellow-400 font-bold">Opp</p>
              <p className="text-foreground">{(opp / 100).toFixed(2)}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
              <p className="text-green-400 font-bold">Adj</p>
              <p className="text-foreground">{(adj / 100).toFixed(2)}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-xs font-mono space-y-1">
            <p><span className="text-purple-400">sin({angle}°)</span> = {Math.sin(angleRad).toFixed(3)}</p>
            <p><span className="text-green-400">cos({angle}°)</span> = {Math.cos(angleRad).toFixed(3)}</p>
            <p><span className="text-yellow-400">tan({angle}°)</span> = {Math.tan(angleRad).toFixed(3)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Angles in Parallel Lines
export function ParallelLinesInteractive() {
  const [transversalAngle, setTransversalAngle] = useState(60);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Triangle className="h-4 w-4" /></span>
        Angles in Parallel Lines
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="280" height="200" viewBox="0 0 280 200">
            {/* Parallel lines */}
            <line x1="20" y1="60" x2="260" y2="60" stroke="currentColor" strokeWidth="2" />
            <line x1="20" y1="140" x2="260" y2="140" stroke="currentColor" strokeWidth="2" />
            {/* Arrow markers */}
            <polygon points="130,55 140,60 130,65" fill="currentColor" />
            <polygon points="130,135 140,140 130,145" fill="currentColor" />
            {/* Transversal */}
            <line 
              x1={140 - 100 * Math.cos((transversalAngle * Math.PI) / 180)} 
              y1={100 + 100 * Math.sin((transversalAngle * Math.PI) / 180)} 
              x2={140 + 100 * Math.cos((transversalAngle * Math.PI) / 180)} 
              y2={100 - 100 * Math.sin((transversalAngle * Math.PI) / 180)} 
              stroke="hsl(262 83% 58%)" 
              strokeWidth="2" 
            />
            {/* Angle arcs */}
            <text x="155" y="55" className="fill-purple-400 text-xs font-bold">{transversalAngle}°</text>
            <text x="120" y="75" className="fill-yellow-400 text-xs font-bold">{180 - transversalAngle}°</text>
            <text x="155" y="135" className="fill-purple-400 text-xs font-bold">{transversalAngle}°</text>
            <text x="120" y="155" className="fill-yellow-400 text-xs font-bold">{180 - transversalAngle}°</text>
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Transversal angle: {transversalAngle}°</label>
            <Slider value={[transversalAngle]} onValueChange={([v]) => setTransversalAngle(v)} min={30} max={80} step={5} className="w-full" />
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-foreground">Corresponding angles = {transversalAngle}°</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-foreground">Alternate angles = {transversalAngle}°</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-foreground">Co-interior angles = {180 - transversalAngle}°</span>
            </p>
            <p className="text-muted-foreground text-xs mt-2">Co-interior: {transversalAngle}° + {180 - transversalAngle}° = 180°</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Polygon Interior Angles
export function PolygonAnglesInteractive() {
  const [sides, setSides] = useState(5);
  const sumInterior = (sides - 2) * 180;
  const eachInterior = sumInterior / sides;
  const eachExterior = 360 / sides;

  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    return `${100 + 70 * Math.cos(angle)},${100 + 70 * Math.sin(angle)}`;
  }).join(" ");

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Hexagon className="h-4 w-4" /></span>
        Polygon Interior Angles
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <polygon points={points} fill="hsl(262 83% 58% / 0.1)" stroke="hsl(262 83% 58%)" strokeWidth="2" />
            <text x="100" y="105" textAnchor="middle" className="fill-foreground text-xs font-medium">{sides}-sided</text>
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Number of sides: {sides}</label>
            <Slider value={[sides]} onValueChange={([v]) => setSides(v)} min={3} max={12} step={1} className="w-full" />
          </div>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-muted-foreground">Sum of interior angles:</p>
              <p className="font-mono text-foreground">({sides} - 2) × 180° = <span className="text-purple-400 font-bold">{sumInterior}°</span></p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Each interior angle (regular):</p>
              <p className="font-mono text-foreground">{sumInterior}° ÷ {sides} = <span className="font-bold">{eachInterior.toFixed(1)}°</span></p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Each exterior angle:</p>
              <p className="font-mono text-foreground">360° ÷ {sides} = <span className="font-bold">{eachExterior.toFixed(1)}°</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Circle Theorems
export function CircleTheoremsInteractive() {
  const [theorem, setTheorem] = useState<'inscribed' | 'diameter' | 'tangent'>('inscribed');

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Circle className="h-4 w-4" /></span>
        Circle Theorems
      </h4>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['inscribed', 'diameter', 'tangent'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheorem(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              theorem === t 
                ? "bg-purple-500 text-white" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {t === 'inscribed' ? 'Inscribed Angle' : t === 'diameter' ? 'Angle in Semicircle' : 'Tangent-Radius'}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="2" />
            {theorem === 'inscribed' && (
              <>
                <circle cx="100" cy="100" r="3" fill="currentColor" />
                <circle cx="100" cy="30" r="4" fill="hsl(262 83% 58%)" />
                <circle cx="40" cy="120" r="4" fill="hsl(262 83% 58%)" />
                <circle cx="160" cy="120" r="4" fill="hsl(262 83% 58%)" />
                <line x1="100" y1="30" x2="40" y2="120" stroke="hsl(262 83% 58%)" strokeWidth="2" />
                <line x1="100" y1="30" x2="160" y2="120" stroke="hsl(262 83% 58%)" strokeWidth="2" />
                <line x1="40" y1="120" x2="100" y2="100" stroke="hsl(47 96% 53%)" strokeWidth="1.5" strokeDasharray="4" />
                <line x1="160" y1="120" x2="100" y2="100" stroke="hsl(47 96% 53%)" strokeWidth="1.5" strokeDasharray="4" />
                <text x="100" y="20" textAnchor="middle" className="fill-purple-400 text-xs font-bold">θ</text>
                <text x="100" y="90" textAnchor="middle" className="fill-yellow-400 text-xs font-bold">2θ</text>
              </>
            )}
            {theorem === 'diameter' && (
              <>
                <line x1="30" y1="100" x2="170" y2="100" stroke="hsl(262 83% 58%)" strokeWidth="2" />
                <circle cx="30" cy="100" r="4" fill="hsl(262 83% 58%)" />
                <circle cx="170" cy="100" r="4" fill="hsl(262 83% 58%)" />
                <circle cx="100" cy="30" r="4" fill="hsl(47 96% 53%)" />
                <line x1="30" y1="100" x2="100" y2="30" stroke="currentColor" strokeWidth="1.5" />
                <line x1="170" y1="100" x2="100" y2="30" stroke="currentColor" strokeWidth="1.5" />
                <text x="100" y="50" textAnchor="middle" className="fill-yellow-400 text-xs font-bold">90°</text>
              </>
            )}
            {theorem === 'tangent' && (
              <>
                <circle cx="100" cy="100" r="3" fill="currentColor" />
                <line x1="100" y1="100" x2="170" y2="100" stroke="hsl(262 83% 58%)" strokeWidth="2" />
                <line x1="170" y1="50" x2="170" y2="150" stroke="hsl(47 96% 53%)" strokeWidth="2" />
                <circle cx="170" cy="100" r="4" fill="hsl(142 76% 36%)" />
                <rect x="155" y="85" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <text x="180" y="95" className="fill-foreground text-xs font-bold">90°</text>
              </>
            )}
          </svg>
        </div>
        <div className="space-y-3 text-sm">
          {theorem === 'inscribed' && (
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="font-semibold text-foreground mb-2">Inscribed Angle Theorem</p>
              <p className="text-muted-foreground">The angle at the centre is <span className="text-purple-400 font-bold">twice</span> the angle at the circumference when subtended by the same arc.</p>
            </div>
          )}
          {theorem === 'diameter' && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="font-semibold text-foreground mb-2">Angle in a Semicircle</p>
              <p className="text-muted-foreground">The angle inscribed in a semicircle is always <span className="text-yellow-400 font-bold">90°</span> (a right angle).</p>
            </div>
          )}
          {theorem === 'tangent' && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-semibold text-foreground mb-2">Tangent-Radius Theorem</p>
              <p className="text-muted-foreground">A tangent to a circle is <span className="text-green-400 font-bold">perpendicular</span> to the radius at the point of contact.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Area and Perimeter Interactive
export function AreaPerimeterInteractive() {
  const [length, setLength] = useState(6);
  const [width, setWidth] = useState(4);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><RectangleHorizontal className="h-4 w-4" /></span>
        Area & Perimeter
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="240" height="180" viewBox="0 0 240 180">
            <rect 
              x={120 - length * 12} 
              y={90 - width * 12} 
              width={length * 24} 
              height={width * 24} 
              fill="hsl(262 83% 58% / 0.15)" 
              stroke="hsl(262 83% 58%)" 
              strokeWidth="2" 
            />
            <text x="120" y={90 + width * 12 + 20} textAnchor="middle" className="fill-foreground text-sm font-medium">{length} cm</text>
            <text x={120 - length * 12 - 20} y="90" textAnchor="middle" className="fill-foreground text-sm font-medium" transform={`rotate(-90, ${120 - length * 12 - 20}, 90)`}>{width} cm</text>
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Length: {length} cm</label>
            <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={2} max={10} step={1} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Width: {width} cm</label>
            <Slider value={[width]} onValueChange={([v]) => setWidth(v)} min={2} max={8} step={1} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="font-mono font-bold text-purple-400">{length * width} cm²</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground">Perimeter</p>
              <p className="font-mono font-bold text-green-400">{2 * (length + width)} cm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Probability Tree
export function ProbabilityTreeInteractive() {
  const [pFirst, setPFirst] = useState(0.3);
  const pSecondYes = 0.4;
  const pSecondNo = 0.6;

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><GitBranch className="h-4 w-4" /></span>
        Probability Tree
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="260" height="180" viewBox="0 0 260 180">
            {/* First branch */}
            <line x1="40" y1="90" x2="120" y2="40" stroke="hsl(262 83% 58%)" strokeWidth="2" />
            <line x1="40" y1="90" x2="120" y2="140" stroke="hsl(47 96% 53%)" strokeWidth="2" />
            <circle cx="40" cy="90" r="4" fill="currentColor" />
            <text x="75" y="55" className="fill-purple-400 text-xs font-bold">{pFirst.toFixed(1)}</text>
            <text x="75" y="130" className="fill-yellow-400 text-xs font-bold">{(1 - pFirst).toFixed(1)}</text>
            {/* Second branches */}
            <line x1="120" y1="40" x2="200" y2="20" stroke="hsl(142 76% 36%)" strokeWidth="2" />
            <line x1="120" y1="40" x2="200" y2="60" stroke="hsl(0 84% 60%)" strokeWidth="2" />
            <line x1="120" y1="140" x2="200" y2="120" stroke="hsl(142 76% 36%)" strokeWidth="2" />
            <line x1="120" y1="140" x2="200" y2="160" stroke="hsl(0 84% 60%)" strokeWidth="2" />
            <text x="155" y="25" className="fill-green-400 text-[10px]">{pSecondYes}</text>
            <text x="155" y="55" className="fill-red-400 text-[10px]">{pSecondNo}</text>
            {/* Outcomes */}
            <text x="210" y="20" className="fill-foreground text-xs">{(pFirst * pSecondYes).toFixed(2)}</text>
            <text x="210" y="60" className="fill-foreground text-xs">{(pFirst * pSecondNo).toFixed(2)}</text>
            <text x="210" y="120" className="fill-foreground text-xs">{((1 - pFirst) * pSecondYes).toFixed(2)}</text>
            <text x="210" y="160" className="fill-foreground text-xs">{((1 - pFirst) * pSecondNo).toFixed(2)}</text>
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">P(First event) = {pFirst.toFixed(1)}</label>
            <Slider value={[pFirst * 10]} onValueChange={([v]) => setPFirst(v / 10)} min={1} max={9} step={1} className="w-full" />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
            <p className="font-semibold text-foreground mb-2">Multiplication Rule:</p>
            <p className="text-muted-foreground">P(A and B) = P(A) × P(B|A)</p>
            <p className="text-muted-foreground mt-2">All branches sum to: <span className="text-purple-400 font-bold">1.00</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Map topic slugs to interactive diagrams
export function getInteractiveDiagram(topicSlug: string): React.ReactNode | null {
  const slugLower = topicSlug.toLowerCase();

  // Compound measures (Ratio section) use their own static diagrams; avoid incorrect Geometry interactives.
  if (slugLower.includes('density') || slugLower.includes('pressure')) {
    return null;
  }
  
  if (slugLower.includes('pythagoras')) {
    return <PythagorasInteractive />;
  }
  if (slugLower.includes('trigonometry') || slugLower.includes('sohcahtoa')) {
    return <TrigInteractive />;
  }
  if (slugLower.includes('parallel') && slugLower.includes('line')) {
    return <ParallelLinesInteractive />;
  }
  if (slugLower.includes('polygon')) {
    return <PolygonAnglesInteractive />;
  }
  if (slugLower.includes('circle') && slugLower.includes('theorem')) {
    return <CircleTheoremsInteractive />;
  }
  if (slugLower.includes('area') || slugLower.includes('perimeter')) {
    return <AreaPerimeterInteractive />;
  }
  if (slugLower.includes('probability')) {
    return <ProbabilityScaleInteractive />;
  }
  if (slugLower.includes('decimals') && slugLower.includes('percentages')) {
    return <FDPInteractive />;
  }
  if (slugLower.includes('tree') || slugLower.includes('probability-trees')) {
    return <ProbabilityTreeInteractive />;
  }
  if (slugLower.includes('fraction')) {
    return <FractionsInteractive />;
  }
  if (slugLower.includes('negative') || slugLower.includes('number-line')) {
    return <NumberLineInteractive />;
  }
  if (slugLower.includes('quadratic') && slugLower.includes('graph')) {
    return <QuadraticGraphInteractive />;
  }
  if (slugLower.includes('sequence')) {
    return <SequenceInteractive />;
  }
  if (slugLower.includes('straight') && slugLower.includes('line')) {
    return <StraightLineInteractive />;
  }
  if (slugLower.includes('box') && slugLower.includes('plot')) {
    return <BoxPlotInteractive />;
  }
  if (slugLower.includes('venn')) {
    return <VennDiagramInteractive />;
  }
  if (slugLower.includes('vector')) {
    return <VectorInteractive />;
  }
  if (slugLower.includes('standard') && slugLower.includes('form')) {
    return <StandardFormInteractive />;
  }
  if (slugLower.includes('bounds') || slugLower.includes('error-interval')) {
    return <BoundsInteractive />;
  }
  if (slugLower.includes('sine') || slugLower.includes('cosine')) {
    return <TrigInteractive />;
  }
  if (slugLower.includes('ratio') || slugLower.includes('proportion')) {
    return <RatioInteractive />;
  }
  if (slugLower.includes('volume') || slugLower.includes('surface')) {
    return <AreaPerimeterInteractive />;
  }
  if (slugLower.includes('histogram') || slugLower.includes('frequency')) {
    return <BoxPlotInteractive />;
  }
  // Do not show the Standard Form widget on other Number topics.
  if (slugLower.includes('similar') || slugLower.includes('congruent')) {
    return <PythagorasInteractive />;
  }
  if (slugLower.includes('bearing')) {
    return <ParallelLinesInteractive />;
  }
  if (slugLower.includes('arc') || slugLower.includes('sector')) {
    return <CircleTheoremsInteractive />;
  }
  
  return null;
}

// Additional Interactive Diagrams

export function FractionsInteractive() {
  const [num1, setNum1] = useState(1);
  const [den1, setDen1] = useState(2);
  const [num2, setNum2] = useState(1);
  const [den2, setDen2] = useState(3);

  const commonDen = den1 * den2;
  const newNum1 = num1 * den2;
  const newNum2 = num2 * den1;
  const sumNum = newNum1 + newNum2;

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><LineChart className="h-4 w-4" /></span>
        Adding Fractions
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="280" height="120" viewBox="0 0 280 120">
            <text x="30" y="60" className="fill-purple-400 text-2xl font-bold">{num1}</text>
            <line x1="20" y1="70" x2="50" y2="70" stroke="currentColor" strokeWidth="2" />
            <text x="30" y="95" className="fill-purple-400 text-2xl font-bold">{den1}</text>
            <text x="70" y="70" className="fill-foreground text-2xl">+</text>
            <text x="110" y="60" className="fill-amber-400 text-2xl font-bold">{num2}</text>
            <line x1="100" y1="70" x2="130" y2="70" stroke="currentColor" strokeWidth="2" />
            <text x="110" y="95" className="fill-amber-400 text-2xl font-bold">{den2}</text>
            <text x="150" y="70" className="fill-foreground text-2xl">=</text>
            <text x="200" y="60" className="fill-green-400 text-2xl font-bold">{sumNum}</text>
            <line x1="180" y1="70" x2="230" y2="70" stroke="currentColor" strokeWidth="2" />
            <text x="200" y="95" className="fill-green-400 text-2xl font-bold">{commonDen}</text>
          </svg>
        </div>
        <div className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-muted-foreground">Common denominator: {den1} × {den2} = <span className="text-purple-400 font-bold">{commonDen}</span></p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">{num1}/{den1} = {newNum1}/{commonDen}</p>
            <p className="text-muted-foreground">{num2}/{den2} = {newNum2}/{commonDen}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NumberLineInteractive() {
  const [value, setValue] = useState(0);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Divide className="h-4 w-4" /></span>
        Number Line
      </h4>
      <div className="bg-muted/30 rounded-xl p-4">
        <svg width="100%" height="80" viewBox="0 0 300 80">
          <line x1="20" y1="40" x2="280" y2="40" stroke="currentColor" strokeWidth="2" />
          {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((n) => (
            <g key={n}>
              <line x1={150 + n * 24} y1="35" x2={150 + n * 24} y2="45" stroke="currentColor" strokeWidth="2" />
              <text x={150 + n * 24} y="60" textAnchor="middle" className="fill-foreground text-xs">{n}</text>
            </g>
          ))}
          <circle cx={150 + value * 24} cy="40" r="8" fill="hsl(262 83% 58%)" />
          <text x={150 + value * 24} y="20" textAnchor="middle" className="fill-purple-400 text-sm font-bold">{value}</text>
        </svg>
        <div className="mt-4">
          <Slider value={[value]} onValueChange={([v]) => setValue(v)} min={-5} max={5} step={1} className="w-full" />
        </div>
      </div>
    </div>
  );
}

// Simple scatter plot interactive for correlation / scatter graph topics
export function ScatterInteractive() {
  const sample = [
    { x: 10, y: 12 },
    { x: 20, y: 18 },
    { x: 30, y: 28 },
    { x: 40, y: 36 },
    { x: 50, y: 48 },
    { x: 60, y: 58 }
  ];

  // compute simple linear regression (least squares) for line of best fit
  const n = sample.length;
  const sumX = sample.reduce((s, p) => s + p.x, 0);
  const sumY = sample.reduce((s, p) => s + p.y, 0);
  const sumXY = sample.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = sample.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n || 0;

  const mapX = (x: number) => 30 + (x / 70) * 240; // map to SVG width
  const mapY = (y: number) => 120 - (y / 70) * 80; // map to SVG height

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><TrendingDown className="h-4 w-4" /></span>
        Scatter Graph
      </h4>
      <div className="bg-muted/30 rounded-xl p-4">
        <svg width="100%" height="140" viewBox="0 0 300 140">
          <line x1="30" y1="120" x2="270" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <line x1="30" y1="20" x2="30" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          {sample.map((p, i) => (
            <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r={5} fill="hsl(262 83% 58%)" />
          ))}
          {/* regression line endpoints */}
          <line x1={mapX(0)} y1={mapY(intercept + slope * 0)} x2={mapX(70)} y2={mapY(intercept + slope * 70)} stroke="hsl(47 96% 53%)" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
        <p className="text-xs text-muted-foreground mt-2">Scatter graphs show relationships between two variables. The dashed line is a simple line of best fit (least-squares).</p>
      </div>
    </div>
  );
}

export function QuadraticGraphInteractive() {
  const [a, setA] = useState(1);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><TrendingUp className="h-4 w-4" /></span>
        Quadratic Graph y = {a}x²
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path
              d={`M ${100 - 80} ${100 - a * 64} Q 100 ${100 + (a > 0 ? 0 : -a * 20)} ${100 + 80} ${100 - a * 64}`}
              fill="none"
              stroke="hsl(262 83% 58%)"
              strokeWidth="3"
            />
            <text x="105" y="15" className="fill-foreground text-xs">y</text>
            <text x="185" y="95" className="fill-foreground text-xs">x</text>
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Coefficient a: {a}</label>
            <Slider value={[a]} onValueChange={([v]) => setA(v)} min={-3} max={3} step={0.5} className="w-full" />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-foreground">Shape: {a > 0 ? "U-shape (minimum)" : a < 0 ? "n-shape (maximum)" : "Straight line"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SequenceInteractive() {
  const [d, setD] = useState(3);
  const [a, setA] = useState(2);
  const terms = Array.from({ length: 5 }, (_, i) => a + d * i);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Hash className="h-4 w-4" /></span>
        Arithmetic Sequence
      </h4>
      <div className="bg-muted/30 rounded-xl p-4">
        <div className="flex justify-center gap-4 mb-4">
          {terms.map((t, i) => (
            <div key={i} className="w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-foreground font-bold">
              {t}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">First term (a): {a}</label>
            <Slider value={[a]} onValueChange={([v]) => setA(v)} min={-5} max={10} step={1} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Common diff (d): {d}</label>
            <Slider value={[d]} onValueChange={([v]) => setD(v)} min={-5} max={10} step={1} className="w-full" />
          </div>
        </div>
        <div className="mt-3 p-2 rounded-lg bg-purple-500/10 text-center">
          <p className="text-sm font-mono text-foreground">nth term = <span className="text-purple-400">{d}n + {a - d}</span></p>
        </div>
      </div>
    </div>
  );
}

export function StraightLineInteractive() {
  const [m, setM] = useState(2);
  const [c, setC] = useState(1);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Ruler className="h-4 w-4" /></span>
        y = {m}x + {c}
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line
              x1="0"
              y1={100 - (m * -5 + c) * 10}
              x2="200"
              y2={100 - (m * 5 + c) * 10}
              stroke="hsl(262 83% 58%)"
              strokeWidth="3"
            />
            <circle cx="100" cy={100 - c * 10} r="5" fill="hsl(47 96% 53%)" />
          </svg>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Gradient (m): {m}</label>
            <Slider value={[m]} onValueChange={([v]) => setM(v)} min={-3} max={3} step={0.5} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Y-intercept (c): {c}</label>
            <Slider value={[c]} onValueChange={([v]) => setC(v)} min={-5} max={5} step={1} className="w-full" />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="text-muted-foreground">Gradient: <span className="text-purple-400 font-bold">{m}</span></p>
            <p className="text-muted-foreground">Crosses y-axis at: <span className="text-yellow-400 font-bold">(0, {c})</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BoxPlotInteractive() {
  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Box className="h-4 w-4" /></span>
        Box Plot Structure
      </h4>
      <div className="bg-muted/30 rounded-xl p-4">
        <svg width="100%" height="120" viewBox="0 0 300 120">
          <line x1="30" y1="60" x2="270" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          {[0, 25, 50, 75, 100].map((v, i) => (
            <g key={i}>
              <line x1={30 + v * 2.4} y1="85" x2={30 + v * 2.4} y2="90" stroke="currentColor" strokeWidth="1" />
              <text x={30 + v * 2.4} y="105" textAnchor="middle" className="fill-foreground text-xs">{v}</text>
            </g>
          ))}
          <line x1="54" y1="50" x2="54" y2="70" stroke="hsl(262 83% 58%)" strokeWidth="2" />
          <line x1="54" y1="60" x2="102" y2="60" stroke="hsl(262 83% 58%)" strokeWidth="2" />
          <rect x="102" y="45" width="96" height="30" fill="hsl(262 83% 58% / 0.2)" stroke="hsl(262 83% 58%)" strokeWidth="2" />
          <line x1="150" y1="45" x2="150" y2="75" stroke="hsl(47 96% 53%)" strokeWidth="3" />
          <line x1="198" y1="60" x2="246" y2="60" stroke="hsl(262 83% 58%)" strokeWidth="2" />
          <line x1="246" y1="50" x2="246" y2="70" stroke="hsl(262 83% 58%)" strokeWidth="2" />
          <text x="54" y="35" textAnchor="middle" className="fill-muted-foreground text-[10px]">Min</text>
          <text x="102" y="35" textAnchor="middle" className="fill-muted-foreground text-[10px]">Q₁</text>
          <text x="150" y="35" textAnchor="middle" className="fill-yellow-400 text-[10px] font-bold">Median</text>
          <text x="198" y="35" textAnchor="middle" className="fill-muted-foreground text-[10px]">Q₃</text>
          <text x="246" y="35" textAnchor="middle" className="fill-muted-foreground text-[10px]">Max</text>
        </svg>
      </div>
    </div>
  );
}

export function VennDiagramInteractive() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(3);
  const [both, setBoth] = useState(2);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Circle className="h-4 w-4" /></span>
        Venn Diagram
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="220" height="150" viewBox="0 0 220 150">
            <circle cx="80" cy="75" r="50" fill="hsl(262 83% 58% / 0.2)" stroke="hsl(262 83% 58%)" strokeWidth="2" />
            <circle cx="140" cy="75" r="50" fill="hsl(47 96% 53% / 0.2)" stroke="hsl(47 96% 53%)" strokeWidth="2" />
            <text x="55" y="80" className="fill-purple-400 text-lg font-bold">{a - both}</text>
            <text x="110" y="80" className="fill-green-400 text-lg font-bold">{both}</text>
            <text x="160" y="80" className="fill-yellow-400 text-lg font-bold">{b - both}</text>
            <text x="80" y="140" textAnchor="middle" className="fill-muted-foreground text-xs">Set A</text>
            <text x="140" y="140" textAnchor="middle" className="fill-muted-foreground text-xs">Set B</text>
          </svg>
        </div>
        <div className="space-y-3 text-sm">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <p className="text-muted-foreground">A only: <span className="text-purple-400 font-bold">{a - both}</span></p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10">
            <p className="text-muted-foreground">A ∩ B: <span className="text-green-400 font-bold">{both}</span></p>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <p className="text-muted-foreground">B only: <span className="text-yellow-400 font-bold">{b - both}</span></p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-muted-foreground">A ∪ B = {a - both} + {both} + {b - both} = <span className="font-bold">{a + b - both}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VectorInteractive() {
  const [x, setX] = useState(3);
  const [y, setY] = useState(4);
  const magnitude = Math.sqrt(x * x + y * y);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><ArrowRight className="h-4 w-4" /></span>
        Vector Components
      </h4>
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <line x1="20" y1="160" x2="160" y2="160" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line x1="20" y1="20" x2="20" y2="160" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <line x1="20" y1="160" x2={20 + x * 20} y2={160 - y * 20} stroke="hsl(262 83% 58%)" strokeWidth="3" markerEnd="url(#arrowhead)" />
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(262 83% 58%)" />
              </marker>
            </defs>
            <line x1="20" y1="160" x2={20 + x * 20} y2="160" stroke="hsl(142 76% 36%)" strokeWidth="2" strokeDasharray="4" />
            <line x1={20 + x * 20} y1="160" x2={20 + x * 20} y2={160 - y * 20} stroke="hsl(47 96% 53%)" strokeWidth="2" strokeDasharray="4" />
          </svg>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">x component: {x}</label>
            <Slider value={[x]} onValueChange={([v]) => setX(v)} min={0} max={6} step={1} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">y component: {y}</label>
            <Slider value={[y]} onValueChange={([v]) => setY(v)} min={0} max={6} step={1} className="w-full" />
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm font-mono text-foreground">|v| = √({x}² + {y}²) = <span className="text-purple-400 font-bold">{magnitude.toFixed(2)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StandardFormInteractive() {
  const [power, setPower] = useState(4);
  const [mantissa, setMantissa] = useState(3.5);
  const value = mantissa * Math.pow(10, power);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Microscope className="h-4 w-4" /></span>
        Standard Form
      </h4>
      <div className="notes-diagram-surface p-4">
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-purple-400">{mantissa}</span>
          <span className="text-2xl text-foreground"> × 10</span>
          <sup className="text-xl text-amber-400 font-bold">{power}</sup>
        </div>
        <div className="text-center mb-4 p-3 notes-diagram-panel">
          <p className="text-sm text-muted-foreground">= <span className="text-foreground font-mono">{value.toLocaleString()}</span></p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">A value: {mantissa}</label>
            <Slider value={[mantissa * 10]} onValueChange={([v]) => setMantissa(v / 10)} min={10} max={99} step={1} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Power: {power}</label>
            <Slider value={[power]} onValueChange={([v]) => setPower(v)} min={-4} max={6} step={1} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BoundsInteractive() {
  const accuracyOptions = [
    { label: 'Nearest integer', unit: 1 },
    { label: '1 decimal place', unit: 0.1 },
    { label: '2 decimal places', unit: 0.01 },
    { label: 'Nearest 10', unit: 10 },
    { label: 'Nearest 100', unit: 100 },
  ] as const;

  const [accuracyIndex, setAccuracyIndex] = useState(1);
  const [roundedValue, setRoundedValue] = useState(5.3);

  const unit = accuracyOptions[accuracyIndex]?.unit ?? 0.1;
  const halfUnit = unit / 2;
  const lower = roundedValue - halfUnit;
  const upper = roundedValue + halfUnit;

  const decimals = unit >= 1 ? 0 : unit === 0.1 ? 1 : 2;
  const format = (n: number) => n.toFixed(decimals);

  return (
    <div className="notes-interactive-diagram">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="notes-diagram-icon"><Ruler className="h-4 w-4" /></span>
        Bounds (Error Interval)
      </h4>

      <div className="notes-diagram-surface p-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Rounded value: {format(roundedValue)}
            </label>
            <Slider
              value={[roundedValue]}
              onValueChange={([v]) => setRoundedValue(v)}
              min={0}
              max={100}
              step={unit}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Accuracy: {accuracyOptions[accuracyIndex]?.label}
            </label>
            <Slider
              value={[accuracyIndex]}
              onValueChange={([v]) => setAccuracyIndex(v)}
              min={0}
              max={accuracyOptions.length - 1}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="notes-diagram-panel p-3">
            <p className="text-xs text-muted-foreground mb-1">Half a unit</p>
            <p className="text-sm font-mono text-foreground">
              {unit} ÷ 2 = <span className="font-bold">{format(halfUnit)}</span>
            </p>
          </div>

          <div className="notes-diagram-panel p-3">
            <p className="text-xs text-muted-foreground mb-1">Error interval</p>
            <p className="text-sm font-mono text-foreground">
              {format(lower)} ≤ x &lt; {format(upper)}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-sm text-foreground/90">
            Rule: true value lies within <span className="font-semibold">± half a unit</span> of the rounded value.
          </p>
        </div>
      </div>
    </div>
  );
}

// Statistics: render multiple helpful diagrams and an example frequency table
export function StatisticsDiagrams({ topicSlug }: { topicSlug?: string }) {
  const sampleHistogramData = [
    { classLower: 0, classUpper: 10, frequency: 2 },
    { classLower: 10, classUpper: 20, frequency: 5 },
    { classLower: 20, classUpper: 30, frequency: 9 },
    { classLower: 30, classUpper: 40, frequency: 6 },
    { classLower: 40, classUpper: 50, frequency: 3 },
  ];

  const sampleCumData = sampleHistogramData.map((d, i) => ({ upperBound: d.classUpper, cumFreq: sampleHistogramData.slice(0, i + 1).reduce((s, x) => s + x.frequency, 0) }));

  const sampleBox = { /* BoxPlot component draws fixed labels; no props required for the simple demo below */ };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-foreground mb-3">Statistics Diagrams</h3>

      {/* Use an explicit mapping so each statistics subsection only shows appropriate visuals */}
      {(() => {
        const slug = (topicSlug || '').toLowerCase();

        const mapping: Record<string, string[]> = {
          'mean-median-mode-range': ['box-example'],
          'frequency-tables': ['table'],
          'box-plots-cumulative-frequency': ['box', 'cumulative', 'table'],
          'histograms': ['histogram', 'table'],
          'scatter-graphs': ['scatter'],
          'pie-charts': ['pie'],
          'comparing-distributions': ['box'],
          'sampling': [],
        };

        // pick the first mapping that matches the slug keys (exact or includes)
        let diagrams: string[] | undefined;
        Object.keys(mapping).forEach((k) => {
          if (slug === k || slug.includes(k) || k.includes(slug)) {
            diagrams = mapping[k];
          }
        });

        // fallback heuristics if no explicit mapping found
        if (!diagrams) {
          if (slug.includes('histogram') || slug.includes('frequency') || slug.includes('grouped')) diagrams = ['histogram', 'table'];
          else if (slug.includes('box') || slug.includes('quartile') || slug.includes('median')) diagrams = ['box', 'cumulative'];
          else if (slug.includes('scatter')) diagrams = ['scatter'];
          else diagrams = [];
        }

        if (diagrams.length === 0) {
          return (
            <div className="p-4 rounded-lg bg-muted/10 border border-border/30">
              <p className="text-sm text-muted-foreground">No specific diagram is required for this subsection. Browse the topic content above for worked examples and how to draw diagrams. If you'd like a visualization, view the relevant Statistics topic (e.g. Histograms, Box Plots).</p>
            </div>
          );
        }

        return (
          <div className="grid md:grid-cols-3 gap-4">
            {diagrams.includes('histogram') && (
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="font-semibold mb-2">Histogram</h4>
                <Histogram data={sampleHistogramData} width={320} height={220} />
                <p className="text-xs text-muted-foreground mt-2">A histogram groups continuous data into class intervals. Height shows frequency density; area shows frequency.</p>
              </div>
            )}

            {diagrams.includes('cumulative') && (
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="font-semibold mb-2">Cumulative Frequency</h4>
                <CumulativeFrequencyCurve data={sampleCumData} width={320} height={220} totalFreq={sampleCumData[sampleCumData.length - 1].cumFreq} showMedian />
                <p className="text-xs text-muted-foreground mt-2">Cumulative frequency curves help read percentiles and estimate medians visually.</p>
              </div>
            )}

            {diagrams.includes('box') && (
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="font-semibold mb-2">Box Plot</h4>
                <BoxPlot data={{ min: 12, q1: 18, median: 25, q3: 32, max: 45 }} width={320} height={140} />
                <p className="text-xs text-muted-foreground mt-2">Box plots summarise median, quartiles and range — useful for comparing distributions.</p>
              </div>
            )}

            {diagrams.includes('scatter') && (
              <div className="bg-muted/30 rounded-xl p-4 md:col-span-1">
                <ScatterInteractive />
              </div>
            )}

            {diagrams.includes('table') && (
              <div className="mt-2 md:mt-0 md:col-span-1 bg-card border border-border/40 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Example Frequency Table</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left">Class</th>
                        <th className="text-left">Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleHistogramData.map((r, i) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="py-2">{r.classLower}–{r.classUpper}</td>
                          <td className="py-2">{r.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Use the table to calculate totals, means and medians before checking the diagrams.</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}


// ==========================================
// NEW 11+ PREMIUM INTERACTIVES
// ==========================================

export function FDPInteractive() {
  const [percent, setPercent] = useState(25);
  
  const decimal = (percent / 100).toFixed(2);
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(percent, 100);
  const num = percent / divisor;
  const den = 100 / divisor;

  return (
    <div className="notes-interactive-diagram mb-8">
      <h4 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <span className="notes-diagram-icon"><Repeat className="h-4 w-4" /></span>
        Interactive FDP Converter
      </h4>
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 flex flex-col items-center justify-center border border-indigo-500/10 shadow-inner">
          <div className="flex w-full items-center justify-between text-center mt-2 mb-6 gap-2">
             <div className="flex-1">
                <div className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest">Fraction</div>
                {percent === 0 ? (
                  <div className="text-3xl font-black text-indigo-600">0</div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-3xl font-black text-indigo-600">
                    <div>{num}</div>
                    <div className="w-8 border-t-[3px] border-indigo-600 my-0.5" />
                    <div>{den}</div>
                  </div>
                )}
             </div>
             <div className="text-muted-foreground/30"><ArrowRight className="w-6 h-6"/></div>
             <div className="flex-1">
                <div className="text-[10px] font-black uppercase text-purple-400 mb-2 tracking-widest">Decimal</div>
                <div className="text-4xl font-black text-purple-600">{decimal}</div>
             </div>
             <div className="text-muted-foreground/30"><ArrowRight className="w-6 h-6"/></div>
             <div className="flex-1">
                <div className="text-[10px] font-black uppercase text-pink-400 mb-2 tracking-widest">Percentage</div>
                <div className="text-4xl font-black text-pink-600">{percent}%</div>
             </div>
          </div>
          <div className="w-full relative h-4 bg-muted/60 rounded-full overflow-hidden shadow-inner border border-border/50">
             <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-muted-foreground mb-4 block uppercase tracking-wider">Slide to Convert</label>
            <Slider value={[percent]} onValueChange={([v]) => setPercent(v)} min={0} max={100} step={5} className="w-full" />
          </div>
          <div className="space-y-3">
             <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                <p className="text-sm text-foreground/80 leading-relaxed font-medium">To turn a <strong className="text-purple-500">Decimal</strong> into a <strong className="text-pink-500">Percentage</strong>, aggressively multiply by 100 (move the decimal point two spaces right).</p>
             </div>
             <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-sm text-foreground/80 leading-relaxed font-medium">To extract the <strong className="text-indigo-500">Fraction</strong>, place the percentage over 100 and simplify structurally until it cannot be broken down further.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RatioInteractive() {
  const [total, setTotal] = useState(25);
  const ratioA = 3;
  const ratioB = 2;
  const parts = ratioA + ratioB;
  const partValue = total / parts;
  
  const shareA = partValue * ratioA;
  const shareB = partValue * ratioB;

  return (
    <div className="notes-interactive-diagram mb-8">
      <h4 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <span className="notes-diagram-icon"><Box className="h-4 w-4" /></span>
        Interactive Ratio (3:2)
      </h4>
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-6 flex flex-col items-center justify-center border border-emerald-500/10 shadow-inner">
          <div className="flex w-full items-end justify-center gap-8 h-32 mb-6">
             <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Share A (3)</div>
                <div className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300 shadow-md flex items-end justify-center pb-2" style={{ height: `${(shareA / total) * 100}%`, minHeight: '20px' }}>
                   <span className="text-white font-black text-xl">{Math.round(shareA)}</span>
                </div>
             </div>
             <div className="flex flex-col items-center gap-2 w-1/3">
                <div className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-1">Share B (2)</div>
                <div className="w-full bg-teal-500 rounded-t-lg transition-all duration-300 shadow-md flex items-end justify-center pb-2" style={{ height: `${(shareB / total) * 100}%`, minHeight: '20px' }}>
                   <span className="text-white font-black text-xl">{Math.round(shareB)}</span>
                </div>
             </div>
          </div>
          <div className="flex w-full overflow-hidden rounded-full h-3 border border-border/50 shadow-inner">
             <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: '60%' }} />
             <div className="bg-teal-400 h-full transition-all duration-300" style={{ width: '40%' }} />
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-muted-foreground mb-4 block uppercase tracking-wider">Total Amount: {total}</label>
            <Slider value={[total]} onValueChange={([v]) => setTotal(v)} min={5} max={100} step={5} className="w-full" />
          </div>
          <div className="space-y-3">
             <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">The ADM Method</p>
                <ul className="space-y-2 text-sm font-medium text-foreground/80">
                  <li><strong className="text-foreground">Add:</strong> 3 + 2 = {parts} Total Parts</li>
                  <li><strong className="text-foreground">Divide:</strong> {total} ÷ {parts} = {partValue} per single part</li>
                  <li><strong className="text-foreground">Multiply:</strong> {partValue} × 3 = <span className="text-emerald-500">{shareA}</span>, {partValue} × 2 = <span className="text-teal-500">{shareB}</span></li>
                </ul>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProbabilityScaleInteractive() {
  const [prob, setProb] = useState(0.5);
  
  let descriptor = "Evens (1/2)";
  let color = "text-amber-500";
  let bg = "bg-amber-500";
  
  if (prob === 0) { descriptor = "Impossible (0)"; color = "text-slate-500"; bg = "bg-slate-500"; }
  else if (prob > 0 && prob < 0.5) { descriptor = "Unlikely"; color = "text-rose-500"; bg = "bg-rose-500"; }
  else if (prob > 0.5 && prob < 1) { descriptor = "Likely"; color = "text-emerald-500"; bg = "bg-emerald-500"; }
  else if (prob === 1) { descriptor = "Certain (1)"; color = "text-blue-500"; bg = "bg-blue-500"; }

  return (
    <div className="notes-interactive-diagram mb-8">
      <h4 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <span className="notes-diagram-icon"><Target className="h-4 w-4" /></span>
        The Probability Scale
      </h4>
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="bg-muted/20 rounded-2xl p-8 flex flex-col items-center justify-center border border-border/30">
           <div className="w-full relative py-6">
              <div className="w-full h-2 bg-gradient-to-r from-slate-300 via-amber-300 to-blue-300 dark:from-slate-700 dark:via-amber-800 dark:to-blue-800 rounded-full shadow-inner" />
              <div className="flex justify-between w-full mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 <span>0 (Impossible)</span>
                 <span>0.5 (Evens)</span>
                 <span>1 (Certain)</span>
              </div>
              
              <div 
                className={cn("absolute top-3 w-6 h-6 -ml-3 rounded-full border-[3px] border-white dark:border-background shadow-lg transition-all duration-300", bg)}
                style={{ left: `${prob * 100}%` }}
              />
           </div>
           <div className="mt-8 text-center p-4 rounded-xl bg-background shadow-sm border border-border/50 min-w-[150px]">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">State</div>
              <div className={cn("text-2xl font-black", color)}>{descriptor}</div>
           </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-muted-foreground mb-4 block uppercase tracking-wider">Adjust Probability: {prob.toFixed(2)}</label>
            <Slider value={[prob]} onValueChange={([v]) => setProb(v)} min={0} max={1} step={0.1} className="w-full" />
          </div>
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
             <p className="text-sm text-foreground/80 leading-relaxed font-medium">Mathematical probability is strictly locked between <strong className="text-slate-500">0 (Impossible)</strong> and <strong className="text-blue-500">1 (Unconditionally Certain)</strong>.</p>
             <p className="text-sm text-foreground/80 leading-relaxed font-medium mt-3">You may write answers as fractions or decimals, but <strong>never</strong> as odds (e.g. 1 in 5).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
