interface VennDiagramProps {
  width?: number;
  height?: number;
  className?: string;
  labels?: { a?: string; b?: string; c?: string };
  values?: {
    onlyA?: number;
    onlyB?: number;
    onlyC?: number;
    aAndB?: number;
    aAndC?: number;
    bAndC?: number;
    all?: number;
    none?: number;
  };
  circles?: 2 | 3;
  shaded?: string[];
}

export function VennDiagram({
  width = 500,
  height = 400,
  className = "",
  labels = {},
  values = {},
  circles = 2,
  shaded = [],
}: VennDiagramProps) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 80;
  const offset = 50;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label={`Venn diagram with ${circles} circles`}
      role="img"
    >
      <title>Venn Diagram</title>
      
      {/* Rectangle boundary */}
      <rect
        x={40}
        y={40}
        width={width - 80}
        height={height - 80}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        rx="8"
      />
      
      {circles === 2 ? (
        <>
          {/* Circle A */}
          <circle
            cx={centerX - offset}
            cy={centerY}
            r={radius}
            fill={shaded.includes('A') ? 'currentColor' : 'none'}
            fillOpacity={shaded.includes('A') ? 0.15 : 0}
            stroke="currentColor"
            strokeWidth="2"
          />
          
          {/* Circle B */}
          <circle
            cx={centerX + offset}
            cy={centerY}
            r={radius}
            fill={shaded.includes('B') ? 'currentColor' : 'none'}
            fillOpacity={shaded.includes('B') ? 0.15 : 0}
            stroke="currentColor"
            strokeWidth="2"
          />
          
          {/* Labels */}
          <text
            x={centerX - offset - radius / 2}
            y={centerY - radius - 10}
            className="text-base font-semibold fill-current"
          >
            {labels.a || 'A'}
          </text>
          <text
            x={centerX + offset + radius / 2}
            y={centerY - radius - 10}
            className="text-base font-semibold fill-current"
          >
            {labels.b || 'B'}
          </text>
          
          {/* Values */}
          {values.onlyA !== undefined && (
            <text x={centerX - offset - 35} y={centerY + 5} className="text-sm fill-current">
              {values.onlyA}
            </text>
          )}
          {values.aAndB !== undefined && (
            <text x={centerX} y={centerY + 5} textAnchor="middle" className="text-sm fill-current">
              {values.aAndB}
            </text>
          )}
          {values.onlyB !== undefined && (
            <text x={centerX + offset + 35} y={centerY + 5} className="text-sm fill-current">
              {values.onlyB}
            </text>
          )}
          {values.none !== undefined && (
            <text x={60} y={60} className="text-sm fill-current">
              {values.none}
            </text>
          )}
        </>
      ) : (
        <>
          {/* Three circles */}
          <circle
            cx={centerX}
            cy={centerY - offset}
            r={radius}
            fill={shaded.includes('A') ? 'currentColor' : 'none'}
            fillOpacity={shaded.includes('A') ? 0.15 : 0}
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx={centerX - offset}
            cy={centerY + offset}
            r={radius}
            fill={shaded.includes('B') ? 'currentColor' : 'none'}
            fillOpacity={shaded.includes('B') ? 0.15 : 0}
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx={centerX + offset}
            cy={centerY + offset}
            r={radius}
            fill={shaded.includes('C') ? 'currentColor' : 'none'}
            fillOpacity={shaded.includes('C') ? 0.15 : 0}
            stroke="currentColor"
            strokeWidth="2"
          />
          
          {/* Labels */}
          <text x={centerX} y={centerY - offset - radius - 10} textAnchor="middle" className="text-base font-semibold fill-current">
            {labels.a || 'A'}
          </text>
          <text x={centerX - offset - radius / 2} y={centerY + offset + radius + 20} className="text-base font-semibold fill-current">
            {labels.b || 'B'}
          </text>
          <text x={centerX + offset + radius / 2} y={centerY + offset + radius + 20} className="text-base font-semibold fill-current">
            {labels.c || 'C'}
          </text>
        </>
      )}
    </svg>
  );
}
