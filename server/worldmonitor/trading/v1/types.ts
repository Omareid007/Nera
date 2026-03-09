/* ─── User Settings ─── */

export interface UserSettings {
  // Appearance
  theme: 'dark' | 'light';

  // Trading
  defaultMode: 'paper' | 'live';
  defaultCapital: number;

  // Risk guardrails (global defaults applied to new strategies)
  globalMaxPositionPct: number;
  globalMaxDrawdownPct: number;

  // AI preferences
  aiInterpretationsEnabled: boolean;
  reviewChecklistsEnabled: boolean;

  // Watchlist
  defaultWatchlistSymbols: string[];

  // Notifications
  alertNotificationsEnabled: boolean;

  updatedAt: number;
}

/* ─── Watchlist ─── */

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  description: string;
  createdAt: number;
  updatedAt: number;
}

/* ─── Algorithm Templates ─── */

export type TemplateId =
  | 'momentum'
  | 'mean_reversion'
  | 'breakout'
  | 'trend_following'
  | 'etf_rotation'
  | 'sector_rotation'
  | 'event_driven'
  | 'custom';

export type FieldType = 'number' | 'select' | 'boolean' | 'symbol_list' | 'string';

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
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

/* ─── Strategy ─── */

export type StrategyStatus = 'draft' | 'backtesting' | 'validated' | 'paper' | 'active' | 'paused' | 'archived';

export interface RiskLimits {
  maxPositionPct: number;     // max single position as % of portfolio
  maxDrawdownPct: number;     // max drawdown before halt
  stopLossPct: number;        // per-trade stop loss %
  takeProfitPct: number;      // per-trade take profit %
  maxExposurePct: number;     // max total exposure %
  maxPositions: number;       // max concurrent positions
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  templateId: TemplateId;
  parameters: Record<string, unknown>;
  universe: string[];          // list of symbols
  riskLimits: RiskLimits;
  frequency: string;           // 'daily' | '4h' | '1h' | 'weekly'
  status: StrategyStatus;
  createdAt: number;
  updatedAt: number;
}

/* ─── Backtest ─── */

export type BacktestStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface BacktestMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // days
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeDuration: number;   // days
  avgWin: number;
  avgLoss: number;
  calmarRatio: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
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

/* ─── Forward Runner ─── */

export type ForwardRunMode = 'insight_only' | 'assisted' | 'semi_auto';
export type ForwardRunStatus = 'running' | 'paused' | 'stopped';

export interface ForwardSignal {
  id: string;
  symbol: string;
  direction: 'long' | 'short' | 'flat';
  strength: number;           // 0-100
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

/* ─── Execution ─── */

export type OrderStatus = 'proposed' | 'approved' | 'submitted' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
export type OrderSide = 'buy' | 'sell';
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

/* ─── Portfolio ─── */

export interface Position {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  realizedPnl: number;
  side: 'long' | 'short';
  strategyId: string;
  openedAt: number;
}

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

/* ─── Ledger ─── */

export type LedgerEntryType = 'order' | 'fill' | 'fee' | 'adjustment' | 'deposit' | 'withdrawal';

export interface LedgerEntry {
  id: string;
  type: LedgerEntryType;
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

/* ─── AI Events ─── */

export type AiEventType =
  | 'strategy_interpretation'
  | 'review_checklist'
  | 'risk_summary'
  | 'sentiment_shift'
  | 'news_impact'
  | 'draft_assist';

export interface AiEvent {
  id: string;
  type: AiEventType;
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

/* ─── Evidence ─── */

export type EvidenceType =
  | 'ai_invocation'
  | 'strategy_create'
  | 'strategy_update'
  | 'backtest_run'
  | 'forward_signal'
  | 'order_submit'
  | 'order_fill'
  | 'config_change';

export interface EvidenceRecord {
  id: string;
  type: EvidenceType;
  entityType: string;
  entityId: string;
  actor: string;
  summary: string;
  details: Record<string, unknown>;
  timestamp: number;
}
