import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle, Send, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  getSettings, updateSettings, type UserSettings,
  getNotificationConfig, updateNotificationConfig, testWebhook,
} from '@/lib/api';

export function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getSettings().then((r) => {
        setSettings(r.settings);
      }),
      getNotificationConfig().then((r) => {
        setWebhookUrl(r.config.webhookUrl ?? '');
      }).catch(() => {}),
    ]).catch(() => setError('Failed to load settings')).finally(() => setLoading(false));
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

        <SettingsSection title="Webhook Notifications">
          <div>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">Receive notifications when alerts trigger, orders fill, or drawdowns occur.</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-tertiary)]">Webhook URL</label>
                <input type="url" value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.example.com/nera"
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]" />
              </div>
              <div className="flex gap-2">
                <button onClick={async () => {
                  try {
                    await updateNotificationConfig({ webhookUrl: webhookUrl || null });
                    setSaved(true);
                    setTimeout(() => setSaved(false), 3000);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to save webhook');
                  }
                }}
                  className="rounded-lg bg-[var(--color-surface-3)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                  Save Webhook
                </button>
                <button onClick={async () => {
                  setWebhookTesting(true);
                  setWebhookTestResult(null);
                  try {
                    const r = await testWebhook();
                    setWebhookTestResult(r.success ? 'Test sent successfully' : 'Test failed — check URL');
                  } catch { setWebhookTestResult('Test failed'); }
                  setWebhookTesting(false);
                  setTimeout(() => setWebhookTestResult(null), 5000);
                }}
                  disabled={webhookTesting || !webhookUrl}
                  className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-3)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50">
                  {webhookTesting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Test
                </button>
              </div>
              {webhookTestResult && (
                <p className={`text-xs ${webhookTestResult.includes('success') ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                  {webhookTestResult}
                </p>
              )}
            </div>
          </div>
        </SettingsSection>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="text-xs text-amber-300/80">
            <p className="font-medium">Risk Disclaimer</p>
            <p className="mt-1">Nera is a research and paper trading platform. AI outputs are advisory only and do not constitute financial advice. All backtest results are based on historical data and do not guarantee future performance. Paper trading simulations may not reflect actual market conditions.</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-[var(--color-text-muted)]">
        Last updated: {new Date(settings.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
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
