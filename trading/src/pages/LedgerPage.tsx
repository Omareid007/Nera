import { useState, useEffect } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { listLedger, listStrategies, type LedgerEntry, type StrategyIndexEntry } from '@/lib/api';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

const TYPE_COLORS: Record<string, string> = {
  order: 'bg-blue-500/20 text-blue-400',
  fill: 'bg-emerald-500/20 text-emerald-400',
  fee: 'bg-amber-500/20 text-amber-400',
  adjustment: 'bg-purple-500/20 text-purple-400',
  deposit: 'bg-teal-500/20 text-teal-400',
  withdrawal: 'bg-red-500/20 text-red-400',
};

export function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listLedger(typeFilter || strategyFilter ? { type: typeFilter || undefined, strategyId: strategyFilter || undefined } : undefined)
        .then((r) => setEntries(r.ledgerEntries)),
      listStrategies().then((r) => setStrategies(r.strategies)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [typeFilter, strategyFilter]);

  return (
    <div>
      <PageHeader title="Ledger" description="Complete audit trail — orders, fills, fees, and P&L breakdown" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={strategyFilter} onChange={(e) => { setStrategyFilter(e.target.value); setLoading(true); }}
          className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option value="">All Strategies</option>
          {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setLoading(true); }}
          className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <option value="">All Types</option>
          <option value="order">Orders</option>
          <option value="fill">Fills</option>
          <option value="fee">Fees</option>
          <option value="adjustment">Adjustments</option>
        </select>
        <span className="text-xs text-[var(--color-text-muted)]">{entries.length} entries</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={20} /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <ScrollText size={28} className="mb-3 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">No ledger entries yet. Trade activity will appear here as orders are placed and filled.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="text-left text-[var(--color-text-tertiary)]">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--color-surface-2)]">
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{timeAgo(entry.timestamp)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_COLORS[entry.type] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{entry.description}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${entry.amount < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-profit)]'}`}>
                    {entry.amount < 0 ? '-' : '+'}${Math.abs(entry.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
