import { parseBody, jsonResponse, errorResponse } from './handler';
import { storeStrategy } from './trading-store';
import { getTemplate } from './strategy-templates';
import { generateId, isValidSymbol } from './_shared';
import type { Strategy } from './types';

export async function createStrategy(req: Request): Promise<Response> {
  const body = await parseBody(req);

  const templateId = body.templateId as string | undefined;
  const name = body.name as string | undefined;
  const universe = body.universe as string[] | undefined;
  const parameters = body.parameters as Record<string, unknown> | undefined;

  if (!templateId || !name) {
    return errorResponse('templateId and name are required');
  }

  if (name.length > 200) return errorResponse('name must be 200 characters or fewer');
  const description = body.description as string | undefined;
  if (description && description.length > 2000) return errorResponse('description must be 2000 characters or fewer');

  const template = getTemplate(templateId);
  if (!template) {
    return errorResponse(`Unknown template: ${templateId}`);
  }

  if (!universe || !Array.isArray(universe) || universe.length === 0) {
    return errorResponse('universe must be a non-empty array of symbols');
  }
  if (universe.length > 30) {
    return errorResponse('universe must contain at most 30 symbols');
  }
  const invalidSymbols = universe.filter((s) => !isValidSymbol(String(s)));
  if (invalidSymbols.length > 0) {
    return errorResponse(`Invalid symbols: ${invalidSymbols.slice(0, 5).join(', ')}`);
  }

  // Merge defaults with provided parameters
  const defaultParams: Record<string, unknown> = {};
  for (const field of template.fields) {
    defaultParams[field.key] = field.default;
  }
  const mergedParams = { ...defaultParams, ...parameters };

  // Validate parameters against template field constraints
  for (const field of template.fields) {
    const val = mergedParams[field.key];
    if (field.type === 'number' && typeof val === 'number') {
      if (field.min !== undefined && val < field.min) {
        return errorResponse(`${field.key} must be >= ${field.min}`);
      }
      if (field.max !== undefined && val > field.max) {
        return errorResponse(`${field.key} must be <= ${field.max}`);
      }
    }
  }

  const riskLimits = body.riskLimits as Strategy['riskLimits'] | undefined;

  const strategy: Strategy = {
    id: generateId(),
    name,
    description: (body.description as string) || '',
    templateId: templateId as Strategy['templateId'],
    parameters: mergedParams,
    universe: universe.map((s) => String(s).toUpperCase()),
    riskLimits: riskLimits ?? template.defaultRiskLimits,
    frequency: (body.frequency as string) || 'daily',
    status: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await storeStrategy(strategy);
  } catch {
    return errorResponse('Failed to store strategy', 500);
  }

  return jsonResponse({ strategy });
}
