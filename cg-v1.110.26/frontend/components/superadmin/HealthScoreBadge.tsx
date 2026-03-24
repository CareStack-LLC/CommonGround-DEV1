'use client';

interface HealthScoreBadgeProps {
  score: number;
  riskLevel?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getConfig(score: number, riskLevel?: string) {
  if (riskLevel === 'critical' || score < 40) {
    return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', label: 'Critical' };
  }
  if (riskLevel === 'at_risk' || score < 70) {
    return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', label: 'At Risk' };
  }
  return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Healthy' };
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export function HealthScoreBadge({ score, riskLevel, size = 'md', showLabel = false }: HealthScoreBadgeProps) {
  const config = getConfig(score, riskLevel);

  return (
    <div className="flex items-center gap-2">
      <div className={`${SIZE_CLASSES[size]} ${config.bg} ${config.text} border ${config.border} rounded-full flex items-center justify-center font-bold`}>
        {score}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      )}
    </div>
  );
}
