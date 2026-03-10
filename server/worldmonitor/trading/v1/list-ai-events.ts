import { parseBody, jsonResponse } from './handler';
import { getAiEventIndex } from './trading-store';

export async function listAiEventsHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const strategyId = body.strategyId as string | undefined;

  let index = await getAiEventIndex();

  if (strategyId) {
    index = index.filter((e) => e.strategyId === strategyId);
  }

  // Return newest first
  index.sort((a, b) => b.timestamp - a.timestamp);

  return jsonResponse({ aiEvents: index });
}
