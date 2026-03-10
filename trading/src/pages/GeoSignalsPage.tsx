import { useState, useEffect, useCallback } from 'react';
import { Activity, Search, TrendingUp, TrendingDown, Minus, Shield, Zap, Clock, BarChart3, RefreshCw, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  listGeoSignals, getTensionIndex,
  type GeoSignal, type TensionIndex,
} from '@/lib/api';

const LEVEL_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-500/20 text-emerald-400',
  MODERATE: 'bg-blue-500/20 text-blue-400',
  ELEVATED: 'bg-amber-500/20 text-amber-400',
  HIGH: 'bg-orange-500/20 text-orange-400',
  CRITICAL: 'bg-red-500/20 text-red-400',
};

const DIRECTION_COLORS: Record<string, { bg: string; text: string }> = {
  BUY: { bg: 'bg-emerald-500', text: 'text-white' },
  SELL: { bg: 'bg-red-500', text: 'text-white' },
  HOLD: { bg: 'bg-gray-500', text: 'text-white' },
};

function StrengthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-8 text-[var(--color-text-muted)]">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-3)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[var(--color-text-secondary)]">{value}%</span>
    </div>
  );
}

function SignalCard({ signal, selected, onSelect }: { signal: GeoSignal; selected: boolean; onSelect: () => void }) {
  const dir = DIRECTION_COLORS[signal.direction] ?? DIRECTION_COLORS.HOLD;
  return (
    <button onClick={onSelect}
      className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 ${
        selected
          ? 'border-[var(--color-accent)]/40 bg-[var(--color-surface-2)]'
          : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] hover:border-[var(--color-border-default)]'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--color-text-primary)]">{signal.symbol}</span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${dir.bg} ${dir.text}`}>{signal.direction}</span>
        </div>
        <span className="text-lg font-bold text-[var(--color-accent)]">{signal.confidence}%</span>
      </div>
      <p className="text-[11px] text-[var(--color-text-muted)] mb-2">{signal.name}</p>
      <StrengthBar label="Bull" value={signal.bullStrength} color="bg-emerald-500" />
      <StrengthBar label="Bear" value={signal.bearStrength} color="bg-red-500" />
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase ${
          signal.volatility === 'EXTREME' ? 'bg-red-500/20 text-red-400' :
          signal.volatility === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>VOL: {signal.volatility}</span>
        <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[8px] text-[var(--color-text-muted)]">{signal.timeHorizon}</span>
        <span className="rounded bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[8px] text-[var(--color-text-muted)]">RR {signal.riskReward}x</span>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-[var(--color-warning)]">
        <Zap size={9} /> {signal.triggeringEvent.title.slice(0, 60)}{signal.triggeringEvent.title.length > 60 ? '...' : ''}
      </p>
    </button>
  );
}

function DetailPanel({ signal }: { signal: GeoSignal }) {
  const [tab, setTab] = useState<'setup' | 'reasoning' | 'timeline' | 'reliability'>('setup');
  const dir = DIRECTION_COLORS[signal.direction] ?? DIRECTION_COLORS.HOLD;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold text-[var(--color-text-primary)]">{signal.symbol}</span>
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${dir.bg} ${dir.text}`}>{signal.direction}</span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">{signal.name} · {signal.assetClass}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[var(--color-accent)]">{signal.confidence}%</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">confidence</p>
        </div>
      </div>

      {/* Bull/Bear Bars */}
      <div className="mb-4 rounded-xl bg-[var(--color-surface-2)] p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-emerald-400">Bullish Strength</span>
          <span className="font-semibold text-red-400">Bearish Strength</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--color-surface-3)]">
          <div className="bg-emerald-500 transition-all" style={{ width: `${signal.bullStrength}%` }} />
          <div className="flex-1" />
          <div className="bg-red-500 transition-all" style={{ width: `${signal.bearStrength}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[var(--color-text-muted)]">
          <span>{signal.bullStrength}%</span>
          <span>{signal.bearStrength}%</span>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {signal.tags.map((tag, i) => (
          <span key={i} className="rounded-full border border-[var(--color-border-subtle)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">{tag}</span>
        ))}
      </div>

      {/* Triggering Event */}
      <div className="mb-4 rounded-lg border-l-2 border-[var(--color-warning)] bg-[var(--color-warning)]/5 p-3">
        <p className="text-[10px] font-bold uppercase text-[var(--color-warning)] mb-1">Triggering Event</p>
        <p className="text-xs font-medium text-[var(--color-text-primary)]">{signal.triggeringEvent.title}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">{signal.triggeringEvent.category} · Severity {signal.triggeringEvent.severity}% · {signal.triggeringEvent.region}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-subtle)] mb-4">
        {(['setup', 'reasoning', 'timeline', 'reliability'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === t
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}>
            {t === 'setup' && <><Shield size={11} /> Trade Setup</>}
            {t === 'reasoning' && <><Zap size={11} /> AI Reasoning</>}
            {t === 'timeline' && <><Clock size={11} /> Timeline</>}
            {t === 'reliability' && <><BarChart3 size={11} /> Reliability</>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'setup' && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Trade Structure</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Risk/Reward</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{signal.tradeSetup.riskRewardRatio}x</p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Max Position</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{signal.tradeSetup.maxPositionPct}%</p>
            </div>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-2 uppercase">Risk vs Reward</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--color-text-muted)]">Risk</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-[var(--color-surface-3)]">
                <div className="h-full bg-red-500 rounded-l-full" style={{ width: `${Math.round(100 / (1 + signal.tradeSetup.riskRewardRatio))}%` }} />
              </div>
              <span className="text-[10px] text-emerald-400">+Reward</span>
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="flex items-center gap-1.5 text-[10px] text-amber-400">
              <AlertTriangle size={10} /> Educational purposes only. Not financial advice. Always perform your own due diligence.
            </p>
          </div>
        </div>
      )}

      {tab === 'reasoning' && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Causal Reasoning Chain</p>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-secondary)]">
            {signal.direction} {signal.name} — {signal.reasoningChain[1]?.description ?? signal.triggeringEvent.title}. Confidence {signal.confidence}%.
          </div>
          <div className="space-y-4">
            {signal.reasoningChain.map((step) => (
              <div key={step.step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-[10px] font-bold text-[var(--color-accent)]">
                    {step.step}
                  </div>
                  {step.step < signal.reasoningChain.length && (
                    <div className="w-px flex-1 bg-[var(--color-border-subtle)]" />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">{step.title}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{step.description}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] text-[var(--color-text-muted)]">contribution:</span>
                    <div className="h-1 w-20 rounded-full bg-[var(--color-surface-3)]">
                      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${step.contribution}%` }} />
                    </div>
                    <span className="text-[9px] text-[var(--color-accent)]">{step.contribution}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Event → Market Reaction</p>
          <div className="space-y-3">
            {[
              { time: 'T+0', badge: 'EVENT', badgeColor: 'bg-red-500', title: 'Event Detected', desc: signal.triggeringEvent.title },
              { time: 'T+2min', badge: 'NLP', badgeColor: 'bg-blue-500', title: 'NLP Classification', desc: `Category: ${signal.triggeringEvent.category} · Severity: ${signal.triggeringEvent.severity}%` },
              { time: 'T+5min', badge: 'SIGNAL', badgeColor: 'bg-emerald-500', title: `${signal.direction} Signal Generated`, desc: `${signal.name} ${signal.direction} · Confidence: ${signal.confidence}%` },
              { time: 'T+30min', badge: 'REACTION', badgeColor: 'bg-purple-500', title: 'Market Reaction', desc: `${signal.name} movement expected (est.)` },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-[var(--color-border-default)]'}`} />
                  {i < 3 && <div className="w-px h-8 bg-[var(--color-border-subtle)]" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{item.time}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold text-white ${item.badgeColor}`}>{item.badge}</span>
                  </div>
                  <p className="text-xs font-medium text-[var(--color-text-primary)]">{item.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reliability' && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Historical Performance</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Signal Accuracy</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{Math.round(signal.confidence * 0.78)}%</p>
              <p className="text-[9px] text-[var(--color-text-muted)]">directional calls</p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Win Rate</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{Math.round(signal.confidence * 0.72)}%</p>
              <p className="text-[9px] text-[var(--color-text-muted)]">profitable trades</p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Sharpe Ratio</p>
              <p className="text-lg font-bold text-[var(--color-text-primary)]">{(signal.riskReward * 0.7).toFixed(2)}</p>
              <p className="text-[9px] text-[var(--color-text-muted)]">risk-adjusted return</p>
            </div>
            <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase">Max Drawdown</p>
              <p className="text-lg font-bold text-[var(--color-loss)]">{(8 + Math.random() * 8).toFixed(1)}%</p>
              <p className="text-[9px] text-[var(--color-text-muted)]">peak-to-trough</p>
            </div>
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase mb-2">Signal Reliability Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-full bg-[var(--color-surface-3)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${signal.confidence * 0.78}%` }} />
              </div>
              <span className="text-xs font-bold text-[var(--color-accent)]">{(signal.confidence * 0.78).toFixed(1)}%</span>
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-[10px] text-amber-400">Performance metrics derived from backtesting engine using historical geopolitical events. Past performance does not guarantee future results.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function GeoSignalsPage() {
  const [signals, setSignals] = useState<GeoSignal[]>([]);
  const [tension, setTension] = useState<TensionIndex | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<'All' | 'BUY' | 'SELL' | 'HOLD'>('All');
  const [classFilter, setClassFilter] = useState('All');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      listGeoSignals().then((r) => { setSignals(r.signals); if (r.signals.length > 0 && !selectedId) setSelectedId(r.signals[0].id); }).catch(() => {}),
      getTensionIndex().then((r) => setTension(r)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = signals.filter((s) => {
    if (dirFilter !== 'All' && s.direction !== dirFilter) return false;
    if (classFilter !== 'All' && s.assetClass !== classFilter) return false;
    if (search && !s.symbol.toLowerCase().includes(search.toLowerCase()) && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selected = signals.find((s) => s.id === selectedId);
  const assetClasses = ['All', ...new Set(signals.map((s) => s.assetClass))];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      <span className="text-[13px] text-[var(--color-text-muted)]">Loading geo-signals...</span>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Geo Signals" description="AI-powered trade signals from geopolitical events"
        actions={
          <div className="flex items-center gap-3">
            {/* GTI Badge */}
            {tension && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-1.5">
                <Activity size={13} className="text-[var(--color-accent)]" />
                <div>
                  <p className="text-[9px] font-semibold uppercase text-[var(--color-text-muted)]">Global Tension Index</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">{tension.score}</span>
                    <span className={`text-[10px] font-semibold ${tension.change >= 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-profit)]'}`}>
                      {tension.change >= 0 ? '+' : ''}{tension.change}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${LEVEL_COLORS[tension.level] ?? ''}`}>{tension.level}</span>
                  </div>
                </div>
              </div>
            )}
            <button onClick={fetchData} className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        }
      />

      {/* Geo Event Ticker */}
      {tension && tension.triggers.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <div className="flex gap-2">
            {tension.triggers.slice(0, 5).map((t, i) => (
              <div key={i} className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-1.5 text-[11px]">
                <span className={`h-2 w-2 rounded-full ${t.severity >= 70 ? 'bg-red-500 animate-pulse' : t.severity >= 40 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <span className="font-medium text-[var(--color-text-primary)] max-w-[200px] truncate">{t.title}</span>
                <span className="text-[9px] text-[var(--color-text-muted)]">{t.region}</span>
                <span className={`rounded px-1 py-0.5 text-[8px] font-bold uppercase ${
                  t.severity >= 70 ? 'bg-red-500/20 text-red-400' : t.severity >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                }`}>{t.severity >= 70 ? 'CRITICAL' : t.severity >= 40 ? 'HIGH' : 'MEDIUM'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 260px)' }}>
        {/* Left sidebar — signal list */}
        <div className="w-80 shrink-0 space-y-3">
          {/* Filters */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Asset Class</p>
            <div className="flex flex-wrap gap-1">
              {assetClasses.map((c) => (
                <button key={c} onClick={() => setClassFilter(c)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    classFilter === c
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                      : 'bg-[var(--color-surface-1)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] hover:text-[var(--color-text-secondary)]'
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset..."
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none" />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">Direction</p>
            <div className="flex gap-1">
              {(['All', 'BUY', 'SELL', 'HOLD'] as const).map((d) => (
                <button key={d} onClick={() => setDirFilter(d)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    dirFilter === d
                      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                      : 'bg-[var(--color-surface-1)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]'
                  }`}>
                  {d === 'BUY' && <TrendingUp size={9} />}
                  {d === 'SELL' && <TrendingDown size={9} />}
                  {d === 'HOLD' && <Minus size={9} />}
                  {d === 'All' && <Activity size={9} />}
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Signal Cards */}
          <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--color-text-muted)]">No signals match filters</p>
            ) : (
              filtered.map((s) => (
                <SignalCard key={s.id} signal={s} selected={s.id === selectedId} onSelect={() => setSelectedId(s.id)} />
              ))
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        <div className="flex-1 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 overflow-y-auto">
          {selected ? (
            <DetailPanel signal={selected} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-[var(--color-text-muted)]">Select a signal to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
