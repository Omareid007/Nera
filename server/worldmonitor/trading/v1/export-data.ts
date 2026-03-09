/**
 * Data export RPC — exports strategies, backtests, ledger, orders, or portfolio as JSON/CSV.
 * Supports: strategies, backtests, ledger, orders, portfolio
 */

import { parseBody, jsonResponse, errorResponse } from './_shared';
import {
  getStrategyIndex, getStrategy,
  getBacktestIndex, getBacktestRun,
  getLedgerIndex, getLedgerEntry,
  getOrderIndex, getOrder,
  getPortfolioSnapshot,
} from './trading-store';

type ExportFormat = 'json' | 'csv';
type ExportEntity = 'strategies' | 'backtests' | 'ledger' | 'orders' | 'portfolio';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function exportData(req: Request): Promise<Response> {
  const params = await parseBody(req);
  const entity = (params.entity as string) || '';
  const format: ExportFormat = (params.format as ExportFormat) === 'csv' ? 'csv' : 'json';

  const validEntities: ExportEntity[] = ['strategies', 'backtests', 'ledger', 'orders', 'portfolio'];
  if (!validEntities.includes(entity as ExportEntity)) {
    return errorResponse(`entity must be one of: ${validEntities.join(', ')}`);
  }

  try {
    let data: Record<string, unknown>[] = [];
    let filename = `nera-${entity}-${new Date().toISOString().slice(0, 10)}`;

    switch (entity as ExportEntity) {
      case 'strategies': {
        const index = await getStrategyIndex();
        const results = await Promise.all(index.map((i) => getStrategy(i.id)));
        data = results.filter(Boolean).map((s) => ({
          id: s!.id,
          name: s!.name,
          description: s!.description,
          templateId: s!.templateId,
          universe: s!.universe.join('; '),
          frequency: s!.frequency,
          status: s!.status,
          stopLossPct: s!.riskLimits.stopLossPct,
          takeProfitPct: s!.riskLimits.takeProfitPct,
          maxPositionPct: s!.riskLimits.maxPositionPct,
          maxDrawdownPct: s!.riskLimits.maxDrawdownPct,
          createdAt: new Date(s!.createdAt).toISOString(),
          updatedAt: new Date(s!.updatedAt).toISOString(),
        }));
        break;
      }
      case 'backtests': {
        const index = await getBacktestIndex();
        const results = await Promise.all(index.map((i) => getBacktestRun(i.id)));
        data = results.filter(Boolean).map((b) => ({
          id: b!.id,
          strategyId: b!.strategyId,
          strategyName: b!.strategyName,
          templateId: b!.templateId,
          universe: b!.universe.join('; '),
          startDate: b!.startDate,
          endDate: b!.endDate,
          initialCapital: b!.initialCapital,
          status: b!.status,
          totalReturn: b!.metrics?.totalReturn ?? null,
          sharpeRatio: b!.metrics?.sharpeRatio ?? null,
          maxDrawdown: b!.metrics?.maxDrawdown ?? null,
          winRate: b!.metrics?.winRate ?? null,
          totalTrades: b!.metrics?.totalTrades ?? null,
          profitFactor: b!.metrics?.profitFactor ?? null,
          provider: b!.provider,
          barsAvailable: b!.barsAvailable,
          createdAt: new Date(b!.createdAt).toISOString(),
        }));
        break;
      }
      case 'ledger': {
        const index = await getLedgerIndex();
        const results = await Promise.all(index.slice(-500).map((i) => getLedgerEntry(i.id)));
        data = results.filter(Boolean).map((e) => ({
          id: e!.id,
          type: e!.type,
          strategyId: e!.strategyId ?? '',
          orderId: e!.orderId ?? '',
          symbol: e!.symbol ?? '',
          side: e!.side ?? '',
          quantity: e!.quantity ?? '',
          price: e!.price ?? '',
          amount: e!.amount,
          description: e!.description,
          timestamp: new Date(e!.timestamp).toISOString(),
        }));
        break;
      }
      case 'orders': {
        const index = await getOrderIndex();
        const results = await Promise.all(index.slice(-500).map((i) => getOrder(i.id)));
        data = results.filter(Boolean).map((o) => ({
          id: o!.id,
          strategyId: o!.strategyId,
          symbol: o!.symbol,
          side: o!.side,
          type: o!.type,
          quantity: o!.quantity,
          limitPrice: o!.limitPrice ?? '',
          fillPrice: o!.fillPrice ?? '',
          fillQuantity: o!.fillQuantity,
          status: o!.status,
          source: o!.source,
          createdAt: new Date(o!.createdAt).toISOString(),
          updatedAt: new Date(o!.updatedAt).toISOString(),
        }));
        break;
      }
      case 'portfolio': {
        const portfolio = await getPortfolioSnapshot();
        if (portfolio) {
          data = portfolio.positions.map((p) => ({
            symbol: p.symbol,
            quantity: p.quantity,
            avgEntryPrice: p.avgEntryPrice,
            currentPrice: p.currentPrice,
            marketValue: p.marketValue,
            unrealizedPnl: p.unrealizedPnl,
            unrealizedPnlPct: p.unrealizedPnlPct,
            realizedPnl: p.realizedPnl,
            side: p.side,
            strategyId: p.strategyId,
            openedAt: new Date(p.openedAt).toISOString(),
          }));
          // Add portfolio summary as first row context
          filename = `nera-portfolio-${new Date().toISOString().slice(0, 10)}`;
        }
        break;
      }
    }

    if (format === 'csv') {
      const csv = toCsv(data);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return jsonResponse({ entity, format, count: data.length, data, exportedAt: new Date().toISOString() });
  } catch {
    return errorResponse('Export failed', 500);
  }
}
