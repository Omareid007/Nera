import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, AlertTriangle, XCircle, Loader2, Globe, Database, Brain, BarChart3,
  RefreshCw, Activity, Clock, ToggleLeft, ToggleRight, History, Bell, Download, ScrollText,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { timeAgo } from '@/lib/utils';
import {
  listStrategies, listBacktestRuns, listForwardRuns, listAiEvents, listEvidence,
  getProviderHealth, getPlatformConfig, toggleFeatureFlagApi, listConfigHistory,
  listAuditLog, listNotifications, exportData,
  type ProviderStatus, type PlatformConfig, type ConfigHistoryEntry,
  type AuditIndexEntry, type NotificationRecord,
} from '@/lib/api';

interface SystemStats {
  strategies: number;
  backtests: number;
  forwardRuns: number;
  aiEvents: number;
  evidenceRecords: number;
}

type AdminTab = 'overview' | 'flags' | 'audit' | 'notifications' | 'config' | 'export';

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<SystemStats>({ strategies: 0, backtests: 0, forwardRuns: 0, aiEvents: 0, evidenceRecords: 0 });
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [healthSummary, setHealthSummary] = useState<{ operational: number; degraded: number; down: number; unknown: number } | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [configHistory, setConfigHistory] = useState<ConfigHistoryEntry[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditIndexEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [strats, bts, fwd, ai, ev] = await Promise.all([
        listStrategies().catch(() => ({ strategies: [] })),
        listBacktestRuns().catch(() => ({ backtestRuns: [] })),
        listForwardRuns().catch(() => ({ forwardRuns: [] })),
        listAiEvents().catch(() => ({ aiEvents: [] })),
        listEvidence().catch(() => ({ evidence: [] })),
      ]);
      setStats({
        strategies: strats.strategies.length,
        backtests: bts.backtestRuns.length,
        forwardRuns: fwd.forwardRuns.length,
        aiEvents: ai.aiEvents.length,
        evidenceRecords: ev.evidence.length,
      });
    } finally { setLoading(false); }
  }, []);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const r = await getProviderHealth();
      setProviders(r.providers);
      setHealthSummary(r.summary);
    } catch { /* keep existing */ }
    finally { setHealthLoading(false); }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const [cfg, hist] = await Promise.all([
        getPlatformConfig().catch(() => null),
        listConfigHistory().catch(() => ({ history: [], total: 0 })),
      ]);
      if (cfg) setPlatformConfig(cfg.config);
      setConfigHistory(hist.history);
    } catch { /* ignore */ }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const r = await listAuditLog();
      setAuditEntries(r.entries);
    } catch { /* ignore */ }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const r = await listNotifications();
      setNotifications(r.notifications);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([loadStats(), loadHealth(), loadConfig(), loadAudit(), loadNotifications()]);
  }, [loadStats, loadHealth, loadConfig, loadAudit, loadNotifications]);

  const handleToggleFlag = async (flagId: string, enabled: boolean) => {
    setTogglingFlag(flagId);
    try {
      const r = await toggleFeatureFlagApi(flagId, enabled);
      setPlatformConfig(r.config);
    } catch { /* ignore */ }
    setTogglingFlag(null);
  };

  const handleExport = (entity: 'strategies' | 'backtests' | 'ledger' | 'orders' | 'portfolio') => {
    exportData(entity, 'csv');
  };

  const categoryIcons: Record<string, typeof Globe> = {
    market_data: BarChart3,
    llm: Brain,
    infrastructure: Database,
    intelligence: Globe,
  };

  const TABS: { id: AdminTab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'flags', label: 'Feature Flags', icon: ToggleLeft },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'config', label: 'Config History', icon: History },
    { id: 'export', label: 'Data Export', icon: Download },
  ];

  const totalRoutes = platformConfig ? platformConfig.featureFlags.length + 35 : 50;

  return (
    <div>
      <PageHeader title="Admin" description="System health, configuration, audit trail, and platform operations"
        actions={
          <button onClick={() => { loadStats(); loadHealth(); loadConfig(); loadAudit(); loadNotifications(); }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        }
      />

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard label="Strategies" value={String(stats.strategies)} />
            <MetricCard label="Backtests" value={String(stats.backtests)} />
            <MetricCard label="Forward Runs" value={String(stats.forwardRuns)} />
            <MetricCard label="AI Events" value={String(stats.aiEvents)} />
            <MetricCard label="Evidence Records" value={String(stats.evidenceRecords)} />
          </div>

          {/* Provider Health */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><Activity size={14} /> Provider Status (Live)</h2>
              {healthSummary && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--color-active)]">{healthSummary.operational} up</span>
                  {healthSummary.degraded > 0 && <span className="text-[var(--color-warning)]">{healthSummary.degraded} slow</span>}
                  {healthSummary.down > 0 && <span className="text-[var(--color-loss)]">{healthSummary.down} down</span>}
                  {healthLoading && <Loader2 size={12} className="animate-spin text-[var(--color-text-muted)]" />}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((p) => {
                const Icon = categoryIcons[p.category] ?? Globe;
                return (
                  <div key={p.name} className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                    <div className="flex items-center gap-2">
                      {p.status === 'operational' ? <CheckCircle size={14} className="text-[var(--color-active)]" /> :
                       p.status === 'degraded' ? <AlertTriangle size={14} className="text-[var(--color-warning)]" /> :
                       p.status === 'down' ? <XCircle size={14} className="text-[var(--color-loss)]" /> :
                       <Shield size={14} className="text-[var(--color-text-muted)]" />}
                      <Icon size={14} className="text-[var(--color-text-muted)]" />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{p.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{p.description}</p>
                    {p.latencyMs !== null && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                        <Clock size={10} /> {p.latencyMs}ms
                      </p>
                    )}
                  </div>
                );
              })}
              {providers.length === 0 && !healthLoading && (
                <p className="col-span-full text-xs text-[var(--color-text-muted)]">Loading provider health...</p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">System</h2>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
              <div className="grid gap-3 text-xs">
                <InfoRow label="Platform" value="Nera" />
                <InfoRow label="Version" value="2.0.0" />
                <InfoRow label="Config Version" value={platformConfig ? `v${platformConfig.version}` : 'Loading...'} />
                <InfoRow label="Mode" value="Paper Trading" valueColor="text-[var(--color-info)]" />
                <InfoRow label="API Endpoints" value={`${totalRoutes} RPCs`} />
                <InfoRow label="Storage" value="Redis (Upstash) + Convex" />
                <InfoRow label="Intelligence Sources" value="22 domains" />
                <InfoRow label="LLM Providers" value={platformConfig?.aiModelPolicy.primaryProvider ?? 'groq'} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Feature Flags Tab */}
      {tab === 'flags' && platformConfig && (
        <div>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            Toggle features on/off. Changes are versioned and can be rolled back from Config History.
            Config v{platformConfig.version} — last updated {timeAgo(platformConfig.updatedAt)}
          </p>
          {(['trading', 'ai', 'analytics', 'admin', 'integration'] as const).map((cat) => {
            const flags = platformConfig.featureFlags.filter((f) => f.category === cat);
            if (flags.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{cat}</h3>
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                  <div className="space-y-3">
                    {flags.map((flag) => (
                      <div key={flag.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-[var(--color-text-secondary)]">{flag.name}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{flag.description}</p>
                        </div>
                        <button
                          onClick={() => handleToggleFlag(flag.id, !flag.enabled)}
                          disabled={togglingFlag === flag.id}
                          className="flex items-center gap-1"
                        >
                          {togglingFlag === flag.id ? (
                            <Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" />
                          ) : flag.enabled ? (
                            <ToggleRight size={24} className="text-[var(--color-active)]" />
                          ) : (
                            <ToggleLeft size={24} className="text-[var(--color-text-muted)]" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Trading Limits</h3>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <InfoRow label="Max Strategies" value={String(platformConfig.tradingLimits.maxStrategies)} />
                <InfoRow label="Max Backtests/Day" value={String(platformConfig.tradingLimits.maxBacktestsPerDay)} />
                <InfoRow label="Max Forward Runs" value={String(platformConfig.tradingLimits.maxForwardRuns)} />
                <InfoRow label="Max Watchlists" value={String(platformConfig.tradingLimits.maxWatchlists)} />
                <InfoRow label="Max Alerts" value={String(platformConfig.tradingLimits.maxAlertsPerUser)} />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">AI Model Policy</h3>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <InfoRow label="Primary Provider" value={platformConfig.aiModelPolicy.primaryProvider} />
                <InfoRow label="Fallback Providers" value={platformConfig.aiModelPolicy.fallbackProviders.join(', ') || 'None'} />
                <InfoRow label="Max Tokens/Request" value={String(platformConfig.aiModelPolicy.maxTokensPerRequest)} />
                <InfoRow label="Max Requests/Hour" value={String(platformConfig.aiModelPolicy.maxRequestsPerHour)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {tab === 'audit' && (
        <div>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            All API mutation actions are logged automatically. {auditEntries.length} entries recorded.
          </p>
          {auditEntries.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8 text-center">
              <ScrollText size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">No audit entries yet. Actions will appear here as you use the platform.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]">
                    <th className="px-3 py-2 text-left font-medium text-[var(--color-text-tertiary)]">Action</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--color-text-tertiary)]">Actor</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--color-text-tertiary)]">Status</th>
                    <th className="px-3 py-2 text-right font-medium text-[var(--color-text-tertiary)]">When</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.slice(0, 50).map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--color-border-subtle)] last:border-0">
                      <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{entry.action}</td>
                      <td className="px-3 py-2 text-[var(--color-text-tertiary)]">{entry.actor}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          entry.responseStatus < 300 ? 'bg-emerald-500/20 text-emerald-400' :
                          entry.responseStatus < 500 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{entry.responseStatus}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--color-text-muted)]">{timeAgo(entry.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            Notification delivery history. Configure webhook URLs in Settings.
          </p>
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8 text-center">
              <Bell size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">No notifications sent yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 50).map((n) => (
                <div key={n.id} className={`flex items-center justify-between rounded-xl border p-3 text-xs ${
                  n.status === 'sent' ? 'border-emerald-500/20 bg-emerald-500/5' :
                  n.status === 'failed' ? 'border-red-500/20 bg-red-500/5' :
                  'border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]'
                }`}>
                  <div>
                    <div className="font-medium text-[var(--color-text-primary)]">{n.title}</div>
                    <div className="mt-0.5 text-[var(--color-text-tertiary)]">{n.message}</div>
                    {n.error && <div className="mt-0.5 text-red-400">{n.error}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[var(--color-text-muted)]">{n.channel}</div>
                    <div className="text-[var(--color-text-muted)]">{timeAgo(n.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config History Tab */}
      {tab === 'config' && (
        <div>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            Configuration change history. Each change is versioned for rollback.
          </p>
          {configHistory.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8 text-center">
              <History size={32} className="mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-sm text-[var(--color-text-secondary)]">No configuration changes recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {configHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-[var(--color-accent-muted)] px-2 py-1 font-mono text-[var(--color-accent)]">v{entry.version}</span>
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">{entry.changeNote}</div>
                      <div className="mt-0.5 text-[var(--color-text-muted)]">by {entry.updatedBy}</div>
                    </div>
                  </div>
                  <span className="text-[var(--color-text-muted)]">{timeAgo(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Export Tab */}
      {tab === 'export' && (
        <div>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            Export platform data as CSV files for analysis, compliance, or backup.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { entity: 'strategies' as const, label: 'Strategies', description: 'All strategy definitions, parameters, and risk limits' },
              { entity: 'backtests' as const, label: 'Backtests', description: 'Backtest runs with metrics and performance data' },
              { entity: 'ledger' as const, label: 'Ledger', description: 'Order, fill, deposit, and withdrawal records' },
              { entity: 'orders' as const, label: 'Orders', description: 'Complete order history with fill details' },
              { entity: 'portfolio' as const, label: 'Portfolio', description: 'Current positions and exposure breakdown' },
            ].map((item) => (
              <button key={item.entity} onClick={() => handleExport(item.entity)}
                className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 text-left transition-colors hover:border-[var(--color-accent)]">
                <div className="flex items-center gap-2">
                  <Download size={16} className="text-[var(--color-accent)]" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">{item.description}</p>
                <p className="mt-2 text-[10px] text-[var(--color-accent)]">Download CSV</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-text-tertiary)]">{label}</span>
      <span className={valueColor ?? 'text-[var(--color-text-secondary)]'}>{value}</span>
    </div>
  );
}
