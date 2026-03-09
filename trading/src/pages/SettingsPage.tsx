import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Preferences, risk guardrails, provider configuration, and account settings"
        actions={<StatusBadge status="paper" label="PREVIEW" />}
      />

      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-medium text-amber-400">
          <AlertTriangle size={14} />
          Settings are not persisted yet. Changes here are for preview only and will reset on reload.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <SettingsSection title="Appearance">
          <SettingRow label="Theme" description="Visual theme for the trading interface">
            <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <option>Dark</option>
              <option>Light</option>
            </select>
          </SettingRow>
        </SettingsSection>

        {/* Trading */}
        <SettingsSection title="Trading">
          <SettingRow label="Default Mode" description="Default execution mode for new strategies">
            <select className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <option>Paper</option>
              <option disabled>Live (disabled)</option>
            </select>
          </SettingRow>
          <SettingRow label="Default Capital" description="Starting capital for paper accounts">
            <input
              type="text"
              defaultValue="$100,000"
              className="w-32 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-right text-xs text-[var(--color-text-secondary)]"
            />
          </SettingRow>
        </SettingsSection>

        {/* Risk */}
        <SettingsSection title="Risk Guardrails">
          <SettingRow label="Max Position Size" description="Maximum single position as % of portfolio">
            <input
              type="text"
              defaultValue="20%"
              className="w-20 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-right text-xs text-[var(--color-text-secondary)]"
            />
          </SettingRow>
          <SettingRow label="Max Drawdown Alert" description="Alert when portfolio drawdown exceeds threshold">
            <input
              type="text"
              defaultValue="15%"
              className="w-20 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-right text-xs text-[var(--color-text-secondary)]"
            />
          </SettingRow>
        </SettingsSection>

        {/* AI */}
        <SettingsSection title="AI Preferences">
          <SettingRow label="AI Interpretations" description="Automatically generate AI analysis after backtests">
            <input type="checkbox" defaultChecked className="rounded accent-[var(--color-accent)]" />
          </SettingRow>
          <SettingRow label="Review Checklists" description="Generate pre-trade review checklists">
            <input type="checkbox" defaultChecked className="rounded accent-[var(--color-accent)]" />
          </SettingRow>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">{description}</p>
      </div>
      {children}
    </div>
  );
}
