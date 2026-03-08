import { ArrowRightLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

export function ExecutionPage() {
  return (
    <div>
      <PageHeader
        title="Execution Center"
        description="View proposed orders, approvals, and paper execution history"
        actions={<StatusBadge status="paper" label="PAPER MODE" />}
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-[var(--color-surface-1)] p-1">
        {['Proposed', 'Approved', 'Submitted', 'History'].map((tab, i) => (
          <button
            key={tab}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              i === 0
                ? 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <ArrowRightLeft size={28} className="mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No execution activity. Run a forward runner to generate trade proposals.</p>
        </div>
      </div>
    </div>
  );
}
