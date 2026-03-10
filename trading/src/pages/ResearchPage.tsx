import { useState, useEffect } from 'react';
import { Search, Globe, TrendingUp, Shield, Zap, Newspaper, Building2, Loader2, CloudLightning, ShieldAlert, BarChart3, Percent } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  getIntelStatus, listPredictionMarkets, listEarnings, listCyclones, listCyberThreats,
  type IntelSource, type PredictionMarket, type EarningsEvent, type TropicalCyclone, type CyberThreat,
} from '@/lib/api';

/** Predefined research universes with intelligence feed linkage. */
const UNIVERSES = [
  { id: 'tech-mega', name: 'Tech Mega-Caps', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'], icon: Zap, color: 'text-blue-400', description: 'US mega-cap technology leaders' },
  { id: 'defense', name: 'Defense & Aerospace', symbols: ['LMT', 'RTX', 'NOC', 'GD', 'BA', 'LHX'], icon: Shield, color: 'text-amber-400', description: 'Linked to conflict intelligence (ACLED, UCDP)' },
  { id: 'energy', name: 'Energy & Commodities', symbols: ['XOM', 'CVX', 'COP', 'SLB', 'OXY', 'MPC'], icon: TrendingUp, color: 'text-emerald-400', description: 'Linked to EIA energy data and sanctions intelligence' },
  { id: 'financials', name: 'Financials', symbols: ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'BLK'], icon: Building2, color: 'text-purple-400', description: 'Major financial institutions' },
  { id: 'emerging', name: 'Emerging Markets ETFs', symbols: ['EEM', 'VWO', 'IEMG', 'INDA', 'EWZ', 'FXI'], icon: Globe, color: 'text-teal-400', description: 'Linked to CII country risk scores and geopolitical intelligence' },
  { id: 'news-reactive', name: 'News-Reactive', symbols: ['SPY', 'QQQ', 'VIX', 'GLD', 'TLT', 'UUP'], icon: Newspaper, color: 'text-rose-400', description: 'Macro instruments linked to GDELT news sentiment' },
];

