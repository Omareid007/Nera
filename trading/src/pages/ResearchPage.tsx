import { useState } from 'react';
import { Search, Globe, TrendingUp, Shield, Zap, Newspaper, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

/** Predefined research universes with World Monitor intelligence linkage. */
const UNIVERSES = [
  { id: 'tech-mega', name: 'Tech Mega-Caps', symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'], icon: Zap, color: 'text-blue-400', description: 'US mega-cap technology leaders' },
  { id: 'defense', name: 'Defense & Aerospace', symbols: ['LMT', 'RTX', 'NOC', 'GD', 'BA', 'LHX'], icon: Shield, color: 'text-amber-400', description: 'Linked to World Monitor conflict intelligence (ACLED, UCDP)' },
  { id: 'energy', name: 'Energy & Commodities', symbols: ['XOM', 'CVX', 'COP', 'SLB', 'OXY', 'MPC'], icon: TrendingUp, color: 'text-emerald-400', description: 'Linked to EIA energy data and sanctions intelligence' },
  { id: 'financials', name: 'Financials', symbols: ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'BLK'], icon: Building2, color: 'text-purple-400', description: 'Major financial institutions' },
  { id: 'emerging', name: 'Emerging Markets ETFs', symbols: ['EEM', 'VWO', 'IEMG', 'INDA', 'EWZ', 'FXI'], icon: Globe, color: 'text-teal-400', description: 'Linked to CII country risk scores and geopolitical intelligence' },
  { id: 'news-reactive', name: 'News-Reactive', symbols: ['SPY', 'QQQ', 'VIX', 'GLD', 'TLT', 'UUP'], icon: Newspaper, color: 'text-rose-400', description: 'Macro instruments linked to GDELT news sentiment' },
];

export function ResearchPage() {
  const [search, setSearch] = useState('');

  const filtered = search
    ? UNIVERSES.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.symbols.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : UNIVERSES;

  return (
    <div>
      <PageHeader title="Research" description="Universe and watchlist management — symbols linked to World Monitor intelligence feeds" />

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

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">World Monitor Data Sources</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'ACLED', description: 'Armed conflict events → Defense stocks', status: 'live' },
            { name: 'GDELT', description: 'Global news sentiment → Market impact', status: 'live' },
            { name: 'CII Scores', description: 'Country instability → EM exposure', status: 'live' },
            { name: 'EIA Energy', description: 'Oil/gas supply data → Energy sector', status: 'live' },
            { name: 'FRED', description: 'Economic indicators → Macro trades', status: 'live' },
            { name: 'Sanctions', description: 'OFAC/EU sanctions → Affected companies', status: 'live' },
            { name: 'Prediction Markets', description: 'Geopolitical probabilities → Risk adjust', status: 'live' },
            { name: 'Cyber Threats', description: 'CVE/breach events → Tech sector', status: 'live' },
          ].map((src) => (
            <div key={src.name} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-text-primary)]">{src.name}</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-400">{src.status}</span>
              </div>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{src.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
