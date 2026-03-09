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

// --- Forward Runner ---

export interface ForwardSignal {
  id: string;
  symbol: string;
  direction: 'long' | 'short' | 'flat';
  strength: number;
  reason: string;
  timestamp: number;
}

export interface ProposedAction {
  id: string;
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  reason: string;
  status: string;
  timestamp: number;
}

export interface ForwardRun {
  id: string;
  strategyId: string;
  strategyName: string;
  mode: string;
  status: string;
  signals: ForwardSignal[];
  proposedActions: ProposedAction[];
  startedAt: number;
  lastEvaluatedAt: number | null;
  paperPnl: number;
}

export interface ForwardRunIndexEntry {
  id: string;
  strategyId: string;
  strategyName: string;
  status: string;
  startedAt: number;
}

export function startForwardRun(strategyId: string, mode: string = 'insight_only') {
  return rpc<{ forwardRun: ForwardRun }>('POST', 'start-forward-run', { strategyId, mode });
}

export function stopForwardRun(id: string) {
  return rpc<{ forwardRun: ForwardRun }>('POST', 'stop-forward-run', { id });
}

export function evaluateForwardRun(id: string) {
  return rpc<{ forwardRun: ForwardRun; newSignals: ForwardSignal[]; newActions: ProposedAction[] }>(
    'POST', 'evaluate-forward-run', { id },
  );
}

export function listForwardRuns(strategyId?: string) {
  return rpc<{ forwardRuns: ForwardRunIndexEntry[] }>(
    'GET', 'list-forward-runs', strategyId ? { strategyId } : undefined,
  );
}

export function getForwardRun(id: string) {
  return rpc<{ forwardRun: ForwardRun }>('GET', 'get-forward-run', { id });
}

// --- Execution ---

export interface OrderEntry {
  id: string;
  type: string;
  strategyId: string | null;
  orderId: string | null;
  symbol: string | null;
  side: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  description: string;
  timestamp: number;
}

export function submitOrder(data: {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  strategyId?: string;
  forwardRunId?: string;
  source?: string;
}) {
  return rpc<{ order: unknown; portfolio: PortfolioSnapshot }>('POST', 'submit-order', data);
}

export function listOrders() {
  return rpc<{ orders: OrderEntry[] }>('GET', 'list-orders');
}

// --- Ledger ---

export interface LedgerEntry {
  id: string;
  type: string;
  strategyId: string | null;
  orderId: string | null;
  symbol: string | null;
  side: string | null;
  quantity: number | null;
  price: number | null;
  amount: number;
  description: string;
  timestamp: number;
}

export function listLedger(filters?: { type?: string; strategyId?: string }) {
  return rpc<{ ledgerEntries: LedgerEntry[] }>('GET', 'list-ledger', filters);
}

// --- Evidence ---

export interface EvidenceEntry {
  id: string;
  type: string;
  category: string;
  strategyId: string | null;
  summary: string;
  timestamp: number;
}

export function listEvidence(type?: string) {
  return rpc<{ evidence: EvidenceEntry[] }>('GET', 'list-evidence', type ? { type } : undefined);
}

// --- Market Data ---

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  marketCap: number | null;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  name: string;
  exchange: string;
  currency: string;
  timestamp: number;
}

export interface MarketDataResponse {
  quote: QuoteData;
  candles: Candle[];
  sma20: number[];
  sma50: number[];
  ema12: number[];
  ema26: number[];
  rsi14: number[];
  bollingerUpper: number[];
  bollingerLower: number[];
  bollingerMid: number[];
  macd: number[];
  macdSignal: number[];
  macdHistogram: number[];
  volumeSma20: number[];
}

export function getMarketData(symbol: string, interval = '1d', range = '6mo') {
  return rpc<MarketDataResponse>('GET', 'get-market-data', { symbol, interval, range });
}

export interface WatchlistQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  name: string;
  timestamp: number;
}

export function getWatchlistQuotes(symbols: string[]) {
  return rpc<{ quotes: WatchlistQuote[] }>('GET', 'get-watchlist-quotes', { symbols: symbols.join(',') });
}

// --- Risk Analytics ---

export interface PositionRisk {
  symbol: string;
  weight: number;
  beta: number;
  volatility: number;
  var95: number;
  maxDrawdown: number;
  correlationToPortfolio: number;
}

export interface StressScenario {
  name: string;
  description: string;
  portfolioImpactPct: number;
  positionImpacts: { symbol: string; impactPct: number }[];
}

export interface RiskAnalytics {
  parametricVaR95: number;
  parametricVaR99: number;
  historicalVaR95: number;
  expectedShortfall95: number;
  portfolioBeta: number;
  portfolioVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  informationRatio: number;
  trackingError: number;
  herfindahlIndex: number;
  topHolding: { symbol: string; weight: number } | null;
  sectorConcentration: Record<string, number>;
  longExposurePct: number;
  shortExposurePct: number;
  netExposurePct: number;
  grossExposurePct: number;
  leverageRatio: number;
  cashPct: number;
  correlationMatrix: { symbols: string[]; matrix: number[][] };
  stressTests: StressScenario[];
  positionRisks: PositionRisk[];
  timestamp: number;
}

export function getRiskAnalytics() {
  return rpc<{ analytics: RiskAnalytics }>('GET', 'get-risk-analytics');
}

// --- Alerts ---

export interface Alert {
  id: string;
  name: string;
  type: string;
  symbol: string | null;
  threshold: number;
  status: 'active' | 'triggered' | 'dismissed';
  triggeredAt: number | null;
  triggeredValue: number | null;
  createdAt: number;
}

export function createAlertApi(data: { name: string; type: string; symbol?: string; threshold: number }) {
  return rpc<{ alert: Alert }>('POST', 'create-alert', data);
}

export function listAlerts() {
  return rpc<{ alerts: Alert[] }>('GET', 'list-alerts');
}

export function dismissAlert(id: string) {
  return rpc<{ alert: Alert }>('POST', 'dismiss-alert', { id });
}

export function deleteAlertApi(id: string) {
  return rpc<{ deleted: boolean }>('POST', 'delete-alert', { id });
}
