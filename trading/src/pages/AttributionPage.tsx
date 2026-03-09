/**
 * AttributionPage — Strategy performance attribution and factor decomposition.
 * Aladdin-inspired return decomposition: market, sector, style, idiosyncratic.
 */

import { useState, useEffect, useMemo } from 'react';
import { Loader2, PieChart as PieIcon, BarChart3, Target, TrendingUp, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { listBacktestRuns, getBacktestRun, getAttribution, type BacktestIndexEntry, type BacktestRun, type Attribution } from '@/lib/api';

const FACTOR_COLORS = {
  market: '#3b82f6',
  sector: '#10b981',
  style: '#f59e0b',
  idiosyncratic: '#8b5cf6',
};

export function AttributionPage() {
  const [allRuns, setAllRuns] = useState<BacktestIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<BacktestRun | null>(null);
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    listBacktestRuns()
      .then((r) => {
        const complete = r.backtestRuns.filter((b) => b.status === 'complete');
        setAllRuns(complete);
        if (complete.length > 0) setSelectedId(complete[0]!.id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingDetail(true);
    setAttribution(null);
    Promise.all([
      getBacktestRun(selectedId).then((r) => setSelectedRun(r.backtestRun)),
      getAttribution(selectedId).then((r) => setAttribution(r.attribution)).catch(() => {}),
    ]).finally(() => setLoadingDetail(false));
  }, [selectedId]);

  // Win/loss distribution
  const tradeDistribution = useMemo(() => {
    if (!selectedRun?.trades) return [];
    const buckets: Record<string, number> = {
      '< -10%': 0, '-10 to -5%': 0, '-5 to -2%': 0, '-2 to 0%': 0,
      '0 to 2%': 0, '2 to 5%': 0, '5 to 10%': 0, '> 10%': 0,
    };
    for (const t of selectedRun.trades) {
      const pct = t.pnlPct;
      if (pct < -10) buckets['< -10%']!++;
      else if (pct < -5) buckets['-10 to -5%']!++;
      else if (pct < -2) buckets['-5 to -2%']!++;
      else if (pct < 0) buckets['-2 to 0%']!++;
      else if (pct < 2) buckets['0 to 2%']!++;
      else if (pct < 5) buckets['2 to 5%']!++;
      else if (pct < 10) buckets['5 to 10%']!++;
      else buckets['> 10%']!++;
    }
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [selectedRun]);

  // Exit reason breakdown
  const exitReasons = useMemo(() => {
    if (!selectedRun?.trades) return [];
    const counts: Record<string, number> = {};
    for (const t of selectedRun.trades) {
      counts[t.exitReason] = (counts[t.exitReason] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [selectedRun]);

  // Monthly returns
  const monthlyReturns = useMemo(() => {
    if (!selectedRun?.equityCurve || selectedRun.equityCurve.length === 0) return [];
    const curve = selectedRun.equityCurve;
    const monthly: { month: string; return: number }[] = [];
    let lastMonthEnd = curve[0]!.equity;
    let lastMonth = curve[0]!.date.slice(0, 7);

    for (let i = 1; i < curve.length; i++) {
      const month = curve[i]!.date.slice(0, 7);
      if (month !== lastMonth) {
        const ret = lastMonthEnd > 0 ? ((curve[i - 1]!.equity - lastMonthEnd) / lastMonthEnd) * 100 : 0;
        monthly.push({ month: lastMonth, return: ret });
        lastMonthEnd = curve[i - 1]!.equity;
        lastMonth = month;
      }
    }
    // Last partial month
    const lastEquity = curve[curve.length - 1]!.equity;
    if (lastMonthEnd > 0) {
      monthly.push({ month: lastMonth, return: ((lastEquity - lastMonthEnd) / lastMonthEnd) * 100 });
    }
    return monthly;
  }, [selectedRun]);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Performance Attribution" description="Factor decomposition, return attribution, and trade distribution analysis" />

      {allRuns.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
          <Target size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No completed backtests for attribution analysis.</p>
        </div>
      ) : (
        <>
          {/* Strategy selector */}
          <div className="mb-4">
            <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none">
              {allRuns.map((r) => (
                <option key={r.id} value={r.id}>{r.strategyName} ({r.totalReturn?.toFixed(1)}%)</option>
              ))}
            </select>
          </div>

          {loadingDetail ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>
          ) : selectedRun?.metrics && attribution ? (
            <>
              {/* Factor attribution metrics */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MetricCard label="Total Return" value={`${attribution.totalReturn >= 0 ? '+' : ''}${attribution.totalReturn.toFixed(2)}%`}
                  change={attribution.totalReturn} />
                <MetricCard label="Market Factor" value={`${attribution.marketReturn >= 0 ? '+' : ''}${attribution.marketReturn.toFixed(2)}%`}
                  subtitle={`Beta: ${attribution.beta.toFixed(2)}`} />
                <MetricCard label="Sector Factor" value={`${attribution.sectorReturn >= 0 ? '+' : ''}${attribution.sectorReturn.toFixed(2)}%`}
                  subtitle="Sector allocation" />
                <MetricCard label="Style Factor" value={`${attribution.styleReturn >= 0 ? '+' : ''}${attribution.styleReturn.toFixed(2)}%`}
                  subtitle="Momentum/Value/Size" />
                <MetricCard label="Alpha" value={`${attribution.alpha >= 0 ? '+' : ''}${attribution.alpha.toFixed(2)}%`}
                  subtitle={`R²: ${(attribution.rSquared * 100).toFixed(1)}%`} />
              </div>
              {/* Benchmark comparison */}
              {attribution.benchmarkReturn !== 0 && (
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard label="S&P 500 Benchmark" value={`${attribution.benchmarkReturn >= 0 ? '+' : ''}${attribution.benchmarkReturn.toFixed(2)}%`} subtitle="Same period" />
                  <MetricCard label="Tracking Error" value={`${attribution.trackingError.toFixed(2)}%`} subtitle="Annualized" />
                  <MetricCard label="Information Ratio" value={attribution.informationRatio.toFixed(2)} subtitle="Risk-adjusted alpha" />
                  <MetricCard label="R-Squared" value={`${(attribution.rSquared * 100).toFixed(1)}%`} subtitle="Market dependency" />
                </div>
              )}

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Factor waterfall chart */}
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <BarChart3 size={12} /> Return Attribution Waterfall
                  </h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={[
                      { name: 'Market', value: attribution.marketReturn },
                      { name: 'Sector', value: attribution.sectorReturn },
                      { name: 'Style', value: attribution.styleReturn },
                      { name: 'Alpha', value: attribution.idiosyncraticReturn },
                    ]} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                        tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [`${v.toFixed(2)}%`, 'Return']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {['market', 'sector', 'style', 'idiosyncratic'].map((k) => (
                          <Cell key={k} fill={FACTOR_COLORS[k as keyof typeof FACTOR_COLORS]} fillOpacity={0.7} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Exit reason pie */}
                {exitReasons.length > 0 && (
                  <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <PieIcon size={12} /> Exit Reason Distribution
                    </h4>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={exitReasons} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {exitReasons.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.7} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Trade P&L distribution */}
              {tradeDistribution.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <Activity size={12} /> Trade P&L Distribution
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={tradeDistribution} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [v, 'Trades']} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {tradeDistribution.map((_d, i) => (
                          <Cell key={i} fill={i < 4 ? 'var(--color-loss)' : 'var(--color-profit)'} fillOpacity={0.5 + Math.abs(i - 3.5) * 0.1} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly returns */}
              {monthlyReturns.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    <TrendingUp size={12} /> Monthly Returns
                  </h4>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyReturns} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                        tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                        tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [`${v.toFixed(2)}%`, 'Return']} />
                      <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                        {monthlyReturns.map((d, i) => (
                          <Cell key={i} fill={d.return >= 0 ? 'var(--color-profit)' : 'var(--color-loss)'} fillOpacity={0.6} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Key insights */}
              <div className="mt-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Attribution Insights</h4>
                <div className="space-y-2 text-xs text-[var(--color-text-secondary)]">
                  <p>
                    <span className="font-medium text-[var(--color-text-primary)]">Alpha generation:</span>{' '}
                    {attribution.idiosyncraticReturn > 0
                      ? `Strategy generates ${attribution.idiosyncraticReturn.toFixed(2)}% alpha above market factors — genuine stock selection skill.`
                      : `Strategy shows ${attribution.idiosyncraticReturn.toFixed(2)}% negative alpha — returns are primarily driven by market/sector exposure.`}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--color-text-primary)]">Market dependency:</span>{' '}
                    {(Math.abs(attribution.marketReturn) / Math.max(Math.abs(attribution.totalReturn), 0.01)) > 0.5
                      ? 'High market dependency — returns closely track broad market movements.'
                      : 'Low market dependency — strategy provides meaningful diversification.'}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--color-text-primary)]">Risk-adjusted quality:</span>{' '}
                    {selectedRun.metrics!.sharpeRatio >= 1.5
                      ? 'Excellent risk-adjusted returns (Sharpe > 1.5).'
                      : selectedRun.metrics!.sharpeRatio >= 1.0
                      ? 'Good risk-adjusted returns (Sharpe > 1.0).'
                      : 'Below-average risk-adjusted returns. Consider adjusting risk parameters.'}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
