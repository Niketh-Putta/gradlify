interface NumberLineProps {
  width?: number;
  height?: number;
  className?: string;
  min?: number;
  max?: number;
  points?: Array<{ value: number; type: 'open' | 'closed'; label?: string }>;
  interval?: number;
}

export function NumberLine({
  width = 560,
  height = 120,
  className = "",
  min = -5,
  max = 5,
  points = [],
  interval = 1,
}: NumberLineProps) {
  const padding = 40;
  const lineY = height / 2;
  const scale = (width - padding * 2) / (max - min);

  const getX = (value: number) => padding + (value - min) * scale;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Number line diagram"
      role="img"
    >
      <title>Number Line</title>
      
      {/* Main line */}
      <line
        x1={padding}
        y1={lineY}
        x2={width - padding}
        y2={lineY}
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Arrows */}
      <path
        d={`M ${width - padding} ${lineY} L ${width - padding - 8} ${lineY - 4} M ${width - padding} ${lineY} L ${width - padding - 8} ${lineY + 4}`}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Tick marks and labels */}
      {Array.from({ length: Math.floor((max - min) / interval) + 1 }, (_, i) => {
        const value = min + i * interval;
        const x = getX(value);
        return (
          <g key={i}>
            <line
              x1={x}
              y1={lineY - 6}
              x2={x}
              y2={lineY + 6}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <text
              x={x}
              y={lineY + 24}
              textAnchor="middle"
              className="text-sm fill-current"
            >
              {value}
            </text>
          </g>
        );
      })}
      
      {/* Points */}
      {points.map((point, i) => {
        const x = getX(point.value);
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={lineY}
              r="6"
              fill={point.type === 'closed' ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
            />
            {point.label && (
              <text
                x={x}
                y={lineY - 16}
                textAnchor="middle"
                className="text-sm font-medium fill-current"
              >
                {point.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
