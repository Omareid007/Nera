/**
 * Redis-backed persistence for trading entities.
 * Follows the pattern from premium-stock-store.ts.
 */

import { getCachedJson, setCachedJson, runRedisPipeline } from '../../../_shared/redis';
import type {
  Strategy,
  BacktestRun,
  ForwardRun,
  Order,
  PortfolioSnapshot,
  LedgerEntry,
  AiEvent,
  EvidenceRecord,
  UserSettings,
  Watchlist,
} from './types';

// --- Key helpers ---

const STRATEGY_PREFIX = 'trading:strategy:v1:';
const STRATEGY_INDEX = 'trading:strategies:v1:index';
const BACKTEST_PREFIX = 'trading:backtest:v1:';
const BACKTEST_INDEX = 'trading:backtests:v1:index';
const FORWARD_PREFIX = 'trading:forward:v1:';
const FORWARD_INDEX = 'trading:forwards:v1:index';
const ORDER_PREFIX = 'trading:order:v1:';
const PORTFOLIO_KEY = 'trading:portfolio:v1:snapshot';
const LEDGER_PREFIX = 'trading:ledger:v1:';
const LEDGER_INDEX = 'trading:ledger:v1:index';
const AI_EVENT_PREFIX = 'trading:ai-event:v1:';
const AI_EVENT_INDEX = 'trading:ai-events:v1:index';
const EVIDENCE_PREFIX = 'trading:evidence:v1:';
const EVIDENCE_INDEX = 'trading:evidence:v1:index';
const HISTORY_PREFIX = 'trading:history:v1:';
const SETTINGS_KEY = 'trading:settings:v1:user';
const WATCHLIST_PREFIX = 'trading:watchlist:v1:';
const WATCHLIST_INDEX = 'trading:watchlists:v1:index';
const ORDER_INDEX = 'trading:orders:v1:index';

const TTL_90D = 90 * 24 * 3600;
const TTL_30D = 30 * 24 * 3600;

// --- Strategies ---

export async function storeStrategy(s: Strategy): Promise<void> {
  // Update index
  const index = await getStrategyIndex();
  const entry = { id: s.id, name: s.name, templateId: s.templateId, status: s.status, updatedAt: s.updatedAt };
  const existing = index.findIndex((e) => e.id === s.id);
  if (existing >= 0) index[existing] = entry;
  else index.push(entry);
  // Pipeline: write entity + index in a single round-trip
  await runRedisPipeline([
    ['SET', `${STRATEGY_PREFIX}${s.id}`, JSON.stringify(s), 'EX', TTL_90D],
    ['SET', STRATEGY_INDEX, JSON.stringify(index), 'EX', TTL_90D],
  ]);
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  return getCachedJson(`${STRATEGY_PREFIX}${id}`) as Promise<Strategy | null>;
}

type StrategyIndexEntry = { id: string; name: string; templateId: string; status: string; updatedAt: number };

export async function getStrategyIndex(): Promise<StrategyIndexEntry[]> {
  return ((await getCachedJson(STRATEGY_INDEX)) ?? []) as StrategyIndexEntry[];
}

export async function deleteStrategy(id: string): Promise<void> {
  const index = await getStrategyIndex();
  const filtered = index.filter((e) => e.id !== id);
  await runRedisPipeline([
    ['SET', `${STRATEGY_PREFIX}${id}`, JSON.stringify(null), 'EX', 1],
    ['SET', STRATEGY_INDEX, JSON.stringify(filtered), 'EX', TTL_90D],
  ]);
}

// --- Backtests ---

export async function storeBacktestRun(run: BacktestRun): Promise<void> {
  const index = await getBacktestIndex();
  const entry = {
    id: run.id,
    strategyId: run.strategyId,
    strategyName: run.strategyName,
    status: run.status,
    createdAt: run.createdAt,
    totalReturn: run.metrics?.totalReturn ?? null,
  };
  const existing = index.findIndex((e) => e.id === run.id);
  if (existing >= 0) index[existing] = entry;
  else index.push(entry);
  await runRedisPipeline([
    ['SET', `${BACKTEST_PREFIX}${run.id}`, JSON.stringify(run), 'EX', TTL_30D],
    ['SET', BACKTEST_INDEX, JSON.stringify(index), 'EX', TTL_30D],
  ]);
}

export async function getBacktestRun(id: string): Promise<BacktestRun | null> {
  return getCachedJson(`${BACKTEST_PREFIX}${id}`) as Promise<BacktestRun | null>;
}

