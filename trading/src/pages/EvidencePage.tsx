import { FileCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export function EvidencePage() {
  return (
    <div>
      <PageHeader
        title="Evidence"
        description="AI receipts, audit events, and strategy lifecycle evidence for full traceability"
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option>All Types</option>
          <option>AI Invocation</option>
          <option>Strategy Lifecycle</option>
          <option>Backtest</option>
          <option>Forward Runner</option>
          <option>Execution</option>
        </select>
        <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option>All Strategies</option>
        </select>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <FileCheck size={28} className="mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            No evidence records yet. All AI actions, strategy changes, backtests, and executions will be logged here with full provenance.
          </p>
        </div>
      </div>
    </div>
  );
}
