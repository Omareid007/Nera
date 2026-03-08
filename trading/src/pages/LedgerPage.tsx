import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export function LedgerPage() {
  return (
    <div>
      <PageHeader
        title="Ledger"
        description="Complete audit trail — orders, fills, fees, and P&L breakdown"
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option>All Strategies</option>
        </select>
        <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option>All Types</option>
          <option>Orders</option>
          <option>Fills</option>
          <option>Fees</option>
        </select>
        <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option>All Time</option>
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <ScrollText size={28} className="mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No ledger entries yet. Trade activity will appear here as orders are placed and filled.</p>
        </div>
      </div>
    </div>
  );
}
