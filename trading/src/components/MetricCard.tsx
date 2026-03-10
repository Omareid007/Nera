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
    <div className="group rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4 transition-all duration-200 hover:border-[var(--color-border-default)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {displayChange && (
          <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${changeColor} ${changeBg}`}>
            {resolvedType === 'profit' && <TrendingUp size={10} />}
            {resolvedType === 'loss' && <TrendingDown size={10} />}
            {displayChange}
          </span>
        )}
        {subtitle && <span className="text-[11px] text-[var(--color-text-muted)]">{subtitle}</span>}
      </div>
    </div>
  );
}
