import { parseBody, jsonResponse, errorResponse } from './handler';
import { getForwardRun } from './trading-store';

export async function getForwardRunHandler(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const run = await getForwardRun(id);
  if (!run) return errorResponse('Forward run not found', 404);

  return jsonResponse({ forwardRun: run });
}
