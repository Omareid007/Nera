import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export function AdminPage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        description="System health, provider status, feature flags, and platform management"
      />

      {/* Provider status */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Provider Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProviderCard name="Yahoo Finance" status="operational" description="Market data & historical bars" />
          <ProviderCard name="Finnhub" status="operational" description="Sector summaries & quotes" />
          <ProviderCard name="CoinGecko" status="operational" description="Crypto & stablecoin data" />
          <ProviderCard name="Groq" status="unknown" description="LLM provider (fallback)" />
          <ProviderCard name="OpenRouter" status="unknown" description="LLM provider (fallback)" />
          <ProviderCard name="Redis (Upstash)" status="operational" description="Cache & persistence" />
        </div>
      </div>

      {/* Feature flags */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Feature Flags</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
          <p className="text-xs text-[var(--color-text-muted)]">
            Feature flags and system configuration will be managed here. Admin access required.
          </p>
        </div>
      </div>

      {/* System info */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">System</h2>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
          <div className="grid gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-tertiary)]">Version</span>
              <span className="text-[var(--color-text-secondary)]">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-tertiary)]">Mode</span>
              <span className="text-[var(--color-info)]">Paper Trading</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-tertiary)]">Live Trading</span>
              <span className="text-[var(--color-loss)]">Disabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({ name, status, description }: { name: string; status: 'operational' | 'degraded' | 'down' | 'unknown'; description: string }) {
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
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{name}</span>
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}