type BacktestIndexEntry = { id: string; strategyId: string; strategyName: string; status: string; createdAt: number; totalReturn: number | null };

export async function getBacktestIndex(): Promise<BacktestIndexEntry[]> {
  return ((await getCachedJson(BACKTEST_INDEX)) ?? []) as BacktestIndexEntry[];
}

// --- Forward Runs ---

export async function storeForwardRun(run: ForwardRun): Promise<void> {
  const index = await getForwardIndex();
  const entry = { id: run.id, strategyId: run.strategyId, strategyName: run.strategyName, status: run.status, startedAt: run.startedAt };
  const existing = index.findIndex((e) => e.id === run.id);
  if (existing >= 0) index[existing] = entry;
  else index.push(entry);
  await runRedisPipeline([
    ['SET', `${FORWARD_PREFIX}${run.id}`, JSON.stringify(run), 'EX', TTL_90D],
    ['SET', FORWARD_INDEX, JSON.stringify(index), 'EX', TTL_90D],
  ]);
}

export async function getForwardRun(id: string): Promise<ForwardRun | null> {
  return getCachedJson(`${FORWARD_PREFIX}${id}`) as Promise<ForwardRun | null>;
}

type ForwardIndexEntry = { id: string; strategyId: string; strategyName: string; status: string; startedAt: number };

export async function getForwardIndex(): Promise<ForwardIndexEntry[]> {
  return ((await getCachedJson(FORWARD_INDEX)) ?? []) as ForwardIndexEntry[];
}

// --- Orders ---

export async function storeOrder(order: Order): Promise<void> {
  await setCachedJson(`${ORDER_PREFIX}${order.id}`, order, TTL_90D);
}

export async function getOrder(id: string): Promise<Order | null> {
  return getCachedJson(`${ORDER_PREFIX}${id}`) as Promise<Order | null>;
}

// --- Portfolio ---

export async function storePortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
  await setCachedJson(PORTFOLIO_KEY, snapshot, TTL_90D);
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot | null> {
  return getCachedJson(PORTFOLIO_KEY) as Promise<PortfolioSnapshot | null>;
}

// --- Ledger ---

export async function storeLedgerEntry(entry: LedgerEntry): Promise<void> {
  const index = await getLedgerIndex();
  index.push({ id: entry.id, type: entry.type, symbol: entry.symbol, strategyId: entry.strategyId ?? null, timestamp: entry.timestamp });
  // Keep last 500 entries in index
  if (index.length > 500) index.splice(0, index.length - 500);
  await runRedisPipeline([
    ['SET', `${LEDGER_PREFIX}${entry.id}`, JSON.stringify(entry), 'EX', TTL_90D],
    ['SET', LEDGER_INDEX, JSON.stringify(index), 'EX', TTL_90D],
  ]);
}

type LedgerIndexEntry = { id: string; type: string; symbol: string | null; strategyId: string | null; timestamp: number };

export async function getLedgerIndex(): Promise<LedgerIndexEntry[]> {
  return ((await getCachedJson(LEDGER_INDEX)) ?? []) as LedgerIndexEntry[];
}

export async function getLedgerEntry(id: string): Promise<LedgerEntry | null> {
  return getCachedJson(`${LEDGER_PREFIX}${id}`) as Promise<LedgerEntry | null>;
}

// --- AI Events ---

export async function storeAiEvent(event: AiEvent): Promise<void> {
  const index = await getAiEventIndex();
  index.push({ id: event.id, type: event.type, strategyId: event.strategyId, timestamp: event.timestamp });
  if (index.length > 200) index.splice(0, index.length - 200);
  await runRedisPipeline([
    ['SET', `${AI_EVENT_PREFIX}${event.id}`, JSON.stringify(event), 'EX', TTL_30D],
    ['SET', AI_EVENT_INDEX, JSON.stringify(index), 'EX', TTL_30D],
  ]);
}

type AiEventIndexEntry = { id: string; type: string; strategyId: string | null; timestamp: number };

export async function getAiEventIndex(): Promise<AiEventIndexEntry[]> {
  return ((await getCachedJson(AI_EVENT_INDEX)) ?? []) as AiEventIndexEntry[];
}

export async function getAiEvent(id: string): Promise<AiEvent | null> {
  return getCachedJson(`${AI_EVENT_PREFIX}${id}`) as Promise<AiEvent | null>;
}

