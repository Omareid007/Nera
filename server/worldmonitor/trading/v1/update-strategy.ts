import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy, storeStrategy } from './trading-store';

export async function updateStrategy(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const id = body.id as string | undefined;
  if (!id) return errorResponse('id is required');

  const existing = await getStrategy(id);
  if (!existing) return errorResponse('Strategy not found', 404);

  // Allowed updates
  if (body.name !== undefined) existing.name = String(body.name);
  if (body.description !== undefined) existing.description = String(body.description);
  if (body.parameters !== undefined) existing.parameters = body.parameters as Record<string, unknown>;
  if (body.universe !== undefined && Array.isArray(body.universe)) {
    existing.universe = (body.universe as string[]).map((s) => String(s).toUpperCase());
  }
  if (body.riskLimits !== undefined) existing.riskLimits = body.riskLimits as typeof existing.riskLimits;
  if (body.status !== undefined) existing.status = body.status as typeof existing.status;
  if (body.frequency !== undefined) existing.frequency = String(body.frequency);

  existing.updatedAt = Date.now();
  await storeStrategy(existing);

  return jsonResponse({ strategy: existing });
}
