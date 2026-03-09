/**
 * WatchlistPage — Custom watchlists with real-time quotes and quick-analysis.
 * Bloomberg-style multi-column view with sector grouping and performance heatmap.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, X, RefreshCw, TrendingUp, TrendingDown, Eye, Star, BarChart3, Activity } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { getWatchlistQuotes, type WatchlistQuote } from '@/lib/api';

const PRESET_WATCHLISTS: Record<string, string[]> = {
  'Mega Cap Tech': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'],
  'Market Indices': ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'],
  'Crypto Majors': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'ADA-USD'],
  'Sector ETFs': ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLU', 'XLP', 'XLB', 'XLC', 'XLRE', 'XLY'],
  'Commodities': ['GLD', 'SLV', 'USO', 'UNG', 'DBA', 'DBB'],
  'Defense & Aerospace': ['LMT', 'RTX', 'NOC', 'BA', 'GD', 'HII'],
  'Energy Majors': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC'],
  'Emerging Markets': ['EEM', 'VWO', 'IEMG', 'MCHI', 'EWZ', 'EWJ'],
};

type SortKey = 'symbol' | 'price' | 'changePct' | 'volume';

export function WatchlistPage() {
  const [activeList, setActiveList] = useState('Mega Cap Tech');
  const [customSymbols, setCustomSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<WatchlistQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [addInput, setAddInput] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('changePct');
  const [sortDesc, setSortDesc] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isCustom, setIsCustom] = useState(false);

  const currentSymbols = isCustom ? customSymbols : (PRESET_WATCHLISTS[activeList] ?? []);

  const fetchQuotes = useCallback(() => {
    if (currentSymbols.length === 0) { setQuotes([]); setLoading(false); return; }
    setLoading(true);
    getWatchlistQuotes(currentSymbols)
      .then((r) => { setQuotes(r.quotes); setLastRefresh(Date.now()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [currentSymbols]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(fetchQuotes, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchQuotes]);

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = addInput.trim().toUpperCase();
    if (sym && !customSymbols.includes(sym)) {
      setCustomSymbols((prev) => [...prev, sym]);
      setIsCustom(true);
    }
    setAddInput('');
  };

  const removeSymbol = (sym: string) => {
    setCustomSymbols((prev) => prev.filter((s) => s !== sym));
  };

  const sorted = [...quotes].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === 'string' && typeof bv === 'string') return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
    return sortDesc ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  // Heatmap color based on change %
  function heatColor(pct: number): string {
    if (pct >= 3) return 'bg-emerald-500/30 text-emerald-300';
    if (pct >= 1) return 'bg-emerald-500/15 text-emerald-400';
    if (pct > 0) return 'bg-emerald-500/5 text-emerald-400';
    if (pct === 0) return 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]';
    if (pct > -1) return 'bg-red-500/5 text-red-400';
    if (pct > -3) return 'bg-red-500/15 text-red-400';
    return 'bg-red-500/30 text-red-300';
  }

  const gainers = sorted.filter((q) => q.changePct > 0).length;
  const losers = sorted.filter((q) => q.changePct < 0).length;

  return (
    <div>
      <PageHeader title="Watchlist" description="Real-time quotes, sector watchlists, and market heatmap"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'
              }`}>
              <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} /> {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button onClick={fetchQuotes} className="rounded-lg bg-[var(--color-surface-2)] p-1.5 text-[var(--color-text-tertiary)]">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* Watchlist selector */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(PRESET_WATCHLISTS).map((name) => (
          <button key={name} onClick={() => { setActiveList(name); setIsCustom(false); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !isCustom && activeList === name
                ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
            }`}>
            {name}
          </button>
        ))}
        <button onClick={() => setIsCustom(true)}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
            isCustom ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'
          }`}>
          <Star size={12} /> Custom
        </button>
      </div>

      {/* Add symbol form (custom mode) */}
      {isCustom && (
        <form onSubmit={handleAddSymbol} className="mb-4 flex items-center gap-2">
          <input value={addInput} onChange={(e) => setAddInput(e.target.value.toUpperCase())}
            placeholder="Add symbol (e.g. AAPL)..."
            className="w-40 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
          <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-surface-0)]">
            <Plus size={14} />
          </button>
          {customSymbols.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-2">
              {customSymbols.map((s) => (
                <span key={s} className="flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-text-secondary)]">
                  {s}
                  <button onClick={() => removeSymbol(s)} className="text-[var(--color-text-muted)] hover:text-[var(--color-loss)]">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Summary bar */}
      {quotes.length > 0 && (
        <div className="mb-4 flex gap-3 text-xs">
          <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-400">
            <TrendingUp size={12} /> {gainers} Gainers
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 font-medium text-red-400">
            <TrendingDown size={12} /> {losers} Losers
          </span>
          <span className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-[var(--color-text-muted)]">
            Updated {new Date(lastRefresh).toLocaleTimeString()}
          </span>
        </div>
      )}

      {loading && quotes.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>
      ) : currentSymbols.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
          <Eye size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">Add symbols to your custom watchlist to get started.</p>
        </div>
      ) : (
        <>
          {/* Heatmap grid */}
          <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {sorted.map((q) => (
              <Link key={q.symbol} to={`/analytics?symbol=${q.symbol}`}
                className={`rounded-xl p-3 text-center transition-transform hover:scale-105 ${heatColor(q.changePct)}`}>
                <div className="text-xs font-bold">{q.symbol}</div>
                <div className="mt-0.5 text-sm font-semibold">${q.price.toFixed(2)}</div>
                <div className="mt-0.5 text-xs font-medium">
                  {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                </div>
              </Link>
            ))}
          </div>

          {/* Detailed table */}
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              <BarChart3 size={12} /> Detailed Quotes
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <SortHeader label="Symbol" sortKey="symbol" currentKey={sortKey} desc={sortDesc} onClick={toggleSort} />
                    <SortHeader label="Price" sortKey="price" currentKey={sortKey} desc={sortDesc} onClick={toggleSort} align="right" />
                    <SortHeader label="Change %" sortKey="changePct" currentKey={sortKey} desc={sortDesc} onClick={toggleSort} align="right" />
                    <SortHeader label="Volume" sortKey="volume" currentKey={sortKey} desc={sortDesc} onClick={toggleSort} align="right" />
                    <th className="pb-2 pr-3 text-left font-medium text-[var(--color-text-tertiary)]">Name</th>
                    <th className="pb-2 text-right font-medium text-[var(--color-text-tertiary)]">Chart</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((q) => (
                    <tr key={q.symbol} className="border-b border-[var(--color-border-subtle)]/50 hover:bg-[var(--color-surface-2)]/50">
                      <td className="py-2 pr-3 font-semibold text-[var(--color-text-primary)]">{q.symbol}</td>
                      <td className="py-2 pr-3 text-right font-medium text-[var(--color-text-primary)]">${q.price.toFixed(2)}</td>
                      <td className={`py-2 pr-3 text-right font-medium ${q.changePct >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                        <span className="flex items-center justify-end gap-0.5">
                          {q.changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--color-text-secondary)]">
                        {q.volume >= 1e6 ? `${(q.volume / 1e6).toFixed(1)}M` : q.volume >= 1e3 ? `${(q.volume / 1e3).toFixed(0)}K` : q.volume.toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-[var(--color-text-tertiary)]">{q.name}</td>
                      <td className="py-2 text-right">
                        <Link to={`/analytics?symbol=${q.symbol}`}
                          className="inline-flex items-center gap-1 rounded-md bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20">
                          <Activity size={10} /> Chart
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, desc, onClick, align = 'left' }: {
  label: string; sortKey: SortKey; currentKey: SortKey; desc: boolean;
  onClick: (k: SortKey) => void; align?: 'left' | 'right';
}) {
  const active = currentKey === sortKey;
  return (
    <th className={`pb-2 pr-3 font-medium text-[var(--color-text-tertiary)] cursor-pointer hover:text-[var(--color-text-primary)] ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onClick(sortKey)}>
      <span className="flex items-center gap-1" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label} {active && <span className="text-[var(--color-accent)]">{desc ? '↓' : '↑'}</span>}
      </span>
    </th>
  );
}
