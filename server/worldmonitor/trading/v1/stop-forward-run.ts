import { parseBody, jsonResponse, errorResponse } from './handler';
import { getForwardRun, storeForwardRun, getStrategy, storeStrategy, getForwardIndex } from './trading-store';

export async function stopForwardRun(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const run = await getForwardRun(id);
  if (!run) return errorResponse('Forward run not found', 404);

  if (run.status === 'stopped') {
    return errorResponse('Forward run is already stopped');
  }

  run.status = 'stopped';

  try {
    await storeForwardRun(run);

    // Revert strategy status only if it was set to 'paper' by start-forward-run
    const strategy = await getStrategy(run.strategyId);
    if (strategy && strategy.status === 'paper') {
      // Check if any OTHER forward runs for this strategy are still running
      const forwardIndex = await getForwardIndex();
      const otherRunning = forwardIndex.some(
        (r) => r.strategyId === run.strategyId && r.id !== run.id && r.status === 'running'
      );
      if (!otherRunning) {
        strategy.status = 'validated';
        strategy.updatedAt = Date.now();
        await storeStrategy(strategy);
      }
    }
  } catch {
    return errorResponse('Failed to stop forward run', 500);
  }

  return jsonResponse({ forwardRun: run });
}
