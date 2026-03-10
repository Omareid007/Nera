/**
 * Trading API client — communicates with /api/trading/v1/ endpoints.
 */

// ── Shared type aliases (mirrored from server/worldmonitor/trading/v1/types.ts) ──

export type TemplateId = 'momentum' | 'mean_reversion' | 'breakout' | 'trend_following' | 'etf_rotation' | 'sector_rotation' | 'event_driven' | 'custom';
export type StrategyStatus = 'draft' | 'backtesting' | 'validated' | 'paper' | 'active' | 'paused' | 'archived';
export type BacktestStatus = 'pending' | 'running' | 'complete' | 'failed';
export type ForwardRunMode = 'insight_only' | 'assisted' | 'semi_auto';
export type ForwardRunStatus = 'running' | 'paused' | 'stopped';
export type OrderSide = 'buy' | 'sell';
export type PositionSide = 'long' | 'short';

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
  id: TemplateId;
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
  templateId: TemplateId;
  parameters: Record<string, unknown>;
  universe: string[];
  riskLimits: RiskLimits;
  frequency: string;
  status: StrategyStatus;
  createdAt: number;
  updatedAt: number;
}

export function createStrategy(data: {
  name: string;
  templateId: TemplateId;
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
  templateId: TemplateId;
  status: StrategyStatus;
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
  side: PositionSide;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPct: number;
  exitReason: 'signal' | 'stop_loss' | 'take_profit' | 'expiry';
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
  templateId: TemplateId;
  parameters: Record<string, unknown>;
  universe: string[];
  startDate: string;
  endDate: string;
  initialCapital: number;
  status: BacktestStatus;
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
  status: BacktestStatus;
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
  side: PositionSide;
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
  status: 'proposed' | 'approved' | 'rejected' | 'executed';
  timestamp: number;
}

export interface ForwardRun {
  id: string;
  strategyId: string;
  strategyName: string;
  mode: ForwardRunMode;
  status: ForwardRunStatus;
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
  status: ForwardRunStatus;
  startedAt: number;
}

export function startForwardRun(strategyId: string, mode: ForwardRunMode = 'insight_only') {
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

export type OrderStatus = 'proposed' | 'approved' | 'submitted' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
export type OrderType = 'market' | 'limit';

export interface Order {
  id: string;
  strategyId: string;
  forwardRunId: string | null;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice: number | null;
  fillPrice: number | null;
  fillQuantity: number;
  status: OrderStatus;
  source: 'manual' | 'forward_runner' | 'rebalance';
  createdAt: number;
  updatedAt: number;
}

export interface OrderEntry {
  id: string;
  type: string;
  strategyId: string | null;
  orderId: string | null;
  symbol: string | null;
  side: OrderSide | null;
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
  type?: 'market' | 'limit';
  limitPrice?: number;
  strategyId?: string;
  forwardRunId?: string;
  source?: string;
}) {
  return rpc<{ order: Order; portfolio: PortfolioSnapshot; message?: string }>('POST', 'submit-order', data);
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
  side: OrderSide | null;
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
  sma20: (number | null)[];
  sma50: (number | null)[];
  ema12: (number | null)[];
  ema26: (number | null)[];
  rsi14: (number | null)[];
  bollingerUpper: (number | null)[];
  bollingerLower: (number | null)[];
  bollingerMid: (number | null)[];
  macd: (number | null)[];
  macdSignal: (number | null)[];
  macdHistogram: (number | null)[];
  volumeSma20: (number | null)[];
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
  type: 'price_above' | 'price_below' | 'pnl_threshold' | 'drawdown_threshold' | 'volume_spike' | 'rsi_overbought' | 'rsi_oversold';
  symbol: string | null;
  threshold: number;
  status: 'active' | 'triggered' | 'dismissed';
  triggeredAt: number | null;
  triggeredValue: number | null;
  createdAt: number;
}

export function createAlertApi(data: { name: string; type: Alert['type']; symbol?: string; threshold: number }) {
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

export function evaluateAlerts() {
  return rpc<{ evaluated: number; triggered: Alert[] }>('POST', 'evaluate-alerts');
}

// --- Settings ---

export interface UserSettings {
  theme: 'dark' | 'light';
  defaultMode: 'paper' | 'live';
  defaultCapital: number;
  globalMaxPositionPct: number;
  globalMaxDrawdownPct: number;
  aiInterpretationsEnabled: boolean;
  reviewChecklistsEnabled: boolean;
  defaultWatchlistSymbols: string[];
  alertNotificationsEnabled: boolean;
  updatedAt: number;
}

export function getSettings() {
  return rpc<{ settings: UserSettings }>('GET', 'get-settings');
}

export function updateSettings(data: Partial<UserSettings>) {
  return rpc<{ settings: UserSettings }>('POST', 'update-settings', data);
}

// --- Portfolio Management ---

export function refreshPortfolio() {
  return rpc<{ portfolio: PortfolioSnapshot; refreshed: boolean; pricesUpdated?: number }>('POST', 'refresh-portfolio');
}

export function depositFunds(amount: number, description?: string) {
  return rpc<{ portfolio: PortfolioSnapshot; ledgerEntry: LedgerEntry }>('POST', 'deposit', { amount, description });
}

export function withdrawFunds(amount: number, description?: string) {
  return rpc<{ portfolio: PortfolioSnapshot; ledgerEntry: LedgerEntry }>('POST', 'withdraw', { amount, description });
}

// --- Watchlists ---

export interface WatchlistItem {
  id: string;
  name: string;
  symbols: string[];
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface WatchlistIndexEntry {
  id: string;
  name: string;
  symbolCount: number;
  updatedAt: number;
}

export function createWatchlist(data: { name: string; symbols: string[]; description?: string }) {
  return rpc<{ watchlist: WatchlistItem }>('POST', 'create-watchlist', data);
}

export function listWatchlists() {
  return rpc<{ watchlists: WatchlistIndexEntry[] }>('GET', 'list-watchlists');
}

export function getWatchlistById(id: string) {
  return rpc<{ watchlist: WatchlistItem }>('GET', 'get-watchlist', { id });
}

export function updateWatchlist(data: { id: string; name?: string; symbols?: string[]; description?: string }) {
  return rpc<{ watchlist: WatchlistItem }>('POST', 'update-watchlist', data);
}

export function deleteWatchlist(id: string) {
  return rpc<{ deleted: boolean }>('POST', 'delete-watchlist', { id });
}

// --- Prediction Markets ---

export interface PredictionMarket {
  id: string;
  title: string;
  probability: number;
  volume: number;
  source: 'kalshi' | 'polymarket';
  category: string;
  lastUpdated: number;
}

export function listPredictionMarkets() {
  return rpc<{ markets: PredictionMarket[]; timestamp: number }>('GET', 'list-prediction-markets');
}

// --- Earnings ---

export interface EarningsEvent {
  symbol: string;
  company: string;
  reportDate: string;
  fiscalQuarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  surprise: number | null;
  timing: 'bmo' | 'amc' | 'unknown';
}

export function listEarnings() {
  return rpc<{ earnings: EarningsEvent[]; upcoming: EarningsEvent[]; recent: EarningsEvent[]; timestamp: number }>('GET', 'list-earnings');
}

// --- Cyclones ---

export interface TropicalCyclone {
  id: string;
  name: string;
  basin: string;
  category: string;
  windKt: number | null;
  pressureMb: number | null;
  lat: number;
  lon: number;
  movementDir: string | null;
  movementSpeedKt: number | null;
  source: string;
  lastUpdated: string;
  commodityImpact: string[];
}

export function listCyclones() {
  return rpc<{ cyclones: TropicalCyclone[]; timestamp: number }>('GET', 'list-cyclones');
}

// --- Cyber Threats ---

export interface CyberThreat {
  cveId: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string;
  knownRansomwareCampaignUse: boolean;
  shortDescription: string;
  requiredAction: string;
  severity: 'critical' | 'high' | 'medium';
  affectedSectors: string[];
}

export function listCyberThreats() {
  return rpc<{ threats: CyberThreat[]; summary: { total: number; critical: number; high: number; ransomwareLinked: number }; timestamp: number }>('GET', 'list-cyber-threats');
}

// --- Provider Health ---

export interface ProviderStatus {
  name: string;
  category: 'market_data' | 'llm' | 'infrastructure' | 'intelligence';
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  latencyMs: number | null;
  lastChecked: number;
  description: string;
}

export function getProviderHealth() {
  return rpc<{ providers: ProviderStatus[]; summary: { total: number; operational: number; degraded: number; down: number; unknown: number }; timestamp: number }>('GET', 'provider-health');
}

// --- Intel Status ---

export interface IntelSource {
  name: string;
  description: string;
  status: 'live' | 'stale' | 'down' | 'unknown';
  lastDataTimestamp: number | null;
  latencyMs: number | null;
  recordCount: number | null;
  impact: string;
}

export function getIntelStatus() {
  return rpc<{ sources: IntelSource[]; summary: { total: number; live: number; stale: number; down: number; unknown: number }; timestamp: number }>('GET', 'intel-status');
}

// --- Attribution ---

export interface Attribution {
  marketReturn: number;
  sectorReturn: number;
  styleReturn: number;
  idiosyncraticReturn: number;
  totalReturn: number;
  benchmarkReturn: number;
  beta: number;
  alpha: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
}

export function getAttribution(backtestId: string) {
  return rpc<{ attribution: Attribution; backtestId: string; strategyName: string; templateId: TemplateId }>('GET', 'get-attribution', { backtestId });
}

// --- Audit Log ---

export interface AuditEntry {
  id: string;
  action: string;
  method: string;
  actor: string;
  ip: string | null;
  userAgent: string | null;
  requestBody: Record<string, unknown> | null;
  responseStatus: number;
  durationMs: number;
  timestamp: number;
}

export interface AuditIndexEntry {
  id: string;
  action: string;
  actor: string;
  responseStatus: number;
  timestamp: number;
}

export function listAuditLog() {
  return rpc<{ entries: AuditIndexEntry[]; total: number }>('GET', 'list-audit-log');
}

export function getAuditEntryById(id: string) {
  return rpc<{ entry: AuditEntry }>('GET', 'get-audit-entry', { id });
}

// --- Data Export ---

export function exportData(entity: 'strategies' | 'backtests' | 'ledger' | 'orders' | 'portfolio', format: 'json' | 'csv' = 'json') {
  if (format === 'csv') {
    // For CSV, trigger a download
    const url = `${BASE}/export-data?entity=${entity}&format=csv`;
    window.open(url, '_blank');
    return Promise.resolve({ entity, format: 'csv', downloading: true });
  }
  return rpc<{ entity: string; format: string; count: number; data: Record<string, unknown>[]; exportedAt: string }>('GET', 'export-data', { entity, format });
}

// --- Notifications ---

export type NotificationEventType = 'alert_triggered' | 'order_filled' | 'drawdown_warning' | 'forward_signal' | 'system_alert';

export interface NotificationConfig {
  webhookUrl: string | null;
  webhookSecret: string | null;
  enabledEvents: NotificationEventType[];
  inAppEnabled: boolean;
  updatedAt: number;
}

export interface NotificationRecord {
  id: string;
  eventType: NotificationEventType;
  channel: 'webhook' | 'in_app';
  title: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  error: string | null;
  timestamp: number;
}

export function getNotificationConfig() {
  return rpc<{ config: NotificationConfig }>('GET', 'get-notification-config');
}

export function updateNotificationConfig(data: Partial<NotificationConfig>) {
  return rpc<{ config: NotificationConfig }>('POST', 'update-notification-config', data);
}

export function listNotifications() {
  return rpc<{ notifications: NotificationRecord[]; total: number }>('GET', 'list-notifications');
}

export function testWebhook() {
  return rpc<{ record: NotificationRecord; success: boolean }>('POST', 'test-webhook');
}

// --- Platform Configuration ---

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  category: 'trading' | 'ai' | 'analytics' | 'admin' | 'integration';
}

export interface PlatformConfig {
  version: number;
  featureFlags: FeatureFlag[];
  aiModelPolicy: {
    primaryProvider: string;
    fallbackProviders: string[];
    maxTokensPerRequest: number;
    maxRequestsPerHour: number;
  };
  tradingLimits: {
    maxStrategies: number;
    maxBacktestsPerDay: number;
    maxForwardRuns: number;
    maxWatchlists: number;
    maxAlertsPerUser: number;
  };
  updatedAt: number;
  updatedBy: string;
  changeNote: string;
}

export interface ConfigHistoryEntry {
  id: string;
  version: number;
  changeNote: string;
  updatedBy: string;
  timestamp: number;
}

export function getPlatformConfig() {
  return rpc<{ config: PlatformConfig }>('GET', 'get-platform-config');
}

export function updatePlatformConfig(data: { featureFlags?: { id: string; enabled: boolean }[]; aiModelPolicy?: Partial<PlatformConfig['aiModelPolicy']>; tradingLimits?: Partial<PlatformConfig['tradingLimits']>; changeNote?: string }) {
  return rpc<{ config: PlatformConfig }>('POST', 'update-platform-config', data);
}

export function toggleFeatureFlagApi(flagId: string, enabled: boolean, changeNote?: string) {
  return rpc<{ config: PlatformConfig; toggled: { flagId: string; enabled: boolean } }>('POST', 'toggle-feature-flag', { flagId, enabled, changeNote });
}

export function rollbackConfigApi(version: number) {
  return rpc<{ config: PlatformConfig; rolledBackFrom: number; rolledBackTo: number }>('POST', 'rollback-config', { version });
}

export function listConfigHistory() {
  return rpc<{ history: ConfigHistoryEntry[]; total: number }>('GET', 'list-config-history');
}
