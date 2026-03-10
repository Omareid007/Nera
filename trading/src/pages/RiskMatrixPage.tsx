/**
 * RiskMatrixPage — Aladdin-inspired risk analytics dashboard.
 * VaR, stress testing, correlation matrix, exposure analysis, position-level risk.
 */

import { useState, useEffect } from 'react';
import { Loader2, Shield, AlertTriangle, TrendingDown, Activity, Target, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { getRiskAnalytics, type RiskAnalytics } from '@/lib/api';

function riskColor(val: number, thresholds: [number, number] = [30, 60]): string {
  if (val <= thresholds[0]) return 'var(--color-profit)';
  if (val <= thresholds[1]) return 'var(--color-warning, #f59e0b)';
  return 'var(--color-loss)';
}

function corrColor(v: number): string {
  if (v >= 0.7) return '#ef4444';
  if (v >= 0.3) return '#f59e0b';
  if (v >= -0.3) return '#6b7280';
  if (v >= -0.7) return '#3b82f6';
  return '#10b981';
}

export function RiskMatrixPage() {
  const [analytics, setAnalytics] = useState<RiskAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedStress, setExpandedStress] = useState<string | null>(null);

  useEffect(() => {
    getRiskAnalytics()
      .then((r) => setAnalytics(r.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  if (!analytics) return (
    <div>
      <PageHeader title="Risk Matrix" description="Aladdin-inspired portfolio risk decomposition and stress testing" />
      <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
        <Shield size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">No risk data available. Open positions in your portfolio first.</p>
      </div>
    </div>
  );

  const a = analytics;
  const hasPositions = a.positionRisks.length > 0;

  // Radar chart data for risk profile
  const radarData = [
    { metric: 'Leverage', value: Math.min(a.leverageRatio * 50, 100), fullMark: 100 },
    { metric: 'Concentration', value: Math.min(a.herfindahlIndex * 100, 100), fullMark: 100 },
    { metric: 'Volatility', value: Math.min(a.portfolioVolatility * 100, 100), fullMark: 100 },
    { metric: 'Beta', value: Math.min(Math.abs(a.portfolioBeta) * 50, 100), fullMark: 100 },
    { metric: 'Drawdown Risk', value: Math.min(a.parametricVaR95 / (a.parametricVaR95 + 1) * 100, 100), fullMark: 100 },
    { metric: 'Tracking Error', value: Math.min(a.trackingError * 100, 100), fullMark: 100 },
  ];

  // Stress test chart data
  const stressData = a.stressTests.map((s) => ({
    name: s.name.split(' ').slice(0, 2).join(' '),
    impact: s.portfolioImpactPct,
    fullName: s.name,
    description: s.description,
  }));

  return (
    <div>
      <PageHeader title="Risk Matrix" description="Aladdin-inspired portfolio risk decomposition and stress testing" />

      {/* Top-level VaR metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="VaR 95% (1d)" value={`$${a.parametricVaR95.toFixed(0)}`} subtitle="Parametric" />
        <MetricCard label="VaR 99% (1d)" value={`$${a.parametricVaR99.toFixed(0)}`} subtitle="Parametric" />
        <MetricCard label="Historical VaR 95%" value={`$${a.historicalVaR95.toFixed(0)}`} subtitle="6mo window" />
        <MetricCard label="Expected Shortfall" value={`$${a.expectedShortfall95.toFixed(0)}`} subtitle="CVaR 95%" />
        <MetricCard label="Portfolio Vol" value={`${(a.portfolioVolatility * 100).toFixed(1)}%`} subtitle="Annualized" />
      </div>

      {/* Risk ratios */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MetricCard label="Beta" value={a.portfolioBeta.toFixed(2)} subtitle="vs S&P 500" />
        <MetricCard label="Sharpe" value={a.sharpeRatio.toFixed(2)} subtitle={a.sharpeRatio >= 1 ? 'Good' : a.sharpeRatio >= 0.5 ? 'Moderate' : 'Low'} />
        <MetricCard label="Sortino" value={a.sortinoRatio.toFixed(2)} />
        <MetricCard label="Info Ratio" value={a.informationRatio.toFixed(2)} />
        <MetricCard label="Tracking Error" value={`${(a.trackingError * 100).toFixed(1)}%`} />
        <MetricCard label="Leverage" value={`${a.leverageRatio.toFixed(2)}x`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Risk radar */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <Target size={12} /> Risk Profile Radar
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border-subtle)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar name="Risk" dataKey="value" stroke="var(--color-loss)" fill="var(--color-loss)" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Exposure breakdown */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <Layers size={12} /> Exposure Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Long Exposure', value: a.longExposurePct, color: 'var(--color-profit)' },
              { label: 'Short Exposure', value: a.shortExposurePct, color: 'var(--color-loss)' },
              { label: 'Net Exposure', value: a.netExposurePct, color: 'var(--color-accent)' },
              { label: 'Gross Exposure', value: a.grossExposurePct, color: '#f59e0b' },
              { label: 'Cash', value: a.cashPct, color: '#6b7280' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">{item.label}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{item.value.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-surface-2)]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.abs(item.value), 100)}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}

            {/* Concentration */}
            <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--color-text-secondary)]">HHI Concentration</span>
                <span className="font-medium" style={{ color: riskColor(a.herfindahlIndex * 100) }}>{(a.herfindahlIndex * 100).toFixed(1)}%</span>
              </div>
              {a.topHolding && (
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-[var(--color-text-tertiary)]">Top Holding</span>
                  <span className="text-[var(--color-text-secondary)]">{a.topHolding.symbol} ({(a.topHolding.weight * 100).toFixed(1)}%)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stress tests */}
      <div className="mt-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          <AlertTriangle size={12} /> Stress Scenarios
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stressData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} width={80} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Impact']} />
            <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
              {stressData.map((_, i) => (
                <Cell key={i} fill="var(--color-loss)" fillOpacity={0.6 + i * 0.08} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Expandable details */}
        <div className="mt-3 space-y-1.5">
          {a.stressTests.map((s) => (
            <button key={s.name} onClick={() => setExpandedStress(expandedStress === s.name ? null : s.name)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-2.5 text-left text-xs transition-colors hover:border-[var(--color-border-default)]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--color-text-primary)]">{s.name}</span>
                <span className="font-medium text-[var(--color-loss)]">{s.portfolioImpactPct.toFixed(1)}%</span>
              </div>
              <p className="mt-0.5 text-[var(--color-text-tertiary)]">{s.description}</p>
              {expandedStress === s.name && s.positionImpacts.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-[var(--color-border-subtle)] pt-2">
                  {s.positionImpacts.map((p) => (
                    <div key={p.symbol} className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">{p.symbol}</span>
                      <span className="font-medium text-[var(--color-loss)]">{p.impactPct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Correlation matrix */}
      {a.correlationMatrix.symbols.length > 1 && (
        <div className="mt-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <Activity size={12} /> Correlation Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="pb-2 pr-2 text-left font-medium text-[var(--color-text-tertiary)]" />
                  {a.correlationMatrix.symbols.map((s) => (
                    <th key={s} className="pb-2 px-1 text-center font-medium text-[var(--color-text-tertiary)]">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.correlationMatrix.symbols.map((rowSym, i) => (
                  <tr key={rowSym}>
                    <td className="py-1 pr-2 font-medium text-[var(--color-text-secondary)]">{rowSym}</td>
                    {a.correlationMatrix.matrix[i]!.map((val, j) => (
                      <td key={j} className="py-1 px-1 text-center" style={{ color: corrColor(val) }}>
                        <div className="mx-auto flex h-7 w-10 items-center justify-center rounded" style={{ backgroundColor: corrColor(val) + '15' }}>
                          {val.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Position-level risk table */}
      {hasPositions && (
        <div className="mt-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            <TrendingDown size={12} /> Position Risk Decomposition
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">
                  <th className="pb-2 pr-4 text-left font-medium">Symbol</th>
                  <th className="pb-2 pr-4 text-right font-medium">Weight</th>
                  <th className="pb-2 pr-4 text-right font-medium">Beta</th>
                  <th className="pb-2 pr-4 text-right font-medium">Volatility</th>
                  <th className="pb-2 pr-4 text-right font-medium">VaR 95%</th>
                  <th className="pb-2 pr-4 text-right font-medium">Max DD</th>
                  <th className="pb-2 text-right font-medium">Corr to Port</th>
                </tr>
              </thead>
              <tbody>
                {a.positionRisks.map((p) => (
                  <tr key={p.symbol} className="border-b border-[var(--color-border-subtle)]/50">
                    <td className="py-2 pr-4 font-medium text-[var(--color-text-primary)]">{p.symbol}</td>
                    <td className="py-2 pr-4 text-right text-[var(--color-text-secondary)]">{(p.weight * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right" style={{ color: riskColor(Math.abs(p.beta) * 50) }}>{p.beta.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right" style={{ color: riskColor(p.volatility * 100) }}>{(p.volatility * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right text-[var(--color-loss)]">${p.var95.toFixed(0)}</td>
                    <td className="py-2 pr-4 text-right text-[var(--color-loss)]">{p.maxDrawdown.toFixed(1)}%</td>
                    <td className="py-2 text-right" style={{ color: corrColor(p.correlationToPortfolio) }}>{p.correlationToPortfolio.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
