interface TreeDiagramProps {
  width?: number;
  height?: number;
  className?: string;
  data: {
    stage1: Array<{ label: string; prob: string }>;
    stage2: Array<Array<{ label: string; prob: string }>>;
  };
  showProducts?: boolean;
}

export function TreeDiagram({
  width = 600,
  height = 400,
  className = "",
  data,
  showProducts = true,
}: TreeDiagramProps) {
  const padding = { left: 40, right: 120, top: 40, bottom: 40 };
  const stage1X = padding.left + 60;
  const stage2X = width - padding.right - 100;
  
  const stage1Count = data.stage1.length;
  const stage1Spacing = (height - padding.top - padding.bottom) / (stage1Count + 1);
  
  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-label="Tree diagram"
      role="img"
    >
      <title>Probability Tree Diagram</title>
      
      {/* Start point */}
      <circle cx={padding.left} cy={height / 2} r="4" fill="currentColor" />
      
      {/* Stage 1 branches */}
      {data.stage1.map((branch1, i) => {
        const y1 = padding.top + (i + 1) * stage1Spacing;
        
        // Stage 2 setup for this branch
        const stage2Count = data.stage2[i]?.length || 0;
        const stage2Spacing = stage1Spacing / (stage2Count + 1);
        const stage2BaseY = y1 - stage1Spacing / 2;
        
        return (
          <g key={i}>
            {/* Stage 1 branch line */}
            <line
              x1={padding.left}
              y1={height / 2}
              x2={stage1X}
              y2={y1}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            
            {/* Stage 1 label and probability */}
            <text
              x={(padding.left + stage1X) / 2}
              y={y1 - 10}
              textAnchor="middle"
              className="text-sm font-medium fill-current"
            >
              {branch1.label}
            </text>
            <text
              x={(padding.left + stage1X) / 2}
              y={y1 + 5}
              textAnchor="middle"
              className="text-xs fill-current"
            >
              {branch1.prob}
            </text>
            
            {/* Stage 1 node */}
            <circle cx={stage1X} cy={y1} r="4" fill="currentColor" />
            
            {/* Stage 2 branches */}
            {data.stage2[i]?.map((branch2, j) => {
              const y2 = stage2BaseY + (j + 1) * stage2Spacing;
              
              return (
                <g key={`${i}-${j}`}>
                  {/* Stage 2 branch line */}
                  <line
                    x1={stage1X}
                    y1={y1}
                    x2={stage2X}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  
                  {/* Stage 2 label and probability */}
                  <text
                    x={(stage1X + stage2X) / 2}
                    y={y2 - 10}
                    textAnchor="middle"
                    className="text-sm font-medium fill-current"
                  >
                    {branch2.label}
                  </text>
                  <text
                    x={(stage1X + stage2X) / 2}
                    y={y2 + 5}
                    textAnchor="middle"
                    className="text-xs fill-current"
                  >
                    {branch2.prob}
                  </text>
                  
                  {/* Stage 2 node */}
                  <circle cx={stage2X} cy={y2} r="4" fill="currentColor" />
                  
                  {/* Product (if enabled) */}
                  {showProducts && (
                    <text
                      x={stage2X + 15}
                      y={y2 + 4}
                      className="text-xs fill-current"
                    >
                      {branch1.prob} × {branch2.prob}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
