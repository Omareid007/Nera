/**
 * AlertsPage — Create, manage, and track price/risk threshold alerts.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Bell, BellOff, Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown, Activity, Shield, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { listAlerts, createAlertApi, dismissAlert, deleteAlertApi, evaluateAlerts, type Alert } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

const ALERT_TYPES = [
  { value: 'price_above', label: 'Price Above', icon: TrendingUp, description: 'Triggers when price rises above threshold' },
  { value: 'price_below', label: 'Price Below', icon: TrendingDown, description: 'Triggers when price drops below threshold' },
  { value: 'pnl_threshold', label: 'P&L Threshold', icon: BarChart3, description: 'Triggers on portfolio P&L change' },
  { value: 'drawdown_threshold', label: 'Drawdown Alert', icon: AlertTriangle, description: 'Triggers on portfolio drawdown level' },
  { value: 'volume_spike', label: 'Volume Spike', icon: Activity, description: 'Triggers on unusual volume activity' },
  { value: 'rsi_overbought', label: 'RSI Overbought', icon: TrendingUp, description: 'Triggers when RSI exceeds threshold (default 70)' },
  { value: 'rsi_oversold', label: 'RSI Oversold', icon: TrendingDown, description: 'Triggers when RSI drops below threshold (default 30)' },
];

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'triggered' | 'dismissed'>('all');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState('');

  const handleEvaluate = async () => {
    setEvaluating(true); setEvalResult('');
    try {
      const r = await evaluateAlerts();
      setEvalResult(`Evaluated ${r.evaluated} alerts. ${r.triggered.length} triggered.`);
      // Reload alerts
      const res = await listAlerts();
      setAlerts(res.alerts);
      setTimeout(() => setEvalResult(''), 5000);
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Failed to evaluate'); }
    finally { setEvaluating(false); }
  };

  // Create form
  const [name, setName] = useState('');
  const [type, setType] = useState<Alert['type']>('price_above');
  const [symbol, setSymbol] = useState('');
  const [threshold, setThreshold] = useState('');

  const refresh = useCallback(() => {
    listAlerts().then((r) => setAlerts(r.alerts)).catch((e) => setActionError(e instanceof Error ? e.message : 'Failed to load alerts')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !threshold) return;
    setCreating(true);
    try {
      await createAlertApi({
        name: name.trim(),
        type,
        symbol: symbol.trim() || undefined,
        threshold: Number(threshold),
      });
      setName(''); setType('price_above'); setSymbol(''); setThreshold('');
      setShowCreate(false);
      refresh();
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to create alert'); }
    setCreating(false);
  };

  const handleDismiss = async (id: string) => {
    await dismissAlert(id).catch((e) => setActionError(e instanceof Error ? e.message : 'Failed to dismiss'));
    refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteAlertApi(id).catch((e) => setActionError(e instanceof Error ? e.message : 'Failed to delete'));
    refresh();
  };

  const filtered = alerts.filter((a) => filter === 'all' || a.status === filter);
  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Alerts"
        description="Price, risk, and technical indicator threshold alerts"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleEvaluate} disabled={evaluating}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] disabled:opacity-50">
              {evaluating ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Evaluate Now
            </button>
            <button onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)]">
              <Plus size={16} /> New Alert
            </button>
          </div>
        }
      />
      {evalResult && <div className="mb-3 rounded-lg bg-teal-500/10 px-3 py-2 text-xs text-teal-400">{evalResult}</div>}

      {/* Stats */}
      <div className="mb-4 flex gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-teal-500/10 px-3 py-1.5 text-xs font-medium text-teal-400">
          <Bell size={12} /> {activeCount} Active
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
          <AlertTriangle size={12} /> {triggeredCount} Triggered
        </div>
      </div>

      {actionError && <div className="mb-4 rounded-lg border border-[var(--color-loss)]/30 bg-[var(--color-loss)]/5 px-4 py-2 text-xs text-[var(--color-loss)]">{actionError}</div>}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate}
          className="mb-6 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">Create New Alert</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-tertiary)]">Alert Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AAPL breakout"
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-tertiary)]">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as Alert['type'])}
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none">
                {ALERT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-tertiary)]">Symbol (optional)</label>
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL"
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-tertiary)]">Threshold</label>
              <input type="number" step="any" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="150.00"
                className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={creating}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)] disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Alert'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="rounded-lg bg-[var(--color-surface-2)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">Cancel</button>
          </div>
          {/* Type descriptions */}
          <div className="mt-3 text-xs text-[var(--color-text-tertiary)]">
            {ALERT_TYPES.find((t) => t.value === type)?.description}
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="mb-4 flex gap-1">
        {(['all', 'active', 'triggered', 'dismissed'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
              filter === f ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12 text-center">
          <BellOff size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">No alerts {filter !== 'all' ? `with status "${filter}"` : 'yet'}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const typeInfo = ALERT_TYPES.find((t) => t.value === alert.type);
            const Icon = typeInfo?.icon ?? Shield;
            return (
              <div key={alert.id}
                className={`flex items-center justify-between rounded-xl border p-4 text-xs transition-colors ${
                  alert.status === 'active' ? 'border-teal-500/20 bg-teal-500/5' :
                  alert.status === 'triggered' ? 'border-amber-500/30 bg-amber-500/5' :
                  'border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] opacity-60'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    alert.status === 'active' ? 'bg-teal-500/10 text-teal-400' :
                    alert.status === 'triggered' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">{alert.name}</div>
                    <div className="mt-0.5 text-[var(--color-text-tertiary)]">
                      {typeInfo?.label} {alert.symbol ? `· ${alert.symbol}` : ''} · Threshold: {alert.threshold}
                    </div>
                    {alert.triggeredAt && (
                      <div className="mt-0.5 text-amber-400">Triggered {timeAgo(alert.triggeredAt)} — Value: {alert.triggeredValue?.toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-muted)]">{timeAgo(alert.createdAt)}</span>
                  {alert.status === 'triggered' && (
                    <button onClick={() => handleDismiss(alert.id)}
                      className="rounded-md bg-[var(--color-surface-2)] px-2 py-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                      Dismiss
                    </button>
                  )}
                  <button onClick={() => handleDelete(alert.id)}
                    className="rounded-md p-1 text-[var(--color-text-muted)] hover:text-[var(--color-loss)]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert type guide */}
      <div className="mt-8 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Available Alert Types</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALERT_TYPES.map((t) => (
            <div key={t.value} className="flex items-start gap-2 rounded-lg bg-[var(--color-surface-2)] p-3">
              <t.icon size={14} className="mt-0.5 text-[var(--color-accent)]" />
              <div>
                <div className="text-xs font-medium text-[var(--color-text-primary)]">{t.label}</div>
                <div className="text-[10px] text-[var(--color-text-tertiary)]">{t.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
