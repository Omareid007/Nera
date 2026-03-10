import { Menu, Radio } from 'lucide-react';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-0)] px-4">
      <button
        onClick={onMenuToggle}
        className="rounded-md p-1 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={16} />
      </button>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 border border-[var(--color-border-subtle)]">
          <Radio size={10} className="text-[var(--color-active)]" />
          <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">Paper Trading</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">v2.0</span>
      </div>
    </header>
  );
}
