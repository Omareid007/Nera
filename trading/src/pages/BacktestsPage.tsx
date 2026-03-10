import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FlaskConical, Loader2, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3, Target, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import { listBacktestRuns, getBacktestRun, type BacktestIndexEntry, type BacktestRun } from '@/lib/api';

export function BacktestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [runs, setRuns] = useState<BacktestIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedTrades, setExpandedTrades] = useState(false);

  const highlightId = searchParams.get('highlight');
  const detailId = searchParams.get('id');

  useEffect(() => {
    listBacktestRuns()
      .then((r) => setRuns(r.backtestRuns))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load backtests'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-load detail if ?id= is present or after highlight
  useEffect(() => {
    const targetId = detailId || highlightId;
    if (!targetId) return;
    setLoadingDetail(true);
    getBacktestRun(targetId)
      .then((r) => setSelectedRun(r.backtestRun))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [detailId, highlightId]);

  const selectRun = (id: string) => {
    setSearchParams({ id });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Backtests" description="View, compare, and analyze historical strategy backtests" />

      {error ? (
        <div className="rounded-lg border border-[var(--color-loss)]/30 bg-[var(--color-loss)]/5 p-6 text-center">
          <p className="text-sm text-[var(--color-loss)]">{error}</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-lg bg-[var(--color-surface-2)] p-4">
              <FlaskConical size={28} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No backtests yet</h3>
            <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">
              Create a strategy and run your first backtest to see equity curves, metrics, and trade lists.
            </p>
            <Link to="/strategies" className="mt-4 rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-medium text-[var(--color-surface-0)]">
              View Strategies
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Run list sidebar */}
          <div className="space-y-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              All Runs ({runs.length})
            </h3>
            {runs.map((bt) => (
              <button key={bt.id} onClick={() => selectRun(bt.id)}
                className={`w-full rounded-xl border p-3 text-left text-xs transition-colors ${
                  (selectedRun?.id === bt.id || highlightId === bt.id)
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] hover:border-[var(--color-border-default)]'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text-primary)]">{bt.strategyName}</span>
                  <StatusBadge status={bt.status as 'complete' | 'running' | 'failed'} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[var(--color-text-tertiary)]">{new Date(bt.createdAt).toLocaleDateString()}</span>
                  {bt.totalReturn !== null && (
                    <span className={bt.totalReturn >= 0 ? 'font-medium text-[var(--color-profit)]' : 'font-medium text-[var(--color-loss)]'}>
                      {bt.totalReturn >= 0 ? '+' : ''}{bt.totalReturn.toFixed(2)}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {loadingDetail ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>
            ) : selectedRun ? (
              <BacktestDetail run={selectedRun} expandedTrades={expandedTrades} setExpandedTrades={setExpandedTrades} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-16 text-center">
                <BarChart3 size={32} className="mb-3 text-[var(--color-text-muted)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">Select a backtest run to view results</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BacktestDetail({ run, expandedTrades, setExpandedTrades }: {
  run: BacktestRun;
  expandedTrades: boolean;
  setExpandedTrades: (v: boolean) => void;
}) {
  const m = run.metrics;

  if (run.status === 'failed') {
    return (
      <div className="rounded-lg border border-[var(--color-loss)]/30 bg-[var(--color-loss)]/5 p-6">
        <h3 className="text-sm font-semibold text-[var(--color-loss)]">Backtest Failed</h3>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{run.error || 'Unknown error'}</p>
      </div>
    );
  }

  if (run.status === 'running') {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-16">
        <Loader2 size={32} className="mb-3 animate-spin text-[var(--color-accent)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">Backtest is running...</p>
      </div>
    );
  }

  if (!m) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{run.strategyName}</h3>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            {run.templateId} &middot; {run.startDate} → {run.endDate} &middot; {run.universe.join(', ')}
          </p>
        </div>
        <Link to={`/strategy/${run.strategyId}`} className="text-xs text-[var(--color-accent)] hover:underline">
          View Strategy →
        </Link>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Return" value={`${m.totalReturn >= 0 ? '+' : ''}${m.totalReturn.toFixed(2)}%`}
          change={m.totalReturn} />
        <MetricCard label="Sharpe Ratio" value={m.sharpeRatio.toFixed(2)}
          subtitle={m.sharpeRatio >= 1 ? 'Good' : m.sharpeRatio >= 0.5 ? 'Moderate' : 'Low'} />
        <MetricCard label="Max Drawdown" value={`${m.maxDrawdown.toFixed(2)}%`}
          change={-Math.abs(m.maxDrawdown)} />
        <MetricCard label="Win Rate" value={`${m.winRate.toFixed(1)}%`}
          subtitle={`${m.totalTrades} trades`} />
      </div>

      {/* Equity curve chart */}
      {run.equityCurve.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <TrendingUp size={12} className="mr-1 inline" /> Equity Curve
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={run.equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Equity']}
                labelStyle={{ color: 'var(--color-text-tertiary)' }} />
              <Area type="monotone" dataKey="equity" stroke="var(--color-accent)" fill="url(#eqGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Drawdown chart */}
      {run.equityCurve.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <BarChart3 size={12} className="mr-1 inline" /> Drawdown
          </h4>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={run.equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-loss)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-loss)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                tickFormatter={(v: string) => v.slice(5)} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`${v.toFixed(2)}%`, 'Drawdown']}
                labelStyle={{ color: 'var(--color-text-tertiary)' }} />
              <Area type="monotone" dataKey="drawdown" stroke="var(--color-loss)" fill="url(#ddGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Extended metrics */}
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <Target size={12} className="mr-1 inline" /> Performance Metrics
        </h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Annualized Return', `${m.annualizedReturn >= 0 ? '+' : ''}${m.annualizedReturn.toFixed(2)}%`],
            ['Sortino Ratio', m.sortinoRatio.toFixed(2)],
            ['Calmar Ratio', m.calmarRatio.toFixed(2)],
            ['Profit Factor', m.profitFactor.toFixed(2)],
            ['Avg Win', `+${m.avgWin.toFixed(2)}%`],
            ['Avg Loss', `${m.avgLoss.toFixed(2)}%`],
            ['Max DD Duration', `${m.maxDrawdownDuration}d`],
            ['Avg Trade Duration', `${m.avgTradeDuration.toFixed(1)}d`],
            ['Initial Capital', `$${run.initialCapital.toLocaleString()}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-[var(--color-text-tertiary)]">{label}</span>
              <span className="font-medium text-[var(--color-text-primary)]">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data provenance */}
      <div className="flex flex-wrap gap-3 text-[10px] text-[var(--color-text-tertiary)]">
        <span>Provider: {run.provider}</span>
        <span>Bars: {run.barsAvailable} available / {run.barsMissing} missing</span>
        <span>Completed: {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}</span>
      </div>

      {/* Trade list */}
      {run.trades.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <button onClick={() => setExpandedTrades(!expandedTrades)}
            className="flex w-full items-center justify-between text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              <Clock size={12} className="mr-1 inline" /> Trades ({run.trades.length})
            </h4>
            {expandedTrades ? <ChevronUp size={14} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={14} className="text-[var(--color-text-muted)]" />}
          </button>
          {expandedTrades && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
                    <th className="pb-2 pr-3 text-left font-medium">Symbol</th>
                    <th className="pb-2 pr-3 text-left font-medium">Side</th>
                    <th className="pb-2 pr-3 text-left font-medium">Entry</th>
                    <th className="pb-2 pr-3 text-right font-medium">Entry $</th>
                    <th className="pb-2 pr-3 text-left font-medium">Exit</th>
                    <th className="pb-2 pr-3 text-right font-medium">Exit $</th>
                    <th className="pb-2 pr-3 text-right font-medium">P&L</th>
                    <th className="pb-2 text-left font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {run.trades.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--color-border-subtle)]/50">
                      <td className="py-1.5 pr-3 font-medium text-[var(--color-text-primary)]">{t.symbol}</td>
                      <td className="py-1.5 pr-3">
                        {t.side === 'long' ? (
                          <span className="flex items-center gap-0.5 text-[var(--color-profit)]"><ArrowUpRight size={10} /> Long</span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[var(--color-loss)]"><ArrowDownRight size={10} /> Short</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-[var(--color-text-secondary)]">{t.entryDate}</td>
                      <td className="py-1.5 pr-3 text-right text-[var(--color-text-secondary)]">${t.entryPrice.toFixed(2)}</td>
                      <td className="py-1.5 pr-3 text-[var(--color-text-secondary)]">{t.exitDate}</td>
                      <td className="py-1.5 pr-3 text-right text-[var(--color-text-secondary)]">${t.exitPrice.toFixed(2)}</td>
                      <td className={`py-1.5 pr-3 text-right font-medium ${t.pnl >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                        {t.pnl >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%
                      </td>
                      <td className="py-1.5 text-[var(--color-text-tertiary)]">{t.exitReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
