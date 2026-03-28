interface CumulativeFrequencyCurveProps {
  width?: number;
  height?: number;
  className?: string;
  data: Array<{ upperBound: number; cumFreq: number }>;
  showMedian?: boolean;
  totalFreq?: number;
}

export function CumulativeFrequencyCurve({
  width = 560,
  height = 400,
  className = "",
  data,
  showMedian = false,
  totalFreq,
}: CumulativeFrequencyCurveProps) {
  const padding = { left: 60, right: 40, top: 40, bottom: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  
  const maxX = Math.max(...data.map(d => d.upperBound));
  const maxY = Math.max(...data.map(d => d.cumFreq));
  
  const getX = (value: number) => padding.left + (value / maxX) * plotWidth;
  const getY = (value: number) => padding.top + plotHeight - (value / maxY) * plotHeight;
  
  // Generate smooth curve path
  const pathData = data.map((point, i) => {
    const x = getX(point.upperBound);
    const y = getY(point.cumFreq);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');
  
  const medianY = totalFreq ? totalFreq / 2 : maxY / 2;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Cumulative frequency curve"
      role="img"
    >
      <title>Cumulative Frequency Curve</title>
      
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
        <line
          key={`grid-y-${i}`}
          x1={padding.left}
          y1={padding.top + plotHeight * (1 - frac)}
          x2={width - padding.right}
          y2={padding.top + plotHeight * (1 - frac)}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.2"
        />
      ))}
      
      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Y-axis label */}
      <text
        x={20}
        y={padding.top + plotHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90 20 ${padding.top + plotHeight / 2})`}
        className="text-sm font-medium fill-current"
      >
        Cumulative Frequency
      </text>
      
      {/* X-axis label */}
      <text
        x={padding.left + plotWidth / 2}
        y={height - 20}
        textAnchor="middle"
        className="text-sm font-medium fill-current"
      >
        Value
      </text>
      
      {/* Curve */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      
      {/* Points */}
      {data.map((point, i) => (
        <circle
          key={i}
          cx={getX(point.upperBound)}
          cy={getY(point.cumFreq)}
          r="4"
          fill="currentColor"
        />
      ))}
      
      {/* Median line */}
      {showMedian && (
        <>
          <line
            x1={padding.left}
            y1={getY(medianY)}
            x2={width - padding.right}
            y2={getY(medianY)}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            opacity="0.6"
          />
          <text
            x={padding.left - 10}
            y={getY(medianY) + 4}
            textAnchor="end"
            className="text-xs font-medium fill-current"
          >
            Median ({medianY})
          </text>
        </>
      )}
      
      {/* Tick labels */}
      {data.map((point, i) => (
        <text
          key={`label-${i}`}
          x={getX(point.upperBound)}
          y={height - padding.bottom + 20}
          textAnchor="middle"
          className="text-xs fill-current"
        >
          {point.upperBound}
        </text>
      ))}
    </svg>
  );
}
