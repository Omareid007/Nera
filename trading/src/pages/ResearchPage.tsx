import { Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export function ResearchPage() {
  return (
    <div>
      <PageHeader
        title="Research"
        description="Universe and watchlist management — symbols, categories, themes, and strategy eligibility"
      />

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search symbols, ETFs, sectors..."
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Watchlists</h2>
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              Create watchlists to organize symbols for your strategies. Watchlists can be linked to World Monitor intelligence.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Universes</h2>
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              Research universes define the candidate symbols for strategies. Build from watchlists, themes, or intelligence clusters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
