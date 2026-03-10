/**
 * ComparePage — Side-by-side multi-strategy backtest comparison.
 * Palantir-style analytical view: overlay equity curves, compare metrics, rank strategies.
 */

import { useState, useEffect, useMemo } from 'react';
import { Loader2, BarChart3, TrendingUp, Plus, X, ArrowUpDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { listBacktestRuns, getBacktestRun, type BacktestIndexEntry, type BacktestRun } from '@/lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const METRIC_LABELS: Record<string, string> = {
  totalReturn: 'Total Return %',
  annualizedReturn: 'Annualized Return %',
  sharpeRatio: 'Sharpe Ratio',
  sortinoRatio: 'Sortino Ratio',
  maxDrawdown: 'Max Drawdown %',
  winRate: 'Win Rate %',
  profitFactor: 'Profit Factor',
  calmarRatio: 'Calmar Ratio',
  totalTrades: 'Total Trades',
  avgWin: 'Avg Win %',
  avgLoss: 'Avg Loss %',
  avgTradeDuration: 'Avg Trade Duration (d)',
};

type SortKey = keyof typeof METRIC_LABELS;

export function ComparePage() {
  const [allRuns, setAllRuns] = useState<BacktestIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadedRuns, setLoadedRuns] = useState<Map<string, BacktestRun>>(new Map());
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('sharpeRatio');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    listBacktestRuns()
      .then((r) => {
        const complete = r.backtestRuns.filter((b) => b.status === 'complete');
        setAllRuns(complete);
        // Auto-select first 3
        setSelectedIds(complete.slice(0, 3).map((b) => b.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load full backtest data for selected runs
  useEffect(() => {
    const toLoad = selectedIds.filter((id) => !loadedRuns.has(id));
    if (toLoad.length === 0) return;
    setLoadingRuns(true);
    Promise.all(
      toLoad.map((id) => getBacktestRun(id).then((r) => [id, r.backtestRun] as const).catch(() => null))
    ).then((results) => {
      setLoadedRuns((prev) => {
        const next = new Map(prev);
        for (const r of results) { if (r) next.set(r[0], r[1]); }
        return next;
      });
    }).finally(() => setLoadingRuns(false));
  }, [selectedIds, loadedRuns]);

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 8 ? [...prev, id] : prev
    );
  };

  const runs = selectedIds.map((id) => loadedRuns.get(id)).filter((r): r is BacktestRun => !!r && !!r.metrics);

  // Build overlay equity curve data
  const equityOverlay = useMemo(() => {
    if (runs.length === 0) return [];
    // Normalize all curves to start at 100
    const maxLen = Math.max(...runs.map((r) => r.equityCurve.length));
    const data: Record<string, unknown>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, unknown> = {};
      let hasDate = false;
      for (const run of runs) {
        const curve = run.equityCurve;
        if (i < curve.length) {
          if (!hasDate) { point.date = curve[i]!.date; hasDate = true; }
          const initial = curve[0]!.equity;
          point[run.strategyName] = initial > 0 ? (curve[i]!.equity / initial) * 100 : 100;
        }
      }
      if (hasDate) data.push(point);
    }
    return data;
  }, [runs]);

  // Build metrics comparison data
  const metricsComparison = useMemo(() => {
    return runs.map((r): Record<string, string | number> => ({
      id: r.id,
      name: r.strategyName,
      templateId: r.templateId,
      ...(r.metrics as unknown as Record<string, number>),
    }));
  }, [runs]);

  // Sort
  const sorted = useMemo(() => {
    return [...metricsComparison].sort((a, b) => {
      const av = (a[sortBy] as number) ?? 0;
      const bv = (b[sortBy] as number) ?? 0;
      return sortDesc ? bv - av : av - bv;
    });
  }, [metricsComparison, sortBy, sortDesc]);

  // Bar chart for selected metric
  const barData = sorted.map((s) => {
    const label = String(s.name);
    return {
      name: label.length > 12 ? label.slice(0, 12) + '...' : label,
      value: (s[sortBy] as number) ?? 0,
      fullName: label,
    };
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Strategy Comparison" description="Side-by-side backtest analysis — overlay equity curves, compare metrics, rank strategies" />

      {allRuns.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
          <BarChart3 size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No completed backtests to compare. Run backtests on your strategies first.</p>
        </div>
      ) : (
        <>
          {/* Selection chips */}
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Select Backtests to Compare (max 8)
            </h3>
            <div className="flex flex-wrap gap-2">
              {allRuns.map((bt) => {
                const isSelected = selectedIds.includes(bt.id);
                const colorIdx = selectedIds.indexOf(bt.id);
                return (
                  <button key={bt.id} onClick={() => toggle(bt.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'text-white border'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
                    }`}
                    style={isSelected ? { backgroundColor: COLORS[colorIdx % COLORS.length] + '20', borderColor: COLORS[colorIdx % COLORS.length], color: COLORS[colorIdx % COLORS.length] } : undefined}>
                    {isSelected ? <X size={12} /> : <Plus size={12} />}
                    {bt.strategyName}
                    {bt.totalReturn != null && (
                      <span className="ml-1 opacity-70">{bt.totalReturn >= 0 ? '+' : ''}{bt.totalReturn.toFixed(1)}%</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {loadingRuns && <div className="mb-4 flex items-center gap-2 text-xs text-[var(--color-text-muted)]"><Loader2 size={14} className="animate-spin" /> Loading backtest data...</div>}

          {runs.length >= 2 && (
            <>
              {/* Overlay equity curves */}
              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  <TrendingUp size={12} /> Normalized Equity Curves (base = 100)
                </h4>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={equityOverlay} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                      tickFormatter={(v: string) => v?.slice(5) ?? ''} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                      tickFormatter={(v: number) => v.toFixed(0)} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [v.toFixed(2), '']}
                      labelStyle={{ color: 'var(--color-text-tertiary)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {runs.map((run, i) => (
                      <Area key={run.id} type="monotone" dataKey={run.strategyName}
                        stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]}
                        fillOpacity={0.05} strokeWidth={1.5} dot={false} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Metric bar chart */}
              <div className="mt-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <BarChart3 size={12} /> Metric Comparison
                  </h4>
                  <div className="flex items-center gap-2">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text-primary)]">
                      {Object.entries(METRIC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button onClick={() => setSortDesc(!sortDesc)}
                      className="rounded-lg bg-[var(--color-surface-2)] p-1 text-[var(--color-text-tertiary)]">
                      <ArrowUpDown size={14} />
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [v.toFixed(2), METRIC_LABELS[sortBy]]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Full metrics table */}
              <div className="mt-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Full Metrics Table</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border-subtle)]">
                        <th className="pb-2 pr-4 text-left font-medium text-[var(--color-text-tertiary)]">Metric</th>
                        {runs.map((r, i) => (
                          <th key={r.id} className="pb-2 px-3 text-right font-medium" style={{ color: COLORS[i % COLORS.length] }}>
                            {r.strategyName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(METRIC_LABELS) as SortKey[]).map((key) => {
                        const values = runs.map((r) => ((r.metrics as unknown as Record<string, number>)?.[key]) ?? 0);
                        const best = key === 'maxDrawdown' || key === 'avgLoss'
                          ? Math.min(...values) // Lower is better for drawdown/losses
                          : Math.max(...values);
                        return (
                          <tr key={key} className="border-b border-[var(--color-border-subtle)]/50">
                            <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{METRIC_LABELS[key]}</td>
                            {values.map((v, i) => (
                              <td key={i} className={`py-2 px-3 text-right font-medium ${v === best ? 'text-[var(--color-profit)]' : 'text-[var(--color-text-primary)]'}`}>
                                {v.toFixed(2)}
                                {v === best && <span className="ml-1 text-[10px]">★</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {/* Trade count row */}
                      <tr className="border-b border-[var(--color-border-subtle)]/50">
                        <td className="py-2 pr-4 text-[var(--color-text-secondary)]">Universe</td>
                        {runs.map((r) => (
                          <td key={r.id} className="py-2 px-3 text-right text-[var(--color-text-tertiary)]">
                            {r.universe.slice(0, 3).join(', ')}{r.universe.length > 3 ? ` +${r.universe.length - 3}` : ''}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 text-[var(--color-text-secondary)]">Template</td>
                        {runs.map((r) => (
                          <td key={r.id} className="py-2 px-3 text-right text-[var(--color-text-tertiary)]">
                            <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px]">{r.templateId}</span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {runs.length < 2 && selectedIds.length > 0 && !loadingRuns && (
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">Select at least 2 completed backtests to compare.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
