import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import {
  TrendingUp, ArrowDownUp, Zap, Activity, BarChart3,
  Shuffle, Newspaper, Wrench, X, Plus, AlertTriangle, Loader2,
} from 'lucide-react';
import { listTemplates, createStrategy, type AlgorithmTemplate, type TemplateField, type RiskLimits } from '@/lib/api';

const ICONS: Record<string, typeof TrendingUp> = {
  momentum: TrendingUp, mean_reversion: ArrowDownUp, breakout: Zap,
  trend_following: Activity, etf_rotation: BarChart3, sector_rotation: Shuffle,
  event_driven: Newspaper, custom: Wrench,
};

const DIFFICULTY_COLORS = {
  Beginner: 'text-[var(--color-active)] bg-[var(--color-active)]/10',
  Intermediate: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10',
  Advanced: 'text-[var(--color-loss)] bg-[var(--color-loss)]/10',
};

type WizardStep = 'template' | 'configure' | 'universe' | 'risk' | 'review';
const STEPS: WizardStep[] = ['template', 'configure', 'universe', 'risk', 'review'];

export function CreateStrategyPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<AlgorithmTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AlgorithmTemplate | null>(null);
  const [strategyName, setStrategyName] = useState('');
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [preset, setPreset] = useState('balanced');
  const [universe, setUniverse] = useState<string[]>([]);
  const [symbolInput, setSymbolInput] = useState('');
  const [riskLimits, setRiskLimits] = useState<RiskLimits>({ maxPositionPct: 20, maxDrawdownPct: 15, stopLossPct: 5, takeProfitPct: 10, maxExposurePct: 100, maxPositions: 10 });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates().then((r) => { setTemplates(r.templates); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    if (!selectedTemplate) return;
    setPreset(presetId);
    if (presetId === 'custom') return;
    const p = selectedTemplate.presets.find((pr) => pr.id === presetId);
    if (p) setParams({ ...params, ...p.values });
  }, [selectedTemplate, params]);

  const selectTemplate = useCallback((t: AlgorithmTemplate) => {
    setSelectedTemplate(t);
    setStrategyName(`My ${t.name} Strategy`);
    setRiskLimits(t.defaultRiskLimits);
    // Apply balanced preset defaults
    const defaults: Record<string, unknown> = {};
    for (const f of t.fields) defaults[f.key] = f.default;
    const balanced = t.presets.find((p) => p.id === 'balanced');
    setParams(balanced ? { ...defaults, ...balanced.values } : defaults);
    setPreset('balanced');
    setStep('configure');
  }, []);

  const addSymbol = useCallback(() => {
    const sym = symbolInput.trim().toUpperCase();
    if (sym && !universe.includes(sym)) {
      setUniverse([...universe, sym]);
    }
    setSymbolInput('');
  }, [symbolInput, universe]);

  const removeSymbol = useCallback((sym: string) => {
    setUniverse(universe.filter((s) => s !== sym));
  }, [universe]);

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate || universe.length === 0) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createStrategy({
        name: strategyName,
        templateId: selectedTemplate.id,
        universe,
        parameters: params,
        riskLimits,
      });
      navigate(`/strategy/${result.strategy.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create strategy');
    } finally {
      setCreating(false);
    }
  }, [selectedTemplate, strategyName, universe, params, riskLimits, navigate]);

  const stepIdx = STEPS.indexOf(step);

  return (
    <div>
      <PageHeader title="Create Strategy" description="Build a trading strategy using our guided wizard" />

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => { if (i <= stepIdx) setStep(s); }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                s === step ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]'
                : i < stepIdx ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
              }`}
            >
              <span>{i + 1}</span>
              <span className="hidden sm:inline capitalize">{s}</span>
            </button>
            {i < 4 && <div className="h-px w-6 bg-[var(--color-border-subtle)]" />}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>
      ) : (
        <>
          {/* Step 1: Template */}
          {step === 'template' && (
            <div>
              <h2 className="mb-1 text-lg font-medium text-[var(--color-text-primary)]">Choose Algorithm Template</h2>
              <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Select the trading approach that matches your goals.</p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((t) => {
                  const Icon = ICONS[t.id] ?? Wrench;
                  return (
                    <button key={t.id} onClick={() => selectTemplate(t)}
                      className="group rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 text-left transition-all hover:border-[var(--color-border-default)]">
                      <div className="flex items-start justify-between">
                        <div className="rounded-xl bg-[var(--color-surface-2)] p-2.5 group-hover:bg-[var(--color-surface-3)]">
                          <Icon size={20} className="text-[var(--color-accent)]" />
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_COLORS[t.difficulty]}`}>{t.difficulty}</span>
                      </div>
                      <h3 className="mt-3 font-semibold text-[var(--color-text-primary)]">{t.name}</h3>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)] leading-relaxed">{t.description}</p>
                      <p className="mt-3 text-[10px] text-[var(--color-text-tertiary)]">{t.useCase}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedTemplate && (
            <div>
              <h2 className="mb-1 text-lg font-medium text-[var(--color-text-primary)]">Configure {selectedTemplate.name}</h2>
              <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Adjust parameters or start with a preset.</p>

              {/* Strategy name */}
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-tertiary)]">Strategy Name</label>
                <input value={strategyName} onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
              </div>

              {/* Presets */}
              <div className="mb-6">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--color-text-tertiary)]">Preset</label>
                <div className="flex gap-2">
                  {selectedTemplate.presets.map((p) => (
                    <button key={p.id} onClick={() => applyPreset(p.id)}
                      className={`rounded-lg px-4 py-2 text-xs font-medium capitalize transition-colors ${
                        preset === p.id ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`} title={p.description}>
                      {p.label}
                    </button>
                  ))}
                  <button onClick={() => setPreset('custom')}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                      preset === 'custom' ? 'bg-[var(--color-accent)] text-[var(--color-surface-0)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}>Custom</button>
                </div>
              </div>

              {/* Dynamic fields */}
              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  {selectedTemplate.fields.filter((f) => !f.advanced).map((f) => <FieldInput key={f.key} field={f} value={params[f.key]} onChange={(v) => { setParams({ ...params, [f.key]: v }); setPreset('custom'); }} />)}
                </div>
                {selectedTemplate.fields.some((f) => f.advanced) && (
                  <details className="mt-5">
                    <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">Advanced Parameters</summary>
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      {selectedTemplate.fields.filter((f) => f.advanced).map((f) => <FieldInput key={f.key} field={f} value={params[f.key]} onChange={(v) => { setParams({ ...params, [f.key]: v }); setPreset('custom'); }} />)}
                    </div>
                  </details>
                )}
              </div>

              <NavButtons onBack={() => setStep('template')} onNext={() => setStep('universe')} nextLabel="Next: Universe" />
            </div>
          )}

          {/* Step 3: Universe */}
          {step === 'universe' && (
            <div>
              <h2 className="mb-1 text-lg font-medium text-[var(--color-text-primary)]">Select Universe</h2>
              <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Choose the symbols this strategy will trade. Type a ticker and press Enter or click Add.</p>

              <div className="mb-4 flex gap-2">
                <input value={symbolInput} onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSymbol(); } }}
                  placeholder="e.g. AAPL, MSFT, GOOGL"
                  className="w-full max-w-xs rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none" />
                <button onClick={addSymbol} className="flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-surface-0)]"><Plus size={14} /> Add</button>
              </div>

              {/* Quick add presets */}
              <div className="mb-4 flex flex-wrap gap-2">
                {[['Tech Giants', ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA']],
                  ['S&P ETFs', ['SPY', 'QQQ', 'IWM', 'DIA']],
                  ['Sector ETFs', ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLC', 'XLY', 'XLP', 'XLB', 'XLU', 'XLRE']],
                ].map(([label, syms]) => (
                  <button key={label as string} onClick={() => setUniverse([...new Set([...universe, ...(syms as string[])])])}
                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                    + {label as string}
                  </button>
                ))}
              </div>

              {universe.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
                  {universe.map((sym) => (
                    <span key={sym} className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-3)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)]">
                      {sym}
                      <button onClick={() => removeSymbol(sym)} className="text-[var(--color-text-muted)] hover:text-[var(--color-loss)]"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
                  <p className="text-center text-sm text-[var(--color-text-muted)]">Add at least one symbol to continue.</p>
                </div>
              )}

              {universe.length === 0 && <p className="mt-2 flex items-center gap-1 text-xs text-[var(--color-warning)]"><AlertTriangle size={12} /> At least one symbol is required</p>}

              <NavButtons onBack={() => setStep('configure')} onNext={() => setStep('risk')} nextLabel="Next: Risk" disabled={universe.length === 0} />
            </div>
          )}

          {/* Step 4: Risk */}
          {step === 'risk' && (
            <div>
              <h2 className="mb-1 text-lg font-medium text-[var(--color-text-primary)]">Risk Controls</h2>
              <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Set guardrails to manage downside risk and position sizing.</p>

              <div className="grid gap-5 sm:grid-cols-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6">
                <RiskField label="Max Position Size (%)" value={riskLimits.maxPositionPct} onChange={(v) => setRiskLimits({ ...riskLimits, maxPositionPct: v })} min={1} max={100} description="Maximum allocation per position as % of portfolio" />
                <RiskField label="Max Drawdown (%)" value={riskLimits.maxDrawdownPct} onChange={(v) => setRiskLimits({ ...riskLimits, maxDrawdownPct: v })} min={1} max={50} description="Halt strategy if drawdown exceeds this %" />
                <RiskField label="Stop Loss (%)" value={riskLimits.stopLossPct} onChange={(v) => setRiskLimits({ ...riskLimits, stopLossPct: v })} min={0.5} max={30} description="Per-trade stop loss as % from entry" />
                <RiskField label="Take Profit (%)" value={riskLimits.takeProfitPct} onChange={(v) => setRiskLimits({ ...riskLimits, takeProfitPct: v })} min={1} max={100} description="Per-trade take profit as % from entry" />
                <RiskField label="Max Exposure (%)" value={riskLimits.maxExposurePct} onChange={(v) => setRiskLimits({ ...riskLimits, maxExposurePct: v })} min={10} max={200} description="Maximum total portfolio exposure" />
                <RiskField label="Max Positions" value={riskLimits.maxPositions} onChange={(v) => setRiskLimits({ ...riskLimits, maxPositions: v })} min={1} max={50} description="Maximum concurrent positions" />
              </div>

              <NavButtons onBack={() => setStep('universe')} onNext={() => setStep('review')} nextLabel="Next: Review" />
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && selectedTemplate && (
            <div>
              <h2 className="mb-1 text-lg font-medium text-[var(--color-text-primary)]">Review & Create</h2>
              <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Confirm your strategy configuration.</p>

              <div className="space-y-4">
                <ReviewSection title="Strategy">
                  <ReviewRow label="Name" value={strategyName} />
                  <ReviewRow label="Template" value={selectedTemplate.name} />
                  <ReviewRow label="Preset" value={preset} />
                </ReviewSection>

                <ReviewSection title="Parameters">
                  {selectedTemplate.fields.map((f) => (
                    <ReviewRow key={f.key} label={f.label} value={String(params[f.key] ?? f.default)} />
                  ))}
                </ReviewSection>

                <ReviewSection title="Universe">
                  <ReviewRow label="Symbols" value={universe.join(', ')} />
                  <ReviewRow label="Count" value={String(universe.length)} />
                </ReviewSection>

                <ReviewSection title="Risk Controls">
                  <ReviewRow label="Max Position" value={`${riskLimits.maxPositionPct}%`} />
                  <ReviewRow label="Max Drawdown" value={`${riskLimits.maxDrawdownPct}%`} />
                  <ReviewRow label="Stop Loss" value={`${riskLimits.stopLossPct}%`} />
                  <ReviewRow label="Take Profit" value={`${riskLimits.takeProfitPct}%`} />
                  <ReviewRow label="Max Positions" value={String(riskLimits.maxPositions)} />
                </ReviewSection>
              </div>

              {error && <p className="mt-4 text-xs text-[var(--color-loss)]">{error}</p>}

              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep('risk')} className="rounded-lg bg-[var(--color-surface-2)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">Back</button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-[var(--color-surface-0)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50">
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? 'Creating...' : 'Create Strategy'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: TemplateField; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === 'boolean') {
    return (
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="rounded accent-[var(--color-accent)]" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">{field.label}</span>
        </label>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{field.description}</p>
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{field.label}</label>
        <select value={String(value ?? field.default)} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none">
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{field.description}</p>
      </div>
    );
  }
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{field.label}</label>
      <input type="number" value={Number(value ?? field.default)} onChange={(e) => onChange(Number(e.target.value))}
        min={field.min} max={field.max} step={field.step}
        className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{field.description}{field.min !== undefined ? ` (${field.min}–${field.max})` : ''}</p>
    </div>
  );
}

function RiskField({ label, value, onChange, min, max, description }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; description: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} min={min} max={max}
        className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none" />
      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--color-text-tertiary)]">{label}</span>
      <span className="font-medium text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel, disabled }: { onBack: () => void; onNext: () => void; nextLabel: string; disabled?: boolean }) {
  return (
    <div className="mt-6 flex justify-between">
      <button onClick={onBack} className="rounded-lg bg-[var(--color-surface-2)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">Back</button>
      <button onClick={onNext} disabled={disabled}
        className="rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-[var(--color-surface-0)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed">{nextLabel}</button>
    </div>
  );
}
