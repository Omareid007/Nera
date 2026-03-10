import { jsonResponse } from './handler';
import { getStrategyIndex } from './trading-store';

export async function listStrategies(_req: Request): Promise<Response> {
  const strategies = await getStrategyIndex();
  return jsonResponse({ strategies: strategies.sort((a, b) => b.updatedAt - a.updatedAt) });
}
