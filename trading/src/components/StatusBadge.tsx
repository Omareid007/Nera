type Status = 'active' | 'paused' | 'stopped' | 'draft' | 'running' | 'complete' | 'failed' | 'pending' | 'paper' | 'proposed' | 'validated' | 'archived' | 'backtesting';

const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-[var(--color-active)]/10', text: 'text-[var(--color-active)]', dot: 'bg-[var(--color-active)]' },
  running: { bg: 'bg-[var(--color-active)]/10', text: 'text-[var(--color-active)]', dot: 'bg-[var(--color-active)]' },
  complete: { bg: 'bg-[var(--color-active)]/10', text: 'text-[var(--color-active)]', dot: 'bg-[var(--color-active)]' },
  validated: { bg: 'bg-[var(--color-active)]/10', text: 'text-[var(--color-active)]', dot: 'bg-[var(--color-active)]' },
  paused: { bg: 'bg-[var(--color-warning)]/10', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  pending: { bg: 'bg-[var(--color-warning)]/10', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  proposed: { bg: 'bg-[var(--color-warning)]/10', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  backtesting: { bg: 'bg-[var(--color-warning)]/10', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  paper: { bg: 'bg-[var(--color-info)]/10', text: 'text-[var(--color-info)]', dot: 'bg-[var(--color-info)]' },
  stopped: { bg: 'bg-[var(--color-loss)]/10', text: 'text-[var(--color-loss)]', dot: 'bg-[var(--color-loss)]' },
  failed: { bg: 'bg-[var(--color-loss)]/10', text: 'text-[var(--color-loss)]', dot: 'bg-[var(--color-loss)]' },
  archived: { bg: 'bg-[var(--color-surface-3)]', text: 'text-[var(--color-text-tertiary)]', dot: 'bg-[var(--color-text-muted)]' },
  draft: { bg: 'bg-[var(--color-surface-3)]', text: 'text-[var(--color-text-tertiary)]', dot: 'bg-[var(--color-text-muted)]' },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${status === 'running' ? 'animate-pulse' : ''}`} />
      {label ?? status}
    </span>
  );
}
