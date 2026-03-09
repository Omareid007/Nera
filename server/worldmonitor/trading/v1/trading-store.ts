/**
 * Redis-backed persistence for trading entities.
 * Follows the pattern from premium-stock-store.ts.
 */

import { getCachedJson, setCachedJson } from '../../../_shared/redis';
import type {
  Strategy,
  BacktestRun,
  ForwardRun,
  Order,
  PortfolioSnapshot,
  LedgerEntry,
  AiEvent,
  EvidenceRecord,
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
const HISTORY_PREFIX = 'trading:history:v1:';

const TTL_90D = 90 * 24 * 3600;
const TTL_30D = 30 * 24 * 3600;

// --- Strategies ---

export async function storeStrategy(s: Strategy): Promise<void> {
  await setCachedJson(`${STRATEGY_PREFIX}${s.id}`, s, TTL_90D);
  // Update index
  const index = await getStrategyIndex();
  const entry = { id: s.id, name: s.name, templateId: s.templateId, status: s.status, updatedAt: s.updatedAt };
  const existing = index.findIndex((e) => e.id === s.id);
  if (existing >= 0) index[existing] = entry;
  else index.push(entry);
  await setCachedJson(STRATEGY_INDEX, index, TTL_90D);
}

export async function getStrategy(id: string): Promise<Strategy | null> {
  return getCachedJson(`${STRATEGY_PREFIX}${id}`);
}

type StrategyIndexEntry = { id: string; name: string; templateId: string; status: string; updatedAt: number };

export async function getStrategyIndex(): Promise<StrategyIndexEntry[]> {
  return (await getCachedJson(STRATEGY_INDEX)) ?? [];
}

export async function deleteStrategy(id: string): Promise<void> {
  await setCachedJson(`${STRATEGY_PREFIX}${id}`, null, 1); // TTL=1 to expire
  const index = await getStrategyIndex();
  const filtered = index.filter((e) => e.id !== id);
  await setCachedJson(STRATEGY_INDEX, filtered, TTL_90D);
}

// --- Backtests ---

export async function storeBacktestRun(run: BacktestRun): Promise<void> {
  await setCachedJson(`${BACKTEST_PREFIX}${run.id}`, run, TTL_30D);
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
  await setCachedJson(BACKTEST_INDEX, index, TTL_30D);
}

export async function getBacktestRun(id: string): Promise<BacktestRun | null> {
  return getCachedJson(`${BACKTEST_PREFIX}${id}`);
}

type BacktestIndexEntry = { id: string; strategyId: string; strategyName: string; status: string; createdAt: number; totalReturn: number | null };

export async function getBacktestIndex(): Promise<BacktestIndexEntry[]> {
  return (await getCachedJson(BACKTEST_INDEX)) ?? [];
}

// --- Forward Runs ---

export async function storeForwardRun(run: ForwardRun): Promise<void> {
  await setCachedJson(`${FORWARD_PREFIX}${run.id}`, run, TTL_90D);
  const index = await getForwardIndex();
  const entry = { id: run.id, strategyId: run.strategyId, strategyName: run.strategyName, status: run.status, startedAt: run.startedAt };
  const existing = index.findIndex((e) => e.id === run.id);
  if (existing >= 0) index[existing] = entry;
  else index.push(entry);
  await setCachedJson(FORWARD_INDEX, index, TTL_90D);
}

export async function getForwardRun(id: string): Promise<ForwardRun | null> {
  return getCachedJson(`${FORWARD_PREFIX}${id}`);
}

type ForwardIndexEntry = { id: string; strategyId: string; strategyName: string; status: string; startedAt: number };

export async function getForwardIndex(): Promise<ForwardIndexEntry[]> {
  return (await getCachedJson(FORWARD_INDEX)) ?? [];
}

// --- Orders ---

export async function storeOrder(order: Order): Promise<void> {
  await setCachedJson(`${ORDER_PREFIX}${order.id}`, order, TTL_90D);
}

export async function getOrder(id: string): Promise<Order | null> {
  return getCachedJson(`${ORDER_PREFIX}${id}`);
}

// --- Portfolio ---

export async function storePortfolioSnapshot(snapshot: PortfolioSnapshot): Promise<void> {
  await setCachedJson(PORTFOLIO_KEY, snapshot, TTL_90D);
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot | null> {
  return getCachedJson(PORTFOLIO_KEY);
}

// --- Ledger ---

export async function storeLedgerEntry(entry: LedgerEntry): Promise<void> {
  await setCachedJson(`${LEDGER_PREFIX}${entry.id}`, entry, TTL_90D);
  const index = await getLedgerIndex();
  index.push({ id: entry.id, type: entry.type, symbol: entry.symbol, strategyId: entry.strategyId ?? null, timestamp: entry.timestamp });
  // Keep last 500 entries in index
  if (index.length > 500) index.splice(0, index.length - 500);
  await setCachedJson(LEDGER_INDEX, index, TTL_90D);
}

type LedgerIndexEntry = { id: string; type: string; symbol: string | null; strategyId: string | null; timestamp: number };

export async function getLedgerIndex(): Promise<LedgerIndexEntry[]> {
  return (await getCachedJson(LEDGER_INDEX)) ?? [];
}

export async function getLedgerEntry(id: string): Promise<LedgerEntry | null> {
  return getCachedJson(`${LEDGER_PREFIX}${id}`);
}

// --- AI Events ---

export async function storeAiEvent(event: AiEvent): Promise<void> {
  await setCachedJson(`${AI_EVENT_PREFIX}${event.id}`, event, TTL_30D);
  const index = await getAiEventIndex();
  index.push({ id: event.id, type: event.type, strategyId: event.strategyId, timestamp: event.timestamp });
  if (index.length > 200) index.splice(0, index.length - 200);
  await setCachedJson(AI_EVENT_INDEX, index, TTL_30D);
}

type AiEventIndexEntry = { id: string; type: string; strategyId: string | null; timestamp: number };

export async function getAiEventIndex(): Promise<AiEventIndexEntry[]> {
  return (await getCachedJson(AI_EVENT_INDEX)) ?? [];
}

export async function getAiEvent(id: string): Promise<AiEvent | null> {
  return getCachedJson(`${AI_EVENT_PREFIX}${id}`);
}

// --- Evidence ---

export async function storeEvidence(record: EvidenceRecord): Promise<void> {
  await setCachedJson(`${EVIDENCE_PREFIX}${record.id}`, record, TTL_90D);
}

// --- Historical Data Cache ---

export async function getCachedHistory(symbol: string, range: string): Promise<unknown[] | null> {
  return getCachedJson(`${HISTORY_PREFIX}${symbol}:${range}`);
}

export async function setCachedHistory(symbol: string, range: string, data: unknown[], ttl: number): Promise<void> {
  await setCachedJson(`${HISTORY_PREFIX}${symbol}:${range}`, data, ttl);
}
