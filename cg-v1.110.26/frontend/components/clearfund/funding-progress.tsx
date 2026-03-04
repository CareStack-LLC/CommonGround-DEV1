'use client';

interface FundingProgressProps {
  funded: number;
  total: number;
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export default function FundingProgress({
  funded,
  total,
  className = '',
  showLabels = true,
  size = 'md'
}: FundingProgressProps) {
  const percentage = total > 0 ? Math.min((funded / total) * 100, 100) : 0;
  const remaining = Math.max(total - funded, 0);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3'
  };

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-orange-500';
  };

  return (
    <div className={className}>
      {showLabels && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">
            {formatCurrency(funded)} of {formatCurrency(total)} funded
          </span>
          <span className="font-medium text-gray-900">{Math.round(percentage)}%</span>
        </div>
      )}

      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightClasses[size]}`}>
        <div
          className={`${heightClasses[size]} ${getProgressColor()} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {showLabels && remaining > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(remaining)} remaining
        </p>
      )}
    </div>
  );
}