// --- Evidence ---

export async function storeEvidence(record: EvidenceRecord): Promise<void> {
  const index = await getEvidenceIndex();
  index.push({ id: record.id, type: record.type, entityType: record.entityType, entityId: record.entityId, timestamp: record.timestamp });
  if (index.length > 500) index.splice(0, index.length - 500);
  await runRedisPipeline([
    ['SET', `${EVIDENCE_PREFIX}${record.id}`, JSON.stringify(record), 'EX', TTL_90D],
    ['SET', EVIDENCE_INDEX, JSON.stringify(index), 'EX', TTL_90D],
  ]);
}

type EvidenceIndexEntry = { id: string; type: string; entityType: string; entityId: string; timestamp: number };

export async function getEvidenceIndex(): Promise<EvidenceIndexEntry[]> {
  return ((await getCachedJson(EVIDENCE_INDEX)) ?? []) as EvidenceIndexEntry[];
}

export async function getEvidence(id: string): Promise<EvidenceRecord | null> {
  return getCachedJson(`${EVIDENCE_PREFIX}${id}`) as Promise<EvidenceRecord | null>;
}

// --- Historical Data Cache ---

export async function getCachedHistory(symbol: string, range: string): Promise<unknown[] | null> {
  return getCachedJson(`${HISTORY_PREFIX}${symbol}:${range}`) as Promise<unknown[] | null>;
}

export async function setCachedHistory(symbol: string, range: string, data: unknown[], ttl: number): Promise<void> {
  await setCachedJson(`${HISTORY_PREFIX}${symbol}:${range}`, data, ttl);
}

// --- User Settings ---

export async function getUserSettings(): Promise<UserSettings | null> {
  return getCachedJson(SETTINGS_KEY) as Promise<UserSettings | null>;
}

export async function storeUserSettings(settings: UserSettings): Promise<void> {
  await setCachedJson(SETTINGS_KEY, settings, TTL_90D);
}

// --- Watchlists ---

type WatchlistIndexEntry = { id: string; name: string; symbolCount: number; updatedAt: number };

export async function storeWatchlist(wl: Watchlist): Promise<void> {
  const index = await getWatchlistIndex();
  const entry: WatchlistIndexEntry = { id: wl.id, name: wl.name, symbolCount: wl.symbols.length, updatedAt: wl.updatedAt };
  const existing = index.findIndex((e) => e.id === wl.id);
  if (existing >= 0) index[existing] = entry;
  else index.push(entry);
  await runRedisPipeline([
    ['SET', `${WATCHLIST_PREFIX}${wl.id}`, JSON.stringify(wl), 'EX', TTL_90D],
    ['SET', WATCHLIST_INDEX, JSON.stringify(index), 'EX', TTL_90D],
  ]);
}

export async function getWatchlist(id: string): Promise<Watchlist | null> {
  return getCachedJson(`${WATCHLIST_PREFIX}${id}`) as Promise<Watchlist | null>;
}

export async function getWatchlistIndex(): Promise<WatchlistIndexEntry[]> {
  return ((await getCachedJson(WATCHLIST_INDEX)) ?? []) as WatchlistIndexEntry[];
}

export async function deleteWatchlist(id: string): Promise<void> {
  const index = await getWatchlistIndex();
  const filtered = index.filter((e) => e.id !== id);
  await runRedisPipeline([
    ['SET', `${WATCHLIST_PREFIX}${id}`, JSON.stringify(null), 'EX', 1],
    ['SET', WATCHLIST_INDEX, JSON.stringify(filtered), 'EX', TTL_90D],
  ]);
}

// --- Order Index ---

type OrderIndexEntry = { id: string; symbol: string; side: string; status: string; createdAt: number };

export async function getOrderIndex(): Promise<OrderIndexEntry[]> {
  return ((await getCachedJson(ORDER_INDEX)) ?? []) as OrderIndexEntry[];
}

export async function storeOrderWithIndex(order: Order): Promise<void> {
  const index = await getOrderIndex();
  index.push({ id: order.id, symbol: order.symbol, side: order.side, status: order.status, createdAt: order.createdAt });
  if (index.length > 500) index.splice(0, index.length - 500);
  await runRedisPipeline([
    ['SET', `${ORDER_PREFIX}${order.id}`, JSON.stringify(order), 'EX', TTL_90D],
    ['SET', ORDER_INDEX, JSON.stringify(index), 'EX', TTL_90D],
  ]);
}
