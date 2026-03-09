/**
 * AnalyticsPage — Bloomberg-style multi-chart terminal with candlestick visualization,
 * technical overlays (SMA, EMA, Bollinger, RSI, MACD), and real-time quote data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, TrendingUp, TrendingDown, BarChart3, Activity, RefreshCw } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { getMarketData, type MarketDataResponse, type Candle } from '@/lib/api';

const INTERVALS = [
  { value: '1d', label: '1D' },
  { value: '1wk', label: '1W' },
  { value: '1mo', label: '1M' },
];

const RANGES = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '2y', label: '2Y' },
  { value: '5y', label: '5Y' },
];

const OVERLAYS = ['SMA 20', 'SMA 50', 'EMA 12', 'EMA 26', 'Bollinger'] as const;

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ', 'BTC-USD', 'ETH-USD', 'GLD'];

type CandlePoint = Candle & {
  sma20?: number; sma50?: number; ema12?: number; ema26?: number;
  bollingerUpper?: number; bollingerLower?: number; bollingerMid?: number;
  rsi?: number; macd?: number; macdSignal?: number; macdHist?: number;
  volumeSma?: number;
  dateLabel: string;
};

export function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const initialSymbol = searchParams.get('symbol')?.toUpperCase() || 'AAPL';
  const [symbol, setSymbol] = useState(initialSymbol);
  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [interval, setInterval] = useState('1d');
  const [range, setRange] = useState('6mo');
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [overlays, setOverlays] = useState<Set<string>>(new Set(['SMA 20']));
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    getMarketData(symbol, interval, range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol, interval, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(fetchData, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchData]);

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbolInput.trim()) setSymbol(symbolInput.trim().toUpperCase());
  };

  const toggleOverlay = (name: string) => {
    setOverlays((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // Transform data for charts
  const chartData: CandlePoint[] = data ? data.candles.map((c, i) => ({
    ...c,
    dateLabel: new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sma20: isNaN(data.sma20[i]!) ? undefined : data.sma20[i],
    sma50: isNaN(data.sma50[i]!) ? undefined : data.sma50[i],
    ema12: isNaN(data.ema12[i]!) ? undefined : data.ema12[i],
    ema26: isNaN(data.ema26[i]!) ? undefined : data.ema26[i],
    bollingerUpper: isNaN(data.bollingerUpper[i]!) ? undefined : data.bollingerUpper[i],
    bollingerLower: isNaN(data.bollingerLower[i]!) ? undefined : data.bollingerLower[i],
    bollingerMid: isNaN(data.bollingerMid[i]!) ? undefined : data.bollingerMid[i],
    rsi: isNaN(data.rsi14[i]!) ? undefined : data.rsi14[i],
    macd: isNaN(data.macd[i]!) ? undefined : data.macd[i],
    macdSignal: isNaN(data.macdSignal[i]!) ? undefined : data.macdSignal[i],
    macdHist: isNaN(data.macdHistogram[i]!) ? undefined : data.macdHistogram[i],
    volumeSma: isNaN(data.volumeSma20[i]!) ? undefined : data.volumeSma20[i],
  })) : [];

  const q = data?.quote;

  return (
    <div>
      <PageHeader title="Analytics Terminal" description="Bloomberg-style charting with technical analysis and real-time market data" />

      {/* Symbol search + controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSymbolSubmit} className="flex items-center gap-2">
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            placeholder="Symbol..."
            className="w-28 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-surface-0)]">Go</button>
        </form>

        {/* Quick symbols */}
        <div className="flex flex-wrap gap-1">
          {DEFAULT_SYMBOLS.map((s) => (
            <button key={s} onClick={() => { setSymbol(s); setSymbolInput(s); }}
              className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                symbol === s ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Auto-refresh toggle */}
        <button onClick={() => setAutoRefresh(!autoRefresh)}
          className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            autoRefresh ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'
          }`}>
          <RefreshCw size={12} className={autoRefresh ? 'animate-spin' : ''} /> {autoRefresh ? 'Live' : 'Auto'}
        </button>
        <button onClick={fetchData} className="rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
          <RefreshCw size={12} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>
      ) : !data || !q ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No data available for {symbol}</p>
        </div>
      ) : (
        <>
          {/* Quote header */}
          <div className="mb-4 flex flex-wrap items-baseline gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{q.name}</h2>
              <span className="text-xs text-[var(--color-text-tertiary)]">{q.symbol} &middot; {q.exchange} &middot; {q.currency}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[var(--color-text-primary)]">${q.price.toFixed(2)}</span>
              <span className={`flex items-center gap-1 text-lg font-semibold ${q.change >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                {q.change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                {q.change >= 0 ? '+' : ''}{q.change.toFixed(2)} ({q.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Key metrics */}
          <div className="mb-4 grid grid-cols-3 gap-3 lg:grid-cols-6">
            <MetricCard label="Open" value={`$${q.open.toFixed(2)}`} />
            <MetricCard label="High" value={`$${q.high.toFixed(2)}`} />
            <MetricCard label="Low" value={`$${q.low.toFixed(2)}`} />
            <MetricCard label="Prev Close" value={`$${q.prevClose.toFixed(2)}`} />
            <MetricCard label="Volume" value={q.volume >= 1e6 ? `${(q.volume / 1e6).toFixed(1)}M` : q.volume.toLocaleString()} />
            <MetricCard label="52w Range" value={`$${q.fiftyTwoWeekLow.toFixed(0)} - $${q.fiftyTwoWeekHigh.toFixed(0)}`} />
          </div>

          {/* Chart controls */}
          <div className="mb-3 flex flex-wrap items-center gap-4">
            {/* Interval */}
            <div className="flex gap-1">
              {INTERVALS.map((i) => (
                <button key={i.value} onClick={() => setInterval(i.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${interval === i.value ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'}`}>
                  {i.label}
                </button>
              ))}
            </div>

            {/* Range */}
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button key={r.value} onClick={() => setRange(r.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${range === r.value ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'}`}>
                  {r.label}
                </button>
              ))}
            </div>

            {/* Overlays */}
            <div className="flex gap-1">
              {OVERLAYS.map((o) => (
                <button key={o} onClick={() => toggleOverlay(o)}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium ${overlays.has(o) ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}`}>
                  {o}
                </button>
              ))}
            </div>

            {/* Sub-charts */}
            <div className="flex gap-1">
              {[{ key: 'vol', label: 'Vol', state: showVolume, set: setShowVolume },
                { key: 'rsi', label: 'RSI', state: showRSI, set: setShowRSI },
                { key: 'macd', label: 'MACD', state: showMACD, set: setShowMACD }].map((t) => (
                <button key={t.key} onClick={() => t.set(!t.state)}
                  className={`rounded-md px-2 py-1 text-[10px] font-medium ${t.state ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main price chart (OHLC as bar + overlays as lines) */}
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              <BarChart3 size={12} /> Price Chart
            </h4>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'var(--color-text-tertiary)' }}
                  formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                />
                {/* Candlestick approximation: high-low range as thin bar, open-close as colored line */}
                <Line type="monotone" dataKey="close" stroke="var(--color-accent)" strokeWidth={1.5} dot={false} name="Close" />
                <Line type="monotone" dataKey="high" stroke="var(--color-text-muted)" strokeWidth={0.5} dot={false} name="High" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="low" stroke="var(--color-text-muted)" strokeWidth={0.5} dot={false} name="Low" strokeDasharray="2 2" />

                {/* Overlays */}
                {overlays.has('SMA 20') && <Line type="monotone" dataKey="sma20" stroke="#3b82f6" strokeWidth={1} dot={false} name="SMA 20" />}
                {overlays.has('SMA 50') && <Line type="monotone" dataKey="sma50" stroke="#f59e0b" strokeWidth={1} dot={false} name="SMA 50" />}
                {overlays.has('EMA 12') && <Line type="monotone" dataKey="ema12" stroke="#10b981" strokeWidth={1} dot={false} name="EMA 12" />}
                {overlays.has('EMA 26') && <Line type="monotone" dataKey="ema26" stroke="#ef4444" strokeWidth={1} dot={false} name="EMA 26" />}
                {overlays.has('Bollinger') && (
                  <>
                    <Line type="monotone" dataKey="bollingerUpper" stroke="#8b5cf6" strokeWidth={0.8} dot={false} name="BB Upper" strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="bollingerLower" stroke="#8b5cf6" strokeWidth={0.8} dot={false} name="BB Lower" strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="bollingerMid" stroke="#8b5cf6" strokeWidth={0.5} dot={false} name="BB Mid" strokeDasharray="2 2" />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Volume chart */}
          {showVolume && (
            <div className="mt-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                <Activity size={12} /> Volume
              </h4>
              <ResponsiveContainer width="100%" height={120}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }}
                    tickFormatter={(v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : `${(v / 1e3).toFixed(0)}K`} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [v.toLocaleString(), 'Volume']} />
                  <Bar dataKey="volume" fill="var(--color-accent)" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="volumeSma" stroke="var(--color-accent)" strokeWidth={1} dot={false} name="Vol SMA" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* RSI chart */}
          {showRSI && (
            <div className="mt-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">RSI (14)</h4>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} ticks={[30, 50, 70]} />
                  <ReferenceLine y={70} stroke="var(--color-loss)" strokeDasharray="3 3" strokeWidth={0.5} />
                  <ReferenceLine y={30} stroke="var(--color-profit)" strokeDasharray="3 3" strokeWidth={0.5} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [v.toFixed(1), 'RSI']} />
                  <Area type="monotone" dataKey="rsi" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* MACD chart */}
          {showMACD && (
            <div className="mt-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">MACD (12, 26, 9)</h4>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-tertiary)' }} />
                  <ReferenceLine y={0} stroke="var(--color-border-default)" strokeWidth={0.5} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [v.toFixed(3), '']} />
                  <Bar dataKey="macdHist" name="Histogram"
                    fill="var(--color-text-muted)" fillOpacity={0.3} />
                  <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MACD" />
                  <Line type="monotone" dataKey="macdSignal" stroke="#ef4444" strokeWidth={1} dot={false} name="Signal" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Market data footer */}
          <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-[var(--color-text-tertiary)]">
            <span>{chartData.length} data points</span>
            <span>Market Cap: {q.marketCap ? `$${(q.marketCap / 1e9).toFixed(1)}B` : 'N/A'}</span>
            <span>Avg Volume: {q.avgVolume >= 1e6 ? `${(q.avgVolume / 1e6).toFixed(1)}M` : q.avgVolume.toLocaleString()}</span>
            <span>Updated: {new Date(q.timestamp).toLocaleTimeString()}</span>
          </div>
        </>
      )}
    </div>
  );
}
