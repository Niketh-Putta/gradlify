interface HistogramProps {
  width?: number;
  height?: number;
  className?: string;
  data: Array<{
    classLower: number;
    classUpper: number;
    frequency: number;
  }>;
  showFrequencyDensity?: boolean;
}

export function Histogram({
  width = 560,
  height = 400,
  className = "",
  data,
  showFrequencyDensity = false,
}: HistogramProps) {
  const padding = { left: 60, right: 40, top: 40, bottom: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  
  const minX = Math.min(...data.map(d => d.classLower));
  const maxX = Math.max(...data.map(d => d.classUpper));
  const rangeX = maxX - minX;
  
  const values = data.map(d => 
    showFrequencyDensity 
      ? d.frequency / (d.classUpper - d.classLower)
      : d.frequency
  );
  const maxY = Math.max(...values);
  
  const getX = (value: number) => padding.left + ((value - minX) / rangeX) * plotWidth;
  const getY = (value: number) => padding.top + plotHeight - (value / maxY) * plotHeight;
  const getHeight = (value: number) => (value / maxY) * plotHeight;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Histogram"
      role="img"
    >
      <title>Histogram</title>
      
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
        <line
          key={`grid-${i}`}
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
      
      {/* Bars */}
      {data.map((bar, i) => {
        const value = values[i];
        const x = getX(bar.classLower);
        const barWidth = getX(bar.classUpper) - x;
        const barHeight = getHeight(value);
        
        return (
          <rect
            key={i}
            x={x}
            y={getY(value)}
            width={barWidth}
            height={barHeight}
            fill="currentColor"
            fillOpacity="0.3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        );
      })}
      
      {/* Y-axis label */}
      <text
        x={20}
        y={padding.top + plotHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90 20 ${padding.top + plotHeight / 2})`}
        className="text-sm font-medium fill-current"
      >
        {showFrequencyDensity ? 'Frequency Density' : 'Frequency'}
      </text>
      
      {/* X-axis label */}
      <text
        x={padding.left + plotWidth / 2}
        y={height - 20}
        textAnchor="middle"
        className="text-sm font-medium fill-current"
      >
        Class Intervals
      </text>
      
      {/* X-axis tick labels */}
      {data.map((bar, i) => (
        <g key={`label-${i}`}>
          <text
            x={getX(bar.classLower)}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            className="text-xs fill-current"
          >
            {bar.classLower}
          </text>
          {i === data.length - 1 && (
            <text
              x={getX(bar.classUpper)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-current"
            >
              {bar.classUpper}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
