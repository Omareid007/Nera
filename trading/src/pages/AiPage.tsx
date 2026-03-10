import { useState, useEffect, useCallback } from 'react';
import { Brain, ChevronDown, ChevronUp, AlertTriangle, Sparkles, ShieldCheck, Clock, Loader2, RefreshCw, ArrowUpDown } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import {
  listAiEvents,
  getAiEvent,
  interpretStrategy,
  listStrategies,
  type AiEventIndexEntry,
  type AiEventDetail,
  type AiInterpretation,
  type StrategyIndexEntry,
} from '@/lib/api';
import { timeAgo } from '@/lib/utils';

function typeBadge(type: string) {
  const map: Record<string, { label: string; color: string }> = {
    strategy_interpretation: { label: 'Interpretation', color: 'bg-blue-500/20 text-blue-400' },
    review_checklist: { label: 'Review', color: 'bg-amber-500/20 text-amber-400' },
    risk_summary: { label: 'Risk', color: 'bg-red-500/20 text-red-400' },
    sentiment_shift: { label: 'Sentiment', color: 'bg-purple-500/20 text-purple-400' },
    news_impact: { label: 'News', color: 'bg-teal-500/20 text-teal-400' },
    draft_assist: { label: 'Draft', color: 'bg-gray-500/20 text-gray-400' },
  };
  const info = map[type] ?? { label: type, color: 'bg-gray-500/20 text-gray-400' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${info.color}`}>
      {info.label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-teal-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-2)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-[var(--color-text-secondary)]">{value}%</span>
    </div>
  );
}

function AiEventCard({ entry, onExpand }: { entry: AiEventIndexEntry; onExpand: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<AiEventDetail | null>(null);
  const [interpretation, setInterpretation] = useState<AiInterpretation | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!detail) {
      setLoading(true);
      try {
        const res = await getAiEvent(entry.id);
        setDetail(res.aiEvent);
        try {
          setInterpretation(JSON.parse(res.aiEvent.output) as AiInterpretation);
        } catch {
          setInterpretation(null);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    onExpand();
  };

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
      <button onClick={toggle} className="flex w-full items-start justify-between text-left">
        <div className="flex items-center gap-2">
          {typeBadge(entry.type)}
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {entry.strategyId ? `Strategy Analysis` : 'General AI Event'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">{timeAgo(entry.timestamp)}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Loader2 size={14} className="animate-spin" /> Loading details...
            </div>
          )}

          {interpretation && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">{interpretation.summary}</p>

              <div>
                <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-teal-400">
                  <Sparkles size={12} /> Strengths
                </h4>
                <ul className="space-y-0.5">
                  {interpretation.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-[var(--color-text-secondary)] pl-4">• {s}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-400">
                  <AlertTriangle size={12} /> Risks
                </h4>
                <ul className="space-y-0.5">
                  {interpretation.risks.map((r, i) => (
                    <li key={i} className="text-xs text-[var(--color-text-secondary)] pl-4">• {r}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-1 flex items-center gap-1 text-xs font-semibold text-blue-400">
                  <ShieldCheck size={12} /> Best Market Conditions
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] pl-4">{interpretation.market_conditions}</p>
              </div>

              <div>
                <h4 className="mb-1 text-xs font-semibold text-[var(--color-text-tertiary)]">Confidence</h4>
                <ConfidenceBar value={interpretation.confidence} />
              </div>
            </div>
          )}

          {detail && !interpretation && (
            <p className="text-xs text-[var(--color-text-muted)]">{detail.output}</p>
          )}

          {detail && (
            <div className="mt-3 flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
              <span>Provider: {detail.provider}</span>
              <span>Model: {detail.model}</span>
              <span>Tokens: {detail.tokenUsage.total}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AiPage() {
  const [events, setEvents] = useState<AiEventIndexEntry[]>([]);
  const [strategies, setStrategies] = useState<StrategyIndexEntry[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [interpreting, setInterpreting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [sortOrder, setSortOrder] = useState<'newest' | 'relevance'>('newest');
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      const res = await listAiEvents();
      setEvents(res.aiEvents);
    } catch {
      // Ignore
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    listStrategies()
      .then((res) => {
        setStrategies(res.strategies);
        if (res.strategies.length > 0) setSelectedStrategyId(res.strategies[0].id);
      })
      .catch(() => {});
  }, [loadEvents]);

  const handleInterpret = async () => {
    if (!selectedStrategyId || interpreting) return;
    setInterpreting(true);
    setError('');
    try {
      await interpretStrategy(selectedStrategyId);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to interpret strategy');
    } finally {
      setInterpreting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Pulse"
        description="AI activity timeline — strategy interpretations, reviews, and audit trail"
      />

      {/* Advisory banner */}
      <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-medium text-amber-400">
          <AlertTriangle size={14} />
          AI ADVISORY — Outputs are informational only. All trading signals are generated by deterministic logic, not AI.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity timeline */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--color-text-tertiary)]">Activity Timeline</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'relevance' : 'newest')}
                className="flex items-center gap-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <ArrowUpDown size={10} />
                {sortOrder === 'newest' ? 'Newest' : 'Relevance'}
              </button>
              <button
                onClick={loadEvents}
                className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {loadingEvents && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--color-text-muted)]">
              <Loader2 size={16} className="animate-spin" /> Loading AI events...
            </div>
          )}

          {!loadingEvents && events.length === 0 && (
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <Brain size={28} className="mb-3 text-[var(--color-text-muted)]" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  No AI activity yet. Select a strategy and request an AI interpretation to get started.
                </p>
              </div>
            </div>
          )}

          {!loadingEvents && events.length > 0 && (
            <div className="space-y-2">
              {[...events]
                .sort((a, b) => {
                  if (sortOrder === 'newest') return b.timestamp - a.timestamp;
                  // Relevance: strategy_interpretation > risk_summary > sentiment_shift > others, then by time
                  const relevanceMap: Record<string, number> = { strategy_interpretation: 4, risk_summary: 3, sentiment_shift: 2, news_impact: 1 };
                  const ra = relevanceMap[a.type] ?? 0;
                  const rb = relevanceMap[b.type] ?? 0;
                  return rb !== ra ? rb - ra : b.timestamp - a.timestamp;
                })
                .map((ev) => (
                  <AiEventCard key={ev.id} entry={ev} onExpand={() => {}} />
                ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Request AI Interpretation</h2>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
            {strategies.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                No strategies found. Create a strategy first.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                    Strategy
                  </label>
                  <select
                    value={selectedStrategyId}
                    onChange={(e) => setSelectedStrategyId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  >
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleInterpret}
                  disabled={interpreting || !selectedStrategyId}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[#0c0e12] hover:brightness-110 disabled:opacity-50 transition-all duration-200"
                >
                  {interpreting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain size={14} /> Interpret Strategy
                    </>
                  )}
                </button>

                {error && (
                  <p className="text-xs text-red-400">{error}</p>
                )}
              </div>
            )}
          </div>

          <h2 className="mb-3 mt-6 text-sm font-semibold text-[var(--color-text-tertiary)]">Source Freshness</h2>
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
            {events.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                No AI analyses yet.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Show most recent event per strategy */}
                {(() => {
                  const byStrategy = new Map<string, AiEventIndexEntry>();
                  for (const ev of events) {
                    if (ev.strategyId && !byStrategy.has(ev.strategyId)) {
                      byStrategy.set(ev.strategyId, ev);
                    }
                  }
                  return Array.from(byStrategy.entries()).map(([stratId, ev]) => {
                    const strat = strategies.find((s) => s.id === stratId);
                    return (
                      <div key={stratId} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-secondary)]">{strat?.name ?? stratId.slice(0, 8)}</span>
                        <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                          <Clock size={10} /> {timeAgo(ev.timestamp)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
