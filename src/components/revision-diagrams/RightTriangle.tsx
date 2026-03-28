interface RightTriangleProps {
  width?: number;
  height?: number;
  className?: string;
  labels?: {
    hypotenuse?: string;
    opposite?: string;
    adjacent?: string;
    angle?: string;
  };
  highlight?: 'sin' | 'cos' | 'tan';
}

export function RightTriangle({
  width = 400,
  height = 300,
  className = "",
  labels = {},
  highlight,
}: RightTriangleProps) {
  const padding = 60;
  const baseWidth = 200;
  const baseHeight = 150;
  
  const x1 = padding;
  const y1 = height - padding;
  const x2 = x1 + baseWidth;
  const y2 = y1;
  const x3 = x1;
  const y3 = y1 - baseHeight;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Right triangle diagram"
      role="img"
    >
      <title>Right Triangle</title>
      
      {/* Triangle */}
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      
      {/* Right angle marker */}
      <path
        d={`M ${x1 + 12} ${y1} L ${x1 + 12} ${y1 - 12} L ${x1} ${y1 - 12}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Angle arc */}
      <path
        d={`M ${x1 + 30} ${y1} A 30 30 0 0 1 ${x1 + 21.2} ${y1 - 21.2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      
      {/* Labels */}
      {labels.hypotenuse && (
        <text
          x={(x2 + x3) / 2 + 15}
          y={(y2 + y3) / 2}
          className="text-sm font-medium fill-current"
        >
          {labels.hypotenuse}
        </text>
      )}
      
      {labels.opposite && (
        <text
          x={x1 - 25}
          y={(y1 + y3) / 2}
          className="text-sm font-medium fill-current"
        >
          {labels.opposite}
        </text>
      )}
      
      {labels.adjacent && (
        <text
          x={(x1 + x2) / 2}
          y={y1 + 25}
          textAnchor="middle"
          className="text-sm font-medium fill-current"
        >
          {labels.adjacent}
        </text>
      )}
      
      {labels.angle && (
        <text
          x={x1 + 45}
          y={y1 - 8}
          className="text-sm font-medium fill-current"
        >
          {labels.angle}
        </text>
      )}
      
      {/* Highlight ratio */}
      {highlight && (
        <text
          x={width / 2}
          y={30}
          textAnchor="middle"
          className="text-base font-semibold fill-current"
        >
          {highlight === 'sin' && `sin θ = ${labels.opposite || 'opp'} / ${labels.hypotenuse || 'hyp'}`}
          {highlight === 'cos' && `cos θ = ${labels.adjacent || 'adj'} / ${labels.hypotenuse || 'hyp'}`}
          {highlight === 'tan' && `tan θ = ${labels.opposite || 'opp'} / ${labels.adjacent || 'adj'}`}
        </text>
      )}
    </svg>
  );
}
