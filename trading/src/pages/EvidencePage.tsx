import { useState, useEffect } from 'react';
import { FileCheck, Loader2, Brain, ArrowRightLeft, FlaskConical, Settings } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { listEvidence, type EvidenceEntry } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

const CATEGORY_META: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  ai: { icon: Brain, color: 'bg-blue-500/20 text-blue-400', label: 'AI' },
  order: { icon: ArrowRightLeft, color: 'bg-teal-500/20 text-teal-400', label: 'Order' },
  fill: { icon: ArrowRightLeft, color: 'bg-teal-500/20 text-teal-400', label: 'Fill' },
  system: { icon: Settings, color: 'bg-gray-500/20 text-gray-400', label: 'System' },
  backtest: { icon: FlaskConical, color: 'bg-purple-500/20 text-purple-400', label: 'Backtest' },
};

export function EvidencePage() {
  const [entries, setEntries] = useState<EvidenceEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listEvidence(typeFilter || undefined)
      .then((r) => setEntries(r.evidence))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load evidence'))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  return (
    <div>
      <PageHeader title="Evidence" description="Full traceability — AI invocations, strategy lifecycle, execution receipts, and audit events" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option value="">All Types</option>
          <option value="ai">AI Invocations</option>
          <option value="order">Orders</option>
          <option value="fill">Fills</option>
        </select>
        <span className="text-xs text-[var(--color-text-muted)]">{entries.length} records</span>
      </div>

      {error && <div className="mb-4 rounded-lg border border-[var(--color-loss)]/30 bg-[var(--color-loss)]/5 px-4 py-2 text-xs text-[var(--color-loss)]">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={20} /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <FileCheck size={28} className="mb-3 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              No evidence records yet. All AI actions, strategy changes, backtests, and executions are logged here with full provenance.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const meta = CATEGORY_META[entry.category] ?? CATEGORY_META.system;
            const Icon = meta.icon;
            return (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.color}`}>
                    <Icon size={10} /> {meta.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-primary)]">{entry.summary}</span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(entry.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
