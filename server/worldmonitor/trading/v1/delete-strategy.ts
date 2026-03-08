import { parseBody, jsonResponse, errorResponse } from './handler';
import { deleteStrategy } from './trading-store';

export async function deleteStrategyHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  await deleteStrategy(id);
  return jsonResponse({ deleted: true });
}
