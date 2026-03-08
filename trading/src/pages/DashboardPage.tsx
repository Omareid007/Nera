import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Play, FlaskConical, Brain, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { listStrategies, listBacktestRuns, getPortfolio, type StrategyIndexEntry, type BacktestIndexEntry, type PortfolioSnapshot } from '@/lib/api';

export function DashboardPage() {
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [backtests, setBacktests] = useState<BacktestIndexEntry[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listStrategies().then((r) => setStrategies(r.strategies)).catch(() => {}),
      listBacktestRuns().then((r) => setBacktests(r.backtestRuns)).catch(() => {}),
      getPortfolio().then((r) => setPortfolio(r.portfolio)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const activeCount = strategies.filter((s) => s.status === 'active' || s.status === 'paper').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Command Center" description="Portfolio overview, active strategies, and recent activity" />

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Total Equity" value={portfolio ? `$${portfolio.totalEquity.toLocaleString()}` : '$100,000'} subtitle="Paper account" />
        <MetricCard label="Total P&L" value={portfolio ? `$${portfolio.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0.00'}
          change={portfolio ? portfolio.totalPnlPct : 0} />
        <MetricCard label="Strategies" value={String(strategies.length)} subtitle={activeCount > 0 ? `${activeCount} active` : undefined} />
        <MetricCard label="Backtests" value={String(backtests.length)} subtitle={backtests.filter((b) => b.status === 'complete').length > 0 ? `${backtests.filter((b) => b.status === 'complete').length} complete` : undefined} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction to="/create" icon={PlusCircle} label="Create Strategy" />
          <QuickAction to="/backtests" icon={FlaskConical} label="View Backtests" />
          <QuickAction to="/forward" icon={Play} label="Forward Runner" />
          <QuickAction to="/ai" icon={Brain} label="AI Pulse" />
        </div>
      </div>

      {/* Recent strategies */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)]">Recent Strategies</h2>
          {strategies.length > 0 && <Link to="/strategies" className="text-xs text-[var(--color-accent)] hover:underline">View all →</Link>}
        </div>
        {strategies.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PlusCircle size={32} className="mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">No strategies yet</p>
              <Link to="/create" className="mt-3 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)] transition-colors hover:bg-[var(--color-accent-hover)]">
                Create your first strategy
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            {strategies.slice(0, 5).map((s) => (
              <Link key={s.id} to={`/strategy/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs transition-colors hover:border-[var(--color-border-default)]">
                <div>
                  <span className="font-medium text-[var(--color-text-primary)]">{s.name}</span>
                  <span className="ml-2 text-[var(--color-text-tertiary)]">{s.templateId}</span>
                </div>
                <StatusBadge status={s.status as 'draft' | 'active' | 'paper'} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent backtests */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)]">Recent Backtests</h2>
          {backtests.length > 0 && <Link to="/backtests" className="text-xs text-[var(--color-accent)] hover:underline">View all →</Link>}
        </div>
        {backtests.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
            <p className="text-center text-sm text-[var(--color-text-muted)]">No backtests yet. Create a strategy and run a backtest to see results.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {backtests.slice(0, 5).map((bt) => (
              <Link key={bt.id} to={`/backtests?id=${bt.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs transition-colors hover:border-[var(--color-border-default)]">
                <div>
                  <span className="font-medium text-[var(--color-text-primary)]">{bt.strategyName}</span>
                  <span className="ml-2 text-[var(--color-text-tertiary)]">{new Date(bt.createdAt).toLocaleDateString()}</span>
                </div>
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
        )}
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: typeof PlusCircle; label: string }) {
  return (
    <Link to={to}
      className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}
