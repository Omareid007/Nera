import { jsonResponse } from './handler';
import { ALGORITHM_TEMPLATES } from './strategy-templates';

export async function listTemplates(_req: Request): Promise<Response> {
  return jsonResponse({ templates: ALGORITHM_TEMPLATES });
}
