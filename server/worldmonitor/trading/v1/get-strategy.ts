import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy } from './trading-store';

export async function getStrategyHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const strategy = await getStrategy(id);
  if (!strategy) return errorResponse('Strategy not found', 404);

  return jsonResponse({ strategy });
}
