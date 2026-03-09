import { parseBody, jsonResponse, errorResponse } from './handler';
import { getAiEvent } from './trading-store';

export async function getAiEventHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const aiEvent = await getAiEvent(id);
  if (!aiEvent) return errorResponse('AI event not found', 404);

  return jsonResponse({ aiEvent });
}
