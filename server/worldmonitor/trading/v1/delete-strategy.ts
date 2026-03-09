import { parseBody, jsonResponse, errorResponse } from './handler';
import { deleteStrategy, getStrategy, getForwardIndex, getForwardRun, storeForwardRun } from './trading-store';

export async function deleteStrategyHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  // Verify strategy exists before attempting deletion
  const strategy = await getStrategy(id);
  if (!strategy) return errorResponse('Strategy not found', 404);

  // Stop any running forward runs for this strategy before deleting
  try {
    const forwardIndex = await getForwardIndex();
    const strategyRuns = forwardIndex.filter((r) => r.strategyId === id && r.status === 'running');
    for (const runEntry of strategyRuns) {
      const run = await getForwardRun(runEntry.id);
      if (run) {
        run.status = 'stopped';
        await storeForwardRun(run);
      }
    }
  } catch {
    // Non-critical — proceed with delete even if cleanup fails
  }

  try {
    await deleteStrategy(id);
  } catch {
    return errorResponse('Failed to delete strategy', 500);
  }

  return jsonResponse({ deleted: true });
}
