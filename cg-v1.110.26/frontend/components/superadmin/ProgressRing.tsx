'use client';

interface ProgressRingProps {
  value: number;  // 0-100
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  sublabel?: string;
}

function getDefaultColor(value: number): string {
  if (value >= 80) return 'var(--cg-sage)';
  if (value >= 60) return 'var(--cg-slate-light)';
  if (value >= 40) return 'var(--cg-amber)';
  return 'var(--cg-error)';
}

export function ProgressRing({
  value,
  label,
  size = 100,
  strokeWidth = 8,
  color,
  sublabel,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const ringColor = color || getDefaultColor(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-cg-slate-tint">
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-cg-slate-muted">{label}</div>
        {sublabel && <div className="text-[10px] text-cg-slate-strong">{sublabel}</div>}
      </div>
    </div>
  );
}
