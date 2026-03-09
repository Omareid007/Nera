type Status = 'active' | 'paused' | 'stopped' | 'draft' | 'running' | 'complete' | 'failed' | 'pending' | 'paper' | 'proposed' | 'validated' | 'archived' | 'backtesting';

const STATUS_STYLES: Record<Status, string> = {
  active: 'bg-[var(--color-active)]/15 text-[var(--color-active)]',
  running: 'bg-[var(--color-active)]/15 text-[var(--color-active)]',
  complete: 'bg-[var(--color-active)]/15 text-[var(--color-active)]',
  validated: 'bg-[var(--color-active)]/15 text-[var(--color-active)]',
  paused: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  pending: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  proposed: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  backtesting: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  paper: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
  stopped: 'bg-[var(--color-loss)]/15 text-[var(--color-loss)]',
  failed: 'bg-[var(--color-loss)]/15 text-[var(--color-loss)]',
  archived: 'bg-[var(--color-surface-3)] text-[var(--color-text-tertiary)]',
  draft: 'bg-[var(--color-surface-3)] text-[var(--color-text-tertiary)]',
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {label ?? status}
    </span>
  );
}
