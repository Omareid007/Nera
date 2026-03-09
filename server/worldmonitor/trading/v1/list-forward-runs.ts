import { parseBody, jsonResponse } from './handler';
import { getForwardIndex } from './trading-store';

export async function listForwardRuns(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const strategyId = body.strategyId as string | undefined;

  let index = await getForwardIndex();
  if (strategyId) index = index.filter((e) => e.strategyId === strategyId);
  index.sort((a, b) => b.startedAt - a.startedAt);

  return jsonResponse({ forwardRuns: index });
}
