import { Menu } from 'lucide-react';

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-4">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-[var(--color-active)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">Paper Mode</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-tertiary)]">v0.1.0</span>
      </div>
    </header>
  );
}
