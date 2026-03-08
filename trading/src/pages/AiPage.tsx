import { Brain } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export function AiPage() {
  return (
    <div>
      <PageHeader
        title="AI Pulse"
        description="AI activity timeline — strategy drafts, interpretations, sentiment shifts, and review events"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity timeline */}
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Activity Timeline</h2>
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Brain size={28} className="mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                No AI activity yet. Run backtests and request AI interpretations to see activity here.
              </p>
            </div>
          </div>
        </div>

        {/* What AI is watching */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">What AI Is Watching</h2>
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
            <p className="text-xs text-[var(--color-text-muted)]">
              When strategies are active, AI monitors market events, sentiment shifts, and research signals that may impact your positions.
            </p>
          </div>

          <h2 className="mb-3 mt-6 text-sm font-semibold text-[var(--color-text-tertiary)]">Source Freshness</h2>
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
            <p className="text-xs text-[var(--color-text-muted)]">
              Provider status and data freshness will be shown here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
