import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  change?: number | string;
  changeType?: 'profit' | 'loss' | 'neutral';
  subtitle?: string;
}

export function MetricCard({ label, value, change, changeType, subtitle }: MetricCardProps) {
  let displayChange: string | undefined;
  let resolvedType: 'profit' | 'loss' | 'neutral' = changeType ?? 'neutral';

  if (change !== undefined) {
    if (typeof change === 'number') {
      displayChange = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
      if (!changeType) resolvedType = change > 0 ? 'profit' : change < 0 ? 'loss' : 'neutral';
    } else {
      displayChange = change;
    }
  }

  const changeColor = {
    profit: 'text-[var(--color-profit)]',
    loss: 'text-[var(--color-loss)]',
    neutral: 'text-[var(--color-text-secondary)]',
  }[resolvedType];

  const changeBg = {
    profit: 'bg-[var(--color-profit-bg)]',
    loss: 'bg-[var(--color-loss-bg)]',
    neutral: 'bg-[var(--color-surface-2)]',
  }[resolvedType];

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3.5 transition-colors duration-150 hover:border-[var(--color-border-default)]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {displayChange && (
          <span className={`inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold tabular-nums ${changeColor} ${changeBg}`}>
            {resolvedType === 'profit' && <TrendingUp size={9} />}
            {resolvedType === 'loss' && <TrendingDown size={9} />}
            {displayChange}
          </span>
        )}
        {subtitle && <span className="text-[10px] text-[var(--color-text-muted)]">{subtitle}</span>}
      </div>
    </div>
  );
}
