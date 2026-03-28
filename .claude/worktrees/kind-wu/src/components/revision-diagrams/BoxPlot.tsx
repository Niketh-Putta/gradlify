interface BoxPlotProps {
  width?: number;
  height?: number;
  className?: string;
  data: {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  };
  scale?: { min: number; max: number };
  showLabels?: boolean;
}

export function BoxPlot({
  width = 560,
  height = 180,
  className = "",
  data,
  scale,
  showLabels = true,
}: BoxPlotProps) {
  const padding = { left: 40, right: 40, top: 40, bottom: 60 };
  const plotWidth = width - padding.left - padding.right;
  const boxHeight = 60;
  const boxY = padding.top;
  
  const scaleMin = scale?.min ?? data.min;
  const scaleMax = scale?.max ?? data.max;
  const range = scaleMax - scaleMin;
  
  const getX = (value: number) => padding.left + ((value - scaleMin) / range) * plotWidth;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Box plot diagram"
      role="img"
    >
      <title>Box Plot</title>
      
      {/* Scale line */}
      <line
        x1={padding.left}
        y1={boxY + boxHeight + 20}
        x2={width - padding.right}
        y2={boxY + boxHeight + 20}
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
      
      {/* Whiskers */}
      <line
        x1={getX(data.min)}
        y1={boxY + boxHeight / 2}
        x2={getX(data.q1)}
        y2={boxY + boxHeight / 2}
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1={getX(data.q3)}
        y1={boxY + boxHeight / 2}
        x2={getX(data.max)}
        y2={boxY + boxHeight / 2}
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Min/Max lines */}
      <line
        x1={getX(data.min)}
        y1={boxY + 10}
        x2={getX(data.min)}
        y2={boxY + boxHeight - 10}
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1={getX(data.max)}
        y1={boxY + 10}
        x2={getX(data.max)}
        y2={boxY + boxHeight - 10}
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Box */}
      <rect
        x={getX(data.q1)}
        y={boxY}
        width={getX(data.q3) - getX(data.q1)}
        height={boxHeight}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Median line */}
      <line
        x1={getX(data.median)}
        y1={boxY}
        x2={getX(data.median)}
        y2={boxY + boxHeight}
        stroke="currentColor"
        strokeWidth="2.5"
      />
      
      {/* Labels */}
      {showLabels && (
        <>
          <text x={getX(data.min)} y={boxY + boxHeight + 40} textAnchor="middle" className="text-xs fill-current">
            Min: {data.min}
          </text>
          <text x={getX(data.q1)} y={boxY + boxHeight + 40} textAnchor="middle" className="text-xs fill-current">
            Q1: {data.q1}
          </text>
          <text x={getX(data.median)} y={boxY - 10} textAnchor="middle" className="text-xs font-medium fill-current">
            Median: {data.median}
          </text>
          <text x={getX(data.q3)} y={boxY + boxHeight + 40} textAnchor="middle" className="text-xs fill-current">
            Q3: {data.q3}
          </text>
          <text x={getX(data.max)} y={boxY + boxHeight + 40} textAnchor="middle" className="text-xs fill-current">
            Max: {data.max}
          </text>
        </>
      )}
    </svg>
  );
}
