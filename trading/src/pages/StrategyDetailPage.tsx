import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, FlaskConical, Trash2, Brain } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { getStrategy, deleteStrategy, runBacktest, listBacktestRuns, interpretStrategy, type Strategy, type BacktestIndexEntry } from '@/lib/api';

export function StrategyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [backtests, setBacktests] = useState<BacktestIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [interpreting, setInterpreting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getStrategy(id).then((r) => setStrategy(r.strategy)).catch(() => null),
      listBacktestRuns(id).then((r) => setBacktests(r.backtestRuns)).catch(() => null),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleBacktest = useCallback(async () => {
    if (!id) return;
    setRunning(true);
    try {
      const result = await runBacktest({ strategyId: id });
      navigate(`/backtests?highlight=${result.backtestRun.id}`);
    } catch {
      setRunning(false);
    }
  }, [id, navigate]);

  const handleInterpret = useCallback(async () => {
    if (!id) return;
    setInterpreting(true);
    try {
      await interpretStrategy(id);
      navigate('/ai');
    } catch {
      setInterpreting(false);
    }
  }, [id, navigate]);

  const handleDelete = useCallback(async () => {
    if (!id || !confirm('Delete this strategy? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteStrategy(id);
      navigate('/strategies');
    } catch {
      setDeleting(false);
    }
  }, [id, navigate]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;
  if (!strategy) return <div className="py-20 text-center text-sm text-[var(--color-text-muted)]">Strategy not found</div>;

  return (
    <div>
      <PageHeader title={strategy.name} description={strategy.description || `${strategy.templateId} strategy`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={strategy.status as 'draft'} />
            <button onClick={handleInterpret} disabled={interpreting}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-info)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 transition-all duration-200 hover:brightness-110">
              {interpreting ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
              {interpreting ? 'Analyzing...' : 'Interpret'}
            </button>
            <button onClick={handleBacktest} disabled={running}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-[var(--color-surface-0)] disabled:opacity-50">
              {running ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              {running ? 'Running...' : 'Run Backtest'}
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-loss)] hover:bg-[var(--color-loss)]/10 disabled:opacity-50">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        }
      />

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Template" value={strategy.templateId} />
        <MetricCard label="Universe" value={`${strategy.universe.length} symbols`} subtitle={strategy.universe.slice(0, 5).join(', ')} />
        <MetricCard label="Stop Loss" value={`${strategy.riskLimits.stopLossPct}%`} />
        <MetricCard label="Take Profit" value={`${strategy.riskLimits.takeProfitPct}%`} />
      </div>

      {/* Parameters */}
      <div className="mt-6 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Parameters</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(strategy.parameters).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[var(--color-text-tertiary)]">{key}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{String(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Backtest history */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Backtest History</h3>
        {backtests.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">No backtests yet. Click "Run Backtest" to test this strategy on historical data.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {backtests.map((bt) => (
              <Link key={bt.id} to={`/backtests?id=${bt.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs transition-colors hover:border-[var(--color-border-default)]">
                <div>
                  <span className="text-[var(--color-text-secondary)]">{new Date(bt.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  {bt.totalReturn !== null && (
                    <span className={bt.totalReturn >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}>
                      {bt.totalReturn >= 0 ? '+' : ''}{bt.totalReturn.toFixed(2)}%
                    </span>
                  )}
                  <StatusBadge status={bt.status as 'complete' | 'running' | 'failed'} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
