import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';

export function PortfolioPage() {
  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Positions, exposure, allocations, and P&L tracking"
        actions={<StatusBadge status="paper" label="PAPER ACCOUNT" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total Equity" value="$100,000.00" />
        <MetricCard label="Cash" value="$100,000.00" />
        <MetricCard label="Positions" value="0" />
        <MetricCard label="Unrealized P&L" value="$0.00" changeType="neutral" />
        <MetricCard label="Realized P&L" value="$0.00" changeType="neutral" />
      </div>

      {/* Positions table */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Open Positions</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
          <p className="text-center text-sm text-[var(--color-text-muted)]">No open positions. Execute paper trades to see your portfolio here.</p>
        </div>
      </div>

      {/* Allocation chart placeholder */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Allocation</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
          <p className="text-center text-sm text-[var(--color-text-muted)]">Allocation chart will appear when you have open positions.</p>
        </div>
      </div>
    </div>
  );
}
