import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Play, FlaskConical, Brain, ArrowRightLeft, Shield, Globe, FileCheck, BarChart3, Activity, RefreshCw, TrendingUp, TrendingDown, Bell, Zap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { timeAgo } from '@/lib/utils';
import {
  listStrategies, listBacktestRuns, getPortfolio, listAiEvents, listForwardRuns, listEvidence, getWatchlistQuotes, listAlerts,
  getSettings, getIntelStatus, getTensionIndex,
  type StrategyIndexEntry, type BacktestIndexEntry, type PortfolioSnapshot, type AiEventIndexEntry, type ForwardRunIndexEntry, type EvidenceEntry, type WatchlistQuote, type Alert,
  type IntelSource, type TensionIndex,
} from '@/lib/api';

const DEFAULT_TICKER_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'BTC-USD', 'ETH-USD', 'GLD', 'TLT'];

export function DashboardPage() {
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [backtests, setBacktests] = useState<BacktestIndexEntry[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [aiEvents, setAiEvents] = useState<AiEventIndexEntry[]>([]);
  const [forwardRuns, setForwardRuns] = useState<ForwardRunIndexEntry[]>([]);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [ticker, setTicker] = useState<WatchlistQuote[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [intelSources, setIntelSources] = useState<IntelSource[]>([]);
  const [tension, setTension] = useState<TensionIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchAll = useCallback(() => {
    return Promise.all([
      listStrategies().then((r) => setStrategies(r.strategies)).catch(() => {}),
      listBacktestRuns().then((r) => setBacktests(r.backtestRuns)).catch(() => {}),
      getPortfolio().then((r) => setPortfolio(r.portfolio)).catch(() => {}),
      listAiEvents().then((r) => setAiEvents(r.aiEvents)).catch(() => {}),
      listForwardRuns().then((r) => setForwardRuns(r.forwardRuns)).catch(() => {}),
      listEvidence().then((r) => setEvidence(r.evidence)).catch(() => {}),
      getSettings()
        .then((r) => getWatchlistQuotes(r.settings.defaultWatchlistSymbols.length > 0 ? r.settings.defaultWatchlistSymbols : DEFAULT_TICKER_SYMBOLS))
        .then((r) => setTicker(r.quotes))
        .catch(() => getWatchlistQuotes(DEFAULT_TICKER_SYMBOLS).then((r) => setTicker(r.quotes)).catch(() => {})),
      listAlerts().then((r) => setAlerts(r.alerts)).catch(() => {}),
      getIntelStatus().then((r) => setIntelSources(r.sources)).catch(() => {}),
      getTensionIndex().then((r) => setTension(r)).catch(() => {}),
    ]).finally(() => { setLoading(false); setLastRefresh(Date.now()); });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(fetchAll, 60_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const activeStrategies = strategies.filter((s) => s.status === 'active' || s.status === 'paper').length;
  const runningForward = forwardRuns.filter((r) => r.status === 'running').length;
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;
  const triggeredAlerts = alerts.filter((a) => a.status === 'triggered').length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
      <span className="text-[13px] text-[var(--color-text-muted)]">Loading dashboard...</span>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <PageHeader title="Command Center" description="Portfolio, strategies, AI activity, and global intelligence"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                autoRefresh
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]'
              }`}>
              <RefreshCw size={11} className={autoRefresh ? 'animate-spin' : ''} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(lastRefresh)}</span>
          </div>
        }
      />

      {/* Global Tension Index + Geo Event Ticker */}
      {tension && (
        <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.03s' }}>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/geo-signals" className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 transition-all duration-200 hover:border-[var(--color-border-default)]">
              <Activity size={14} className="text-[var(--color-accent)]" />
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Global Tension Index</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">{tension.score}</span>
                  <span className={`text-[10px] font-semibold ${tension.change >= 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-profit)]'}`}>
                    {tension.change >= 0 ? '+' : ''}{tension.change}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
                    tension.level === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    tension.level === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                    tension.level === 'ELEVATED' ? 'bg-amber-500/20 text-amber-400' :
                    tension.level === 'MODERATE' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{tension.level}</span>
                </div>
              </div>
            </Link>
            {tension.triggers.length > 0 && (
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-2">
                  {tension.triggers.slice(0, 4).map((t, i) => (
                    <Link key={i} to="/geo-signals" className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-1.5 text-[11px] transition-all duration-200 hover:border-[var(--color-border-default)]">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${t.severity >= 70 ? 'bg-red-500 animate-pulse' : t.severity >= 40 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <span className="font-medium text-[var(--color-text-primary)] max-w-[180px] truncate">{t.title}</span>
                      <span className="text-[9px] text-[var(--color-text-muted)]">{t.region}</span>
                      <span className={`rounded px-1 py-0.5 text-[8px] font-bold ${t.severity >= 70 ? 'text-red-400' : t.severity >= 40 ? 'text-amber-400' : 'text-blue-400'}`}>
                        {t.severity >= 70 ? 'CRITICAL' : t.severity >= 40 ? 'HIGH' : 'MEDIUM'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market ticker strip */}
      {ticker.length > 0 && (
        <div className="mb-5 overflow-x-auto animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex gap-2">
            {ticker.map((q) => (
              <Link key={q.symbol} to={`/analytics?symbol=${q.symbol}`}
                className="group flex shrink-0 items-center gap-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 text-[12px] transition-all duration-200 hover:border-[var(--color-border-default)] hover:shadow-sm">
                <span className="font-semibold text-[var(--color-text-primary)]">{q.symbol}</span>
                <span className="text-[var(--color-text-secondary)]">${q.price.toFixed(2)}</span>
                <span className={`flex items-center gap-0.5 font-semibold ${q.changePct >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                  {q.changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <MetricCard label="Total Equity" value={portfolio ? `$${portfolio.totalEquity.toLocaleString()}` : '$100,000'} subtitle="Paper account" />
        <MetricCard label="Total P&L" value={portfolio ? `$${portfolio.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0'}
          change={portfolio ? portfolio.totalPnlPct : 0} />
        <MetricCard label="Strategies" value={String(strategies.length)} subtitle={activeStrategies > 0 ? `${activeStrategies} active` : undefined} />
        <MetricCard label="Backtests" value={String(backtests.length)} subtitle={backtests.filter((b) => b.status === 'complete').length > 0 ? `${backtests.filter((b) => b.status === 'complete').length} complete` : undefined} />
        <MetricCard label="Forward Runs" value={String(forwardRuns.length)} subtitle={runningForward > 0 ? `${runningForward} running` : undefined} />
        <MetricCard label="Alerts" value={String(alerts.length)} subtitle={triggeredAlerts > 0 ? `${triggeredAlerts} triggered` : activeAlerts > 0 ? `${activeAlerts} active` : undefined} />
      </div>

      {/* Quick actions */}
      <div className="mt-7 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
          <QuickAction to="/create" icon={PlusCircle} label="Create Strategy" accent />
          <QuickAction to="/backtests" icon={FlaskConical} label="Backtests" />
          <QuickAction to="/forward" icon={Play} label="Forward Runner" />
          <QuickAction to="/execution" icon={ArrowRightLeft} label="Execution" />
          <QuickAction to="/portfolio" icon={BarChart3} label="Portfolio" />
          <QuickAction to="/analytics" icon={Activity} label="Analytics" />
          <QuickAction to="/risk" icon={Shield} label="Risk Matrix" />
          <QuickAction to="/geo-signals" icon={Globe} label="Geo Signals" />
          <QuickAction to="/ai" icon={Brain} label="AI Pulse" />
          <QuickAction to="/alerts" icon={Bell} label="Alerts" />
        </div>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Active forward runs */}
          {runningForward > 0 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-semibold text-[var(--color-text-tertiary)]">
                  <Zap size={13} className="text-[var(--color-accent)]" /> Active Runners
                </h2>
                <Link to="/forward" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">View all</Link>
              </div>
              <div className="space-y-1.5">
                {forwardRuns.filter((r) => r.status === 'running').map((r) => (
                  <Link key={r.id} to="/forward" className="flex items-center justify-between rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-3 text-[12px] transition-all duration-200 hover:border-[var(--color-accent)]/40">
                    <span className="font-medium text-[var(--color-text-primary)]">{r.strategyName}</span>
                    <StatusBadge status="running" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent strategies */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">Recent Strategies</h2>
              {strategies.length > 0 && <Link to="/strategies" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">View all</Link>}
            </div>
            {strategies.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
                    <PlusCircle size={24} className="text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">No strategies yet</p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Create your first strategy to get started</p>
                  <Link to="/create" className="mt-4 rounded-lg bg-[var(--color-accent)] px-5 py-2 text-[13px] font-semibold text-[#121417] transition-all duration-200 hover:brightness-110 hover:shadow-[0_2px_12px_rgba(90,197,58,0.3)]">
                    Create Strategy
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {strategies.slice(0, 5).map((s) => (
                  <Link key={s.id} to={`/strategy/${s.id}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-[12px] transition-all duration-200 hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-2)]">
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">{s.name}</span>
                      <span className="ml-2 text-[var(--color-text-muted)]">{s.templateId}</span>
                    </div>
                    <StatusBadge status={s.status as 'draft' | 'active' | 'paper'} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent backtests */}
          {backtests.length > 0 && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">Recent Backtests</h2>
                <Link to="/backtests" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">View all</Link>
              </div>
              <div className="space-y-1">
                {backtests.slice(0, 5).map((bt) => (
                  <Link key={bt.id} to={`/backtests?id=${bt.id}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-[12px] transition-all duration-200 hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-2)]">
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">{bt.strategyName}</span>
                      <span className="ml-2 text-[var(--color-text-muted)]">{new Date(bt.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bt.totalReturn !== null && (
                        <span className={`font-semibold ${bt.totalReturn >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                          {bt.totalReturn >= 0 ? '+' : ''}{bt.totalReturn.toFixed(2)}%
                        </span>
                      )}
                      <StatusBadge status={bt.status as 'complete' | 'running' | 'failed'} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* AI Activity */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-tertiary)]"><Brain size={13} /> AI Activity</h2>
              <Link to="/ai" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">View all</Link>
            </div>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              {aiEvents.length === 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)]">No AI activity yet. Request an AI interpretation on a strategy.</p>
              ) : (
                <div className="space-y-2.5">
                  {aiEvents.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-text-secondary)]">{ev.type.replace(/_/g, ' ')}</span>
                      <span className="text-[var(--color-text-muted)]">{timeAgo(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Intel Sources */}
          <div>
            <h2 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-tertiary)]"><Globe size={13} /> Intel Sources</h2>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <div className="space-y-2.5">
                {intelSources.length > 0 ? intelSources.map((src) => (
                  <div key={src.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        src.status === 'live' ? 'bg-[var(--color-active)]' :
                        src.status === 'stale' ? 'bg-[var(--color-warning)]' :
                        src.status === 'down' ? 'bg-[var(--color-loss)]' : 'bg-[var(--color-text-muted)]'
                      }`} />
                      <span className="text-[var(--color-text-secondary)]">{src.name}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{src.impact}</span>
                  </div>
                )) : (
                  <div className="space-y-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-4 rounded animate-shimmer" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-tertiary)]"><FileCheck size={13} /> Audit Trail</h2>
              <Link to="/evidence" className="text-[11px] font-medium text-[var(--color-accent)] hover:underline">View all</Link>
            </div>
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              {evidence.length === 0 ? (
                <p className="text-[12px] text-[var(--color-text-muted)]">No audit events yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {evidence.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between text-[11px]">
                      <span className="text-[var(--color-text-secondary)]">{ev.summary}</span>
                      <span className="text-[var(--color-text-muted)]">{timeAgo(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label, accent }: { to: string; icon: typeof PlusCircle; label: string; accent?: boolean }) {
  return (
    <Link to={to}
      className={`group flex items-center gap-2 rounded-lg border p-2.5 text-[12px] font-medium transition-all duration-200 ${
        accent
          ? 'border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/40'
          : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]'
      }`}>
      <Icon size={15} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
