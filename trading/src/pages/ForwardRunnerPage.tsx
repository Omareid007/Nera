import { Play } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

export function ForwardRunnerPage() {
  return (
    <div>
      <PageHeader
        title="Forward Runner"
        description="Paper-only strategy evaluation — generate signals and proposed actions"
        actions={<StatusBadge status="paper" label="PAPER ONLY" />}
      />

      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-2xl bg-[var(--color-surface-2)] p-4">
            <Play size={28} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No active runners</h3>
          <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">
            Deploy a strategy to paper mode to start generating forward signals. The runner evaluates your strategy against live market data.
          </p>
        </div>
      </div>
    </div>
  );
}
