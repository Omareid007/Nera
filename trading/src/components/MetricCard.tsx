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

  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
      <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{value}</p>
      {displayChange && <p className={`mt-0.5 text-xs font-medium ${changeColor}`}>{displayChange}</p>}
      {subtitle && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
    </div>
  );
}