export function ResearchPage() {
  const [search, setSearch] = useState('');
  const [intelSources, setIntelSources] = useState<IntelSource[]>([]);
  const [predictions, setPredictions] = useState<PredictionMarket[]>([]);
  const [earnings, setEarnings] = useState<{ upcoming: EarningsEvent[]; recent: EarningsEvent[] }>({ upcoming: [], recent: [] });
  const [cyclones, setCyclones] = useState<TropicalCyclone[]>([]);
  const [cyberThreats, setCyberThreats] = useState<CyberThreat[]>([]);
  const [loadingIntel, setLoadingIntel] = useState(true);

  useEffect(() => {
    Promise.all([
      getIntelStatus().then((r) => setIntelSources(r.sources)).catch(() => {}),
      listPredictionMarkets().then((r) => setPredictions(r.markets)).catch(() => {}),
      listEarnings().then((r) => setEarnings({ upcoming: r.upcoming, recent: r.recent })).catch(() => {}),
      listCyclones().then((r) => setCyclones(r.cyclones)).catch(() => {}),
      listCyberThreats().then((r) => setCyberThreats(r.threats)).catch(() => {}),
    ]).finally(() => setLoadingIntel(false));
  }, []);

  const filtered = search
    ? UNIVERSES.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.symbols.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : UNIVERSES;

  return (
    <div>
      <PageHeader title="Research" description="Universe and watchlist management — symbols linked to Nera intelligence feeds" />

      <div className="mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbols, ETFs, sectors..."
            className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] py-2.5 pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none" />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Intelligence-Linked Universes</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4 transition-colors hover:border-[var(--color-border-default)]">
              <div className="mb-2 flex items-center gap-2">
                <u.icon size={16} className={u.color} />
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{u.name}</h3>
              </div>
              <p className="mb-3 text-xs text-[var(--color-text-muted)]">{u.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {u.symbols.map((s) => (
                  <span key={s} className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Intelligence Panels */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Prediction Markets */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]">
            <Percent size={14} className="text-purple-400" /> Prediction Markets
          </h3>
          {predictions.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">Loading prediction markets...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {predictions.slice(0, 10).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-xs">
                  <div className="flex-1 mr-3">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{m.title}</p>
                    <span className={`inline-block mt-0.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${
                      m.source === 'kalshi' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>{m.source}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${m.probability >= 70 ? 'text-[var(--color-profit)]' : m.probability <= 30 ? 'text-[var(--color-loss)]' : 'text-[var(--color-text-primary)]'}`}>
                      {m.probability}%
                    </span>
                    <p className="text-[9px] text-[var(--color-text-muted)]">${(m.volume / 1000).toFixed(0)}k vol</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Earnings Calendar */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]">
            <BarChart3 size={14} className="text-emerald-400" /> Earnings Calendar
          </h3>
          {earnings.upcoming.length === 0 && earnings.recent.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">No earnings data available</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {earnings.upcoming.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Upcoming</p>
                  {earnings.upcoming.slice(0, 5).map((e) => (
                    <div key={`${e.symbol}-${e.reportDate}`} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2 mb-1 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--color-text-primary)]">{e.symbol}</span>
                        <span className="ml-2 text-[var(--color-text-muted)]">{e.reportDate}</span>
                        {e.timing !== 'unknown' && <span className="ml-1 text-[9px] text-[var(--color-text-muted)] uppercase">{e.timing}</span>}
                      </div>
                      {e.epsEstimate !== null && (
                        <span className="text-[var(--color-text-secondary)]">Est: ${e.epsEstimate.toFixed(2)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {earnings.recent.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Recent</p>
                  {earnings.recent.slice(0, 5).map((e) => (
                    <div key={`${e.symbol}-${e.reportDate}`} className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2 mb-1 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--color-text-primary)]">{e.symbol}</span>
                        <span className="ml-2 text-[var(--color-text-muted)]">{e.reportDate}</span>
                      </div>
                      {e.surprise !== null && (
                        <span className={`font-semibold ${e.surprise >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                          {e.surprise >= 0 ? '+' : ''}{e.surprise.toFixed(1)}% surprise
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tropical Cyclones */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]">
            <CloudLightning size={14} className="text-amber-400" /> Tropical Cyclones
          </h3>
          {cyclones.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <Shield size={12} /> No active tropical cyclones — clear for commodity markets
            </div>
          ) : (
            <div className="space-y-2">
              {cyclones.map((c) => (
                <div key={c.id} className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--color-text-primary)]">{c.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      c.category.includes('5') || c.category.includes('4') ? 'bg-red-500/20 text-red-400' :
                      c.category.includes('3') ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{c.category}</span>
                  </div>
                  {c.windKt && <p className="text-[var(--color-text-muted)] mt-0.5">{c.windKt} kt • {c.basin.replace(/_/g, ' ')}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.commodityImpact.map((impact, i) => (
                      <span key={i} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-400">{impact}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CISA Cyber Threats */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]">
            <ShieldAlert size={14} className="text-red-400" /> CISA Cyber Threats (KEV)
          </h3>
          {cyberThreats.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">Loading vulnerability data...</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cyberThreats.slice(0, 8).map((t) => (
                <div key={t.cveId} className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[var(--color-text-primary)]">{t.cveId}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      t.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      t.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{t.severity}{t.knownRansomwareCampaignUse ? ' • RANSOMWARE' : ''}</span>
                  </div>
                  <p className="mt-0.5 text-[var(--color-text-muted)] truncate">{t.vendorProject} — {t.product}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">Added: {t.dateAdded} • Due: {t.dueDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Intelligence Data Sources (Live)</h2>
        {loadingIntel ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={20} /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {intelSources.map((src) => (
              <div key={src.name} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">{src.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                    src.status === 'live' ? 'bg-emerald-500/20 text-emerald-400' :
                    src.status === 'stale' ? 'bg-amber-500/20 text-amber-400' :
                    src.status === 'down' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>{src.status}</span>
                </div>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{src.description}</p>
                {src.latencyMs !== null && (
                  <p className="mt-0.5 text-[9px] text-[var(--color-text-muted)]">{src.latencyMs}ms</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
