import { Menu, Zap } from 'lucide-react';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]/80 backdrop-blur-md px-4">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 border border-[var(--color-border-subtle)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-active)] animate-pulse-green" />
          <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Paper Trading</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
          <Zap size={11} className="text-[var(--color-accent)]" />
          <span>v2.0.0</span>
        </div>
      </div>
    </header>
  );
}
