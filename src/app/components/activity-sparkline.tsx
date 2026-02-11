interface SparklineProps {
  data?: number[];
}

export function ActivitySparkline({ data = [3, 7, 4, 8, 5, 9, 6, 8, 7, 9, 8, 10] }: SparklineProps) {
  const max = Math.max(...data);
  const width = 80;
  const height = 20;
  
  // Create SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - (value / max) * height;
    return `${x},${y}`;
  });
  
  const pathData = `M ${points.join(' L ')}`;
  
  return (
    <svg width={width} height={height} className="inline-block">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#22C55E', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#22C55E', stopOpacity: 0.2 }} />
        </linearGradient>
      </defs>
      <path
        d={pathData}
        fill="none"
        stroke="url(#sparkline-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Glow effect */}
      <path
        d={pathData}
        fill="none"
        stroke="#22C55E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: 'blur(2px)', opacity: 0.6 }}
      />
    </svg>
  );
}
