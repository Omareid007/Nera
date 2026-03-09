import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { getSettings, updateSettings, type UserSettings } from '@/lib/api';

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((r) => setSettings(r.settings))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await updateSettings(settings);
      setSettings(r.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setSaved(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  if (!settings) return <div className="text-sm text-[var(--color-loss)]">{error || 'Failed to load settings'}</div>;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Preferences, risk guardrails, provider configuration, and account settings"
        actions={
          <div className="flex items-center gap-2">
            {saved && <span className="flex items-center gap-1 text-xs text-[var(--color-profit)]"><CheckCircle size={14} /> Saved</span>}
            {error && <span className="text-xs text-[var(--color-loss)]">{error}</span>}
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-[var(--color-surface-0)] hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
            </button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsSection title="Appearance">
          <SettingRow label="Theme" description="Visual theme for the trading interface">
            <select value={settings.theme} onChange={(e) => update('theme', e.target.value as 'dark' | 'light')}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Trading">
          <SettingRow label="Default Mode" description="Default execution mode for new strategies">
            <select value={settings.defaultMode} onChange={(e) => update('defaultMode', e.target.value as 'paper' | 'live')}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
              <option value="paper">Paper</option>
              <option value="live">Live</option>
            </select>
          </SettingRow>
          <SettingRow label="Default Capital" description="Starting capital for paper accounts">
            <input type="number" value={settings.defaultCapital}
              onChange={(e) => update('defaultCapital', Number(e.target.value) || 100000)}
              min={1000} max={100000000} step={1000}
              className="w-32 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-right text-xs text-[var(--color-text-secondary)]" />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Risk Guardrails">
          <SettingRow label="Max Position Size" description="Maximum single position as % of portfolio">
            <div className="flex items-center gap-1">
              <input type="number" value={settings.globalMaxPositionPct}
                onChange={(e) => update('globalMaxPositionPct', Math.min(100, Math.max(1, Number(e.target.value) || 20)))}
                min={1} max={100} step={1}
                className="w-20 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-right text-xs text-[var(--color-text-secondary)]" />
              <span className="text-xs text-[var(--color-text-muted)]">%</span>
            </div>
          </SettingRow>
          <SettingRow label="Max Drawdown Alert" description="Alert when portfolio drawdown exceeds threshold">
            <div className="flex items-center gap-1">
              <input type="number" value={settings.globalMaxDrawdownPct}
                onChange={(e) => update('globalMaxDrawdownPct', Math.min(100, Math.max(1, Number(e.target.value) || 15)))}
                min={1} max={100} step={1}
                className="w-20 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-right text-xs text-[var(--color-text-secondary)]" />
              <span className="text-xs text-[var(--color-text-muted)]">%</span>
            </div>
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="AI Preferences">
          <SettingRow label="AI Interpretations" description="Automatically generate AI analysis after backtests">
            <input type="checkbox" checked={settings.aiInterpretationsEnabled}
              onChange={(e) => update('aiInterpretationsEnabled', e.target.checked)}
              className="rounded accent-[var(--color-accent)]" />
          </SettingRow>
          <SettingRow label="Review Checklists" description="Generate pre-trade review checklists">
            <input type="checkbox" checked={settings.reviewChecklistsEnabled}
              onChange={(e) => update('reviewChecklistsEnabled', e.target.checked)}
              className="rounded accent-[var(--color-accent)]" />
          </SettingRow>
          <SettingRow label="Alert Notifications" description="Enable notifications when alerts trigger">
            <input type="checkbox" checked={settings.alertNotificationsEnabled}
              onChange={(e) => update('alertNotificationsEnabled', e.target.checked)}
              className="rounded accent-[var(--color-accent)]" />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title="Default Watchlist">
          <div>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">Symbols shown on the dashboard ticker. Comma-separated.</p>
            <input type="text" value={settings.defaultWatchlistSymbols.join(', ')}
              onChange={(e) => update('defaultWatchlistSymbols', e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]"
              placeholder="SPY, QQQ, AAPL, MSFT..." />
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{settings.defaultWatchlistSymbols.length} symbols</p>
          </div>
        </SettingsSection>
      </div>

      <p className="mt-4 text-[10px] text-[var(--color-text-muted)]">
        Last updated: {new Date(settings.updatedAt).toLocaleString()}
      </p>
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
