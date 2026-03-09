import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Play, FlaskConical, Brain, Loader2, ArrowRightLeft, Shield, Globe, FileCheck, BarChart3, Activity } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import {
  listStrategies, listBacktestRuns, getPortfolio, listAiEvents, listForwardRuns, listEvidence,
  type StrategyIndexEntry, type BacktestIndexEntry, type PortfolioSnapshot, type AiEventIndexEntry, type ForwardRunIndexEntry, type EvidenceEntry,
} from '@/lib/api';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

export function DashboardPage() {
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [backtests, setBacktests] = useState<BacktestIndexEntry[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [aiEvents, setAiEvents] = useState<AiEventIndexEntry[]>([]);
  const [forwardRuns, setForwardRuns] = useState<ForwardRunIndexEntry[]>([]);
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listStrategies().then((r) => setStrategies(r.strategies)).catch(() => {}),
      listBacktestRuns().then((r) => setBacktests(r.backtestRuns)).catch(() => {}),
      getPortfolio().then((r) => setPortfolio(r.portfolio)).catch(() => {}),
      listAiEvents().then((r) => setAiEvents(r.aiEvents)).catch(() => {}),
      listForwardRuns().then((r) => setForwardRuns(r.forwardRuns)).catch(() => {}),
      listEvidence().then((r) => setEvidence(r.evidence)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const activeStrategies = strategies.filter((s) => s.status === 'active' || s.status === 'paper').length;
  const runningForward = forwardRuns.filter((r) => r.status === 'running').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Command Center" description="Unified intelligence — portfolio, strategies, AI activity, and World Monitor feeds" />

      {/* Top metrics row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <MetricCard label="Total Equity" value={portfolio ? `$${portfolio.totalEquity.toLocaleString()}` : '$100,000'} subtitle="Paper account" />
        <MetricCard label="Total P&L" value={portfolio ? `$${portfolio.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0.00'}
          change={portfolio ? portfolio.totalPnlPct : 0} />
        <MetricCard label="Strategies" value={String(strategies.length)} subtitle={activeStrategies > 0 ? `${activeStrategies} active` : undefined} />
        <MetricCard label="Backtests" value={String(backtests.length)} subtitle={backtests.filter((b) => b.status === 'complete').length > 0 ? `${backtests.filter((b) => b.status === 'complete').length} complete` : undefined} />
        <MetricCard label="Forward Runs" value={String(forwardRuns.length)} subtitle={runningForward > 0 ? `${runningForward} running` : undefined} />
        <MetricCard label="AI Events" value={String(aiEvents.length)} subtitle={aiEvents.length > 0 ? `Latest: ${timeAgo(aiEvents[0]?.timestamp ?? 0)}` : undefined} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <QuickAction to="/create" icon={PlusCircle} label="Create Strategy" />
          <QuickAction to="/backtests" icon={FlaskConical} label="Backtests" />
          <QuickAction to="/forward" icon={Play} label="Forward Runner" />
          <QuickAction to="/execution" icon={ArrowRightLeft} label="Execution" />
          <QuickAction to="/portfolio" icon={BarChart3} label="Portfolio" />
          <QuickAction to="/ai" icon={Brain} label="AI Pulse" />
          <QuickAction to="/evidence" icon={FileCheck} label="Evidence" />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Left column — Strategies + Backtests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active forward runs */}
          {runningForward > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><Activity size={14} className="text-[var(--color-profit)]" /> Active Runners</h2>
                <Link to="/forward" className="text-xs text-[var(--color-accent)] hover:underline">View all</Link>
              </div>
              <div className="space-y-1.5">
                {forwardRuns.filter((r) => r.status === 'running').map((r) => (
                  <Link key={r.id} to="/forward" className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs transition-colors hover:border-emerald-500/50">
                    <div><span className="font-medium text-[var(--color-text-primary)]">{r.strategyName}</span></div>
                    <StatusBadge status="running" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent strategies */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)]">Recent Strategies</h2>
              {strategies.length > 0 && <Link to="/strategies" className="text-xs text-[var(--color-accent)] hover:underline">View all</Link>}
            </div>
            {strategies.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <PlusCircle size={32} className="mb-3 text-[var(--color-text-muted)]" />
                  <p className="text-sm text-[var(--color-text-secondary)]">No strategies yet</p>
                  <Link to="/create" className="mt-3 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)]">Create your first strategy</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {strategies.slice(0, 5).map((s) => (
                  <Link key={s.id} to={`/strategy/${s.id}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs transition-colors hover:border-[var(--color-border-default)]">
                    <div><span className="font-medium text-[var(--color-text-primary)]">{s.name}</span>
                      <span className="ml-2 text-[var(--color-text-tertiary)]">{s.templateId}</span></div>
                    <StatusBadge status={s.status as 'draft' | 'active' | 'paper'} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent backtests */}
          {backtests.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)]">Recent Backtests</h2>
                <Link to="/backtests" className="text-xs text-[var(--color-accent)] hover:underline">View all</Link>
              </div>
              <div className="space-y-1.5">
                {backtests.slice(0, 5).map((bt) => (
                  <Link key={bt.id} to={`/backtests?id=${bt.id}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs transition-colors hover:border-[var(--color-border-default)]">
                    <div><span className="font-medium text-[var(--color-text-primary)]">{bt.strategyName}</span>
                      <span className="ml-2 text-[var(--color-text-tertiary)]">{new Date(bt.createdAt).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-2">
                      {bt.totalReturn !== null && (
                        <span className={bt.totalReturn >= 0 ? 'font-medium text-[var(--color-profit)]' : 'font-medium text-[var(--color-loss)]'}>
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

        {/* Right sidebar — Intelligence feeds */}
        <div className="space-y-6">
          {/* AI Activity */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><Brain size={14} /> AI Activity</h2>
              <Link to="/ai" className="text-xs text-[var(--color-accent)] hover:underline">View all</Link>
            </div>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              {aiEvents.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No AI activity yet. Request an AI interpretation on a strategy.</p>
              ) : (
                <div className="space-y-2">
                  {aiEvents.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-secondary)]">{ev.type.replace(/_/g, ' ')}</span>
                      <span className="text-[var(--color-text-muted)]">{timeAgo(ev.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* World Monitor Intel */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><Globe size={14} /> Intel Sources</h2>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <div className="space-y-2">
                {[
                  { name: 'ACLED Conflicts', status: 'live', impact: 'Defense sector' },
                  { name: 'GDELT News', status: 'live', impact: 'Sentiment signals' },
                  { name: 'CII Risk Scores', status: 'live', impact: 'EM exposure' },
                  { name: 'EIA Energy', status: 'live', impact: 'Energy sector' },
                  { name: 'Sanctions Intel', status: 'live', impact: 'Compliance' },
                ].map((src) => (
                  <div key={src.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[var(--color-text-secondary)]">{src.name}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{src.impact}</span>
                  </div>
                ))}
              </div>
              <a href="/" className="mt-3 block text-center text-xs text-[var(--color-accent)] hover:underline">Open World Monitor</a>
            </div>
          </div>

          {/* Evidence trail */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><Shield size={14} /> Audit Trail</h2>
              <Link to="/evidence" className="text-xs text-[var(--color-accent)] hover:underline">View all</Link>
            </div>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              {evidence.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No audit events yet.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between text-xs">
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

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof PlusCircle; label: string }) {
  return (
    <Link to={to}
      className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
      <Icon size={16} /><span>{label}</span>
    </Link>
  );
}
