import { useState, useEffect, useCallback } from 'react';
import { Play, Square, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, Minus, Zap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { MetricCard } from '@/components/MetricCard';
import {
  listStrategies, listForwardRuns, getForwardRun, startForwardRun, stopForwardRun, evaluateForwardRun,
  type StrategyIndexEntry, type ForwardRunIndexEntry, type ForwardRun, type ForwardSignal, type ProposedAction, type ForwardRunMode,
} from '@/lib/api';
import { timeAgo } from '@/lib/utils';

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'long') return <ArrowUpRight size={14} className="text-[var(--color-profit)]" />;
  if (direction === 'short') return <ArrowDownRight size={14} className="text-[var(--color-loss)]" />;
  return <Minus size={14} className="text-[var(--color-text-muted)]" />;
}

function SignalCard({ signal }: { signal: ForwardSignal }) {
  const strengthColor = signal.strength >= 70 ? 'text-[var(--color-profit)]' : signal.strength >= 40 ? 'text-amber-400' : 'text-[var(--color-text-muted)]';
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
      <div className="flex items-center gap-2">
        <DirectionIcon direction={signal.direction} />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{signal.symbol}</span>
        <span className="text-xs uppercase text-[var(--color-text-tertiary)]">{signal.direction}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">{signal.reason.slice(0, 50)}</span>
        <span className={`font-mono text-xs font-semibold ${strengthColor}`}>{signal.strength}%</span>
        <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(signal.timestamp)}</span>
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: ProposedAction }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {action.side.toUpperCase()} {action.quantity} {action.symbol}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)]">@ ${action.price.toFixed(2)}</span>
        </div>
        <StatusBadge status={action.status as 'proposed'} />
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{action.reason}</p>
    </div>
  );
}

export function ForwardRunnerPage() {
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [runs, setRuns] = useState<ForwardRunIndexEntry[]>([]);
  const [activeRun, setActiveRun] = useState<ForwardRun | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [selectedMode, setSelectedMode] = useState<ForwardRunMode>('insight_only');
  const [starting, setStarting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [strats, fwdRuns] = await Promise.all([listStrategies(), listForwardRuns()]);
      setStrategies(strats.strategies);
      setRuns(fwdRuns.forwardRuns);
      if (strats.strategies.length > 0 && !selectedStrategyId) {
        setSelectedStrategyId(strats.strategies[0].id);
      }
      const runningEntry = fwdRuns.forwardRuns.find((r) => r.status === 'running');
      if (runningEntry) {
        const detail = await getForwardRun(runningEntry.id);
        setActiveRun(detail.forwardRun);
      }
    } catch {} finally { setLoading(false); }
  }, [selectedStrategyId]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    if (!selectedStrategyId) return;
    setStarting(true);
    try {
      const res = await startForwardRun(selectedStrategyId, selectedMode);
      setActiveRun(res.forwardRun);
      await load();
    } catch {} finally { setStarting(false); }
  };

  const handleStop = async () => {
    if (!activeRun) return;
    setStopping(true);
    try { await stopForwardRun(activeRun.id); setActiveRun(null); await load(); } catch {} finally { setStopping(false); }
  };

  const handleEvaluate = async () => {
    if (!activeRun) return;
    setEvaluating(true);
    try { const res = await evaluateForwardRun(activeRun.id); setActiveRun(res.forwardRun); } catch {} finally { setEvaluating(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Forward Runner" description="Paper-only strategy evaluation — generate signals and proposed actions from live market data"
        actions={<StatusBadge status="paper" label="PAPER ONLY" />} />

      {/* Controls */}
      <div className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
        {!activeRun ? (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Strategy</label>
              <select value={selectedStrategyId} onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Mode</label>
              <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value as ForwardRunMode)}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
                <option value="insight_only">Insight Only</option>
                <option value="assisted">Assisted</option>
                <option value="semi_auto">Semi-Auto</option>
              </select>
            </div>
            <button onClick={handleStart} disabled={starting || !selectedStrategyId}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-profit)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
              {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {starting ? 'Starting...' : 'Start Runner'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{activeRun.strategyName}</span>
              <span className="text-xs text-[var(--color-text-tertiary)]">{activeRun.mode.replace(/_/g, ' ')}</span>
              <StatusBadge status={activeRun.status as 'running'} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleEvaluate} disabled={evaluating}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {evaluating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {evaluating ? 'Evaluating...' : 'Evaluate Now'}
              </button>
              <button onClick={handleStop} disabled={stopping}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-loss)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {stopping ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {activeRun && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label="Signals" value={String(activeRun.signals.length)} />
            <MetricCard label="Proposed Actions" value={String(activeRun.proposedActions.length)} />
            <MetricCard label="Last Evaluated" value={activeRun.lastEvaluatedAt ? timeAgo(activeRun.lastEvaluatedAt) : 'Never'} />
            <MetricCard label="Paper P&L" value={`$${activeRun.paperPnl.toFixed(2)}`}
              changeType={activeRun.paperPnl >= 0 ? 'profit' : 'loss'} />
          </div>

          {activeRun.proposedActions.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Proposed Actions</h2>
              <div className="space-y-2">{activeRun.proposedActions.slice(-10).reverse().map((a) => <ActionCard key={a.id} action={a} />)}</div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Signal History ({activeRun.signals.length})</h2>
            {activeRun.signals.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8 text-center">
                <p className="text-sm text-[var(--color-text-muted)]">Click "Evaluate Now" to generate signals from live market data.</p>
              </div>
            ) : (
              <div className="space-y-1.5">{activeRun.signals.slice(-20).reverse().map((s) => <SignalCard key={s.id} signal={s} />)}</div>
            )}
          </div>
        </>
      )}

      {!activeRun && (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-2xl bg-[var(--color-surface-2)] p-4"><Play size={28} className="text-[var(--color-text-muted)]" /></div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No active runners</h3>
            <p className="mt-1 max-w-md text-sm text-[var(--color-text-secondary)]">
              Select a strategy and click "Start Runner" to begin evaluating against live market data. All signals are paper-only.
            </p>
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Run History</h2>
          <div className="space-y-1.5">
            {runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs">
                <div><span className="font-medium text-[var(--color-text-primary)]">{r.strategyName}</span>
                  <span className="ml-2 text-[var(--color-text-muted)]">{new Date(r.startedAt).toLocaleDateString()}</span></div>
                <StatusBadge status={r.status as 'running' | 'stopped'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
