import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { listStrategies, type StrategyIndexEntry } from '@/lib/api';

export function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    listStrategies().then((r) => { setStrategies(r.strategies); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? strategies : strategies.filter((s) => s.status === filter.toLowerCase());

  return (
    <div>
      <PageHeader title="Strategies" description="Manage your trading strategies — create, backtest, deploy, and monitor"
        actions={
          <Link to="/create" className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)] transition-colors hover:bg-[var(--color-accent-hover)]">
            <PlusCircle size={16} /> New Strategy
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        {['All', 'Draft', 'Paper', 'Active', 'Archived'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-2xl bg-[var(--color-surface-2)] p-4"><PlusCircle size={28} className="text-[var(--color-text-muted)]" /></div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No strategies yet</h3>
            <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">Create your first strategy using our guided wizard.</p>
            <Link to="/create" className="mt-4 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-surface-0)]">Create Strategy</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <Link key={s.id} to={`/strategy/${s.id}`}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4 transition-colors hover:border-[var(--color-border-default)]">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{s.name}</h3>
                <p className="mt-0.5 text-xs text-[var(--color-text-tertiary)]">{s.templateId} &middot; {new Date(s.updatedAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={s.status as 'draft' | 'active' | 'paused' | 'paper'} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
