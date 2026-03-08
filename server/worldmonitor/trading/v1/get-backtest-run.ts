import { parseBody, jsonResponse, errorResponse } from './handler';
import { getBacktestRun } from './trading-store';

export async function getBacktestRunHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const run = await getBacktestRun(id);
  if (!run) return errorResponse('Backtest run not found', 404);

  return jsonResponse({ backtestRun: run });
}
