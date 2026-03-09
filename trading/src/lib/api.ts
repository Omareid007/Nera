/**
 * Trading API client — communicates with /api/trading/v1/ endpoints.
 */

const BASE = '/api/trading/v1';

async function rpc<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
  const url = method === 'GET' && body
    ? `${BASE}/${path}?${new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]))}`
    : `${BASE}/${path}`;

  const res = await fetch(url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// --- Templates ---

export interface AlgorithmTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  useCase: string;
  fields: TemplateField[];
  presets: Preset[];
  defaultRiskLimits: RiskLimits;
}

export interface TemplateField {
  key: string;
  label: string;
  type: 'number' | 'select' | 'boolean' | 'symbol_list' | 'string';
  description: string;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  advanced?: boolean;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  values: Record<string, unknown>;
}

export interface RiskLimits {
  maxPositionPct: number;
  maxDrawdownPct: number;
  stopLossPct: number;
  takeProfitPct: number;
  maxExposurePct: number;
  maxPositions: number;
}

export function listTemplates() {
  return rpc<{ templates: AlgorithmTemplate[] }>('GET', 'list-templates');
}

// --- Strategies ---

export interface Strategy {
  id: string;
  name: string;
  description: string;
  templateId: string;
  parameters: Record<string, unknown>;
  universe: string[];
  riskLimits: RiskLimits;
  frequency: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export function createStrategy(data: {
  name: string;
  templateId: string;
  universe: string[];
  parameters?: Record<string, unknown>;
  riskLimits?: RiskLimits;
  description?: string;
  frequency?: string;
}) {
  return rpc<{ strategy: Strategy }>('POST', 'create-strategy', data);
}

export function getStrategy(id: string) {
  return rpc<{ strategy: Strategy }>('GET', 'get-strategy', { id });
}

export function listStrategies() {
  return rpc<{ strategies: StrategyIndexEntry[] }>('GET', 'list-strategies');
}

export interface StrategyIndexEntry {
  id: string;
  name: string;
  templateId: string;
  status: string;
  updatedAt: number;
}

export function updateStrategy(data: { id: string } & Partial<Strategy>) {
  return rpc<{ strategy: Strategy }>('POST', 'update-strategy', data);
}

export function deleteStrategy(id: string) {
  return rpc<{ deleted: boolean }>('POST', 'delete-strategy', { id });
}

// --- Backtests ---

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeDuration: number;
  avgWin: number;
  avgLoss: number;
  calmarRatio: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPct: number;
  exitReason: string;
}

export interface EquityCurvePoint {
  date: string;
  equity: number;
  drawdown: number;
  cash: number;
}

export interface BacktestRun {
  id: string;
  strategyId: string;
  strategyName: string;
  templateId: string;
  parameters: Record<string, unknown>;
  universe: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  status: string;
  metrics: BacktestMetrics | null;
  trades: BacktestTrade[];
  equityCurve: EquityCurvePoint[];
  provider: string;
  barsAvailable: number;
  barsMissing: number;
  createdAt: number;
  completedAt: number | null;
  error: string | null;
}

export function runBacktest(data: {
  strategyId: string;
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
}) {
  return rpc<{ backtestRun: BacktestRun }>('POST', 'run-backtest', data);
}

export function getBacktestRun(id: string) {
  return rpc<{ backtestRun: BacktestRun }>('GET', 'get-backtest-run', { id });
}

export function listBacktestRuns(strategyId?: string) {
  return rpc<{ backtestRuns: BacktestIndexEntry[] }>('GET', 'list-backtest-runs', strategyId ? { strategyId } : undefined);
}

export interface BacktestIndexEntry {
  id: string;
  strategyId: string;
  strategyName: string;
  status: string;
  createdAt: number;
  totalReturn: number | null;
}

// --- Portfolio ---

export interface PortfolioSnapshot {
  totalEquity: number;
  cash: number;
  positionsValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  totalPnlPct: number;
  positions: Position[];
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  positionCount: number;
  timestamp: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  side: string;
  strategyId: string;
  openedAt: number;
}

export function getPortfolio() {
  return rpc<{ portfolio: PortfolioSnapshot }>('GET', 'get-portfolio');
}

// --- AI Events ---

export interface AiEventIndexEntry {
  id: string;
  type: string;
  strategyId: string | null;
  timestamp: number;
}

export interface AiInterpretation {
  summary: string;
  strengths: string[];
  risks: string[];
  market_conditions: string;
  confidence: number;
}

export interface AiEventDetail {
  id: string;
  type: string;
  strategyId: string | null;
  provider: string;
  model: string;
  promptTemplate: string;
  tokenUsage: { prompt: number; completion: number; total: number };
  costEstimate: number | null;
  input: string;
  output: string;
  timestamp: number;
}

export function interpretStrategy(strategyId: string) {
  return rpc<{ aiEvent: AiEventDetail; interpretation: AiInterpretation; llmAvailable: boolean }>(
    'POST',
    'interpret-strategy',
    { strategyId },
  );
}

export function listAiEvents(strategyId?: string) {
  return rpc<{ aiEvents: AiEventIndexEntry[] }>(
    'GET',
    'list-ai-events',
    strategyId ? { strategyId } : undefined,
  );
}

export function getAiEvent(id: string) {
  return rpc<{ aiEvent: AiEventDetail }>('GET', 'get-ai-event', { id });
}
