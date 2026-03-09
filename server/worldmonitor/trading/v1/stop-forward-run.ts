import { parseBody, jsonResponse, errorResponse } from './handler';
import { getForwardRun, storeForwardRun, getStrategy, storeStrategy } from './trading-store';

export async function stopForwardRun(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const run = await getForwardRun(id);
  if (!run) return errorResponse('Forward run not found', 404);

  run.status = 'stopped';

  try {
    await storeForwardRun(run);

    // Revert strategy to validated
    const strategy = await getStrategy(run.strategyId);
    if (strategy && strategy.status === 'paper') {
      strategy.status = 'validated';
      strategy.updatedAt = Date.now();
      await storeStrategy(strategy);
    }
  } catch {
    return errorResponse('Failed to stop forward run', 500);
  }

  return jsonResponse({ forwardRun: run });
}
