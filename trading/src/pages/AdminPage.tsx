import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, Loader2, Globe, Database, Brain, BarChart3, RefreshCw, Activity, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { listStrategies, listBacktestRuns, listForwardRuns, listAiEvents, listEvidence, getProviderHealth, type ProviderStatus } from '@/lib/api';

interface SystemStats {
  strategies: number;
  backtests: number;
  forwardRuns: number;
  aiEvents: number;
  evidenceRecords: number;
}

export function AdminPage() {
  const [stats, setStats] = useState<SystemStats>({ strategies: 0, backtests: 0, forwardRuns: 0, aiEvents: 0, evidenceRecords: 0 });
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [healthSummary, setHealthSummary] = useState<{ operational: number; degraded: number; down: number; unknown: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadStats = async () => {
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
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const r = await getProviderHealth();
      setProviders(r.providers);
      setHealthSummary(r.summary);
    } catch {
      // Keep existing data
    } finally { setHealthLoading(false); }
  };

  useEffect(() => { loadStats(); loadHealth(); }, []);

  const categoryIcons: Record<string, typeof Globe> = {
    market_data: BarChart3,
    llm: Brain,
    infrastructure: Database,
    intelligence: Globe,
  };

  return (
    <div>
      <PageHeader title="Admin" description="System health, provider status, platform metrics, and feature flags — live data from API"
        actions={
          <button onClick={() => { loadStats(); loadHealth(); }}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Strategies" value={String(stats.strategies)} />
        <MetricCard label="Backtests" value={String(stats.backtests)} />
        <MetricCard label="Forward Runs" value={String(stats.forwardRuns)} />
        <MetricCard label="AI Events" value={String(stats.aiEvents)} />
        <MetricCard label="Evidence Records" value={String(stats.evidenceRecords)} />
      </div>

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
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Feature Flags</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
          <div className="space-y-3">
            <FeatureFlag name="Paper Trading" enabled={true} description="Paper execution and portfolio tracking" />
            <FeatureFlag name="AI Interpretations" enabled={true} description="LLM-powered strategy analysis" />
            <FeatureFlag name="Forward Runner" enabled={true} description="Live signal generation from market data" />
            <FeatureFlag name="Alert Engine" enabled={true} description="Price and portfolio threshold monitoring with auto-evaluation" />
            <FeatureFlag name="Settings Persistence" enabled={true} description="User settings saved to Redis store" />
            <FeatureFlag name="Watchlist CRUD" enabled={true} description="Custom watchlist creation, editing, and deletion" />
            <FeatureFlag name="Limit Orders" enabled={true} description="Limit order placement with pending fills" />
            <FeatureFlag name="Deposit / Withdraw" enabled={true} description="Paper account fund management" />
            <FeatureFlag name="Attribution Engine" enabled={true} description="Factor decomposition with real S&P 500 benchmark" />
            <FeatureFlag name="Portfolio Refresh" enabled={true} description="Live position price updates from Yahoo Finance" />
            <FeatureFlag name="Live Trading" enabled={false} description="Real broker execution (requires Alpaca/IBKR)" />
            <FeatureFlag name="Full Auto Mode" enabled={false} description="Autonomous order execution (blocked)" />
            <FeatureFlag name="Multi-Tenant" enabled={false} description="User isolation and role-based access" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">System</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
          <div className="grid gap-3 text-xs">
            <InfoRow label="Platform" value="Nera Trading Intelligence" />
            <InfoRow label="Version" value="1.1.0" />
            <InfoRow label="Mode" value="Paper Trading" valueColor="text-[var(--color-info)]" />
            <InfoRow label="API Endpoints" value="43 RPCs" />
            <InfoRow label="Storage" value="Redis (Upstash) + Convex" />
            <InfoRow label="Intelligence Sources" value="22 domains (ACLED, GDELT, UCDP, EIA, FRED, ...)" />
            <InfoRow label="LLM Providers" value="Ollama → Groq → OpenRouter (fallback chain)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureFlag({ name, enabled, description }: { name: string; enabled: boolean; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">{name}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">{description}</p>
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
        enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
      }`}>{enabled ? 'Enabled' : 'Disabled'}</span>
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
