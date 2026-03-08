import { parseBody, jsonResponse } from './handler';
import { getBacktestIndex } from './trading-store';

export async function listBacktestRuns(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const strategyId = body.strategyId as string | undefined;

  let runs = await getBacktestIndex();

  if (strategyId) {
    runs = runs.filter((r) => r.strategyId === strategyId);
  }

  return jsonResponse({ backtestRuns: runs.sort((a, b) => b.createdAt - a.createdAt) });
}
