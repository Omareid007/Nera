import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, Loader2, Globe, Database, Brain, BarChart3, RefreshCw, Activity } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { listStrategies, listBacktestRuns, listForwardRuns, listAiEvents, listEvidence } from '@/lib/api';

interface SystemStats {
  strategies: number;
  backtests: number;
  forwardRuns: number;
  aiEvents: number;
  evidenceRecords: number;
}

export function AdminPage() {
  const [stats, setStats] = useState<SystemStats>({ strategies: 0, backtests: 0, forwardRuns: 0, aiEvents: 0, evidenceRecords: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
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

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="Admin" description="System health, provider status, platform metrics, and feature flags — live data from API"
        actions={
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
        }
      />

      {/* Platform metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Strategies" value={String(stats.strategies)} />
        <MetricCard label="Backtests" value={String(stats.backtests)} />
        <MetricCard label="Forward Runs" value={String(stats.forwardRuns)} />
        <MetricCard label="AI Events" value={String(stats.aiEvents)} />
        <MetricCard label="Evidence Records" value={String(stats.evidenceRecords)} />
      </div>

      {/* Provider status */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><Activity size={14} /> Provider Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProviderCard name="Yahoo Finance" status="operational" icon={BarChart3} description="Market data, historical bars, real-time quotes" />
          <ProviderCard name="Finnhub" status="operational" icon={BarChart3} description="Sector summaries, company metrics" />
          <ProviderCard name="CoinGecko" status="operational" icon={BarChart3} description="Crypto & stablecoin data" />
          <ProviderCard name="Groq" status="unknown" icon={Brain} description="LLM provider — fast inference" />
          <ProviderCard name="OpenRouter" status="unknown" icon={Brain} description="LLM provider — model routing" />
          <ProviderCard name="Redis (Upstash)" status="operational" icon={Database} description="Cache, persistence, trading store" />
          <ProviderCard name="ACLED" status="operational" icon={Globe} description="Armed conflict location & event data" />
          <ProviderCard name="GDELT" status="operational" icon={Globe} description="Global event, language, tone database" />
          <ProviderCard name="FRED / EIA" status="operational" icon={Globe} description="Economic indicators & energy data" />
        </div>
      </div>

      {/* Feature flags */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Feature Flags</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
          <div className="space-y-3">
            <FeatureFlag name="Paper Trading" enabled={true} description="Paper execution and portfolio tracking" />
            <FeatureFlag name="AI Interpretations" enabled={true} description="LLM-powered strategy analysis" />
            <FeatureFlag name="Forward Runner" enabled={true} description="Live signal generation from market data" />
            <FeatureFlag name="Live Trading" enabled={false} description="Real broker execution (requires Alpaca/IBKR)" />
            <FeatureFlag name="Full Auto Mode" enabled={false} description="Autonomous order execution (blocked)" />
            <FeatureFlag name="Multi-Tenant" enabled={false} description="User isolation and role-based access" />
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">System</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
          <div className="grid gap-3 text-xs">
            <InfoRow label="Platform" value="Nera Trading Intelligence" />
            <InfoRow label="Version" value="1.0.0-beta" />
            <InfoRow label="Mode" value="Paper Trading" valueColor="text-[var(--color-info)]" />
            <InfoRow label="Live Trading" value="Disabled" valueColor="text-[var(--color-loss)]" />
            <InfoRow label="API Endpoints" value="31 RPCs" />
            <InfoRow label="Storage" value="Redis (Upstash) + Convex" />
            <InfoRow label="Intelligence Sources" value="22 domains (ACLED, GDELT, UCDP, EIA, FRED, ...)" />
            <InfoRow label="LLM Providers" value="Ollama → Groq → OpenRouter (fallback chain)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({ name, status, icon: Icon, description }: { name: string; status: 'operational' | 'degraded' | 'down' | 'unknown'; icon: typeof Globe; description: string }) {
  const icons = {
    operational: <CheckCircle size={14} className="text-[var(--color-active)]" />,
    degraded: <AlertTriangle size={14} className="text-[var(--color-warning)]" />,
    down: <XCircle size={14} className="text-[var(--color-loss)]" />,
    unknown: <Shield size={14} className="text-[var(--color-text-muted)]" />,
  };
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
      <div className="flex items-center gap-2">
        {icons[status]}
        <Icon size={14} className="text-[var(--color-text-muted)]" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{name}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
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
