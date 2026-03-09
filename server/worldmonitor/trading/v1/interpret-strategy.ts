/**
 * interpret-strategy RPC — AI-powered strategy analysis.
 *
 * Uses the existing LLM router to generate a structured interpretation
 * of a strategy's logic, strengths, risks, and market conditions.
 * Stores result as an AiEvent in Redis.
 */

import { parseBody, jsonResponse, errorResponse } from './handler';
import { getStrategy, storeAiEvent } from './trading-store';
import { generateId } from './_shared';
import { callLlm } from '../../../_shared/llm';
import type { AiEvent } from './types';

interface Interpretation {
  summary: string;
  strengths: string[];
  risks: string[];
  market_conditions: string;
  confidence: number;
}

function buildPrompt(strategy: {
  name: string;
  templateId: string;
  parameters: Record<string, unknown>;
  universe: string[];
  riskLimits: {
    stopLossPct: number;
    takeProfitPct: number;
    maxDrawdownPct: number;
    maxPositionPct: number;
    maxExposurePct: number;
    maxPositions: number;
  };
  frequency: string;
  description: string;
}): string {
  const params = Object.entries(strategy.parameters)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ');

  return [
    `Analyze this trading strategy and respond with JSON only (no markdown, no code fences):`,
    `{"summary":"2-3 sentence overview","strengths":["s1","s2","s3"],"risks":["r1","r2","r3"],"market_conditions":"When this strategy works best","confidence":0-100}`,
    ``,
    `Strategy: ${strategy.name}`,
    `Template: ${strategy.templateId}`,
    `Description: ${strategy.description || 'None'}`,
    `Parameters: ${params}`,
    `Universe: ${strategy.universe.join(', ')}`,
    `Frequency: ${strategy.frequency}`,
    `Risk limits: stopLoss=${strategy.riskLimits.stopLossPct}%, takeProfit=${strategy.riskLimits.takeProfitPct}%, maxDD=${strategy.riskLimits.maxDrawdownPct}%, maxPosition=${strategy.riskLimits.maxPositionPct}%, maxExposure=${strategy.riskLimits.maxExposurePct}%, maxPositions=${strategy.riskLimits.maxPositions}`,
  ].join('\n');
}

function fallbackInterpretation(strategyName: string): Interpretation {
  return {
    summary: `Strategy "${strategyName}" could not be analyzed by AI at this time. All LLM providers are currently unavailable.`,
    strengths: [
      'Strategy parameters are within defined bounds',
      'Risk limits are configured',
      'Universe symbols are specified',
    ],
    risks: [
      'AI analysis unavailable — manual review recommended',
      'Market conditions not assessed',
      'Parameter optimization not evaluated',
    ],
    market_conditions: 'Unable to assess — AI providers offline',
    confidence: 0,
  };
}

function parseInterpretation(content: string): Interpretation | null {
  try {
    // Try to extract JSON from potential markdown fences
    let json = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) json = fenceMatch[1].trim();

    const parsed = JSON.parse(json) as Partial<Interpretation>;
    if (
      typeof parsed.summary === 'string' &&
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.risks) &&
      typeof parsed.market_conditions === 'string' &&
      typeof parsed.confidence === 'number'
    ) {
      return {
        summary: parsed.summary,
        strengths: parsed.strengths.slice(0, 5).map(String),
        risks: parsed.risks.slice(0, 5).map(String),
        market_conditions: parsed.market_conditions,
        confidence: Math.max(0, Math.min(100, Math.round(parsed.confidence))),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function interpretStrategy(req: Request): Promise<Response> {
  const body = await parseBody(req);
  const strategyId = body.strategyId as string | undefined;
  if (!strategyId) return errorResponse('strategyId is required');

  const strategy = await getStrategy(strategyId);
  if (!strategy) return errorResponse('Strategy not found', 404);

  const userPrompt = buildPrompt(strategy);
  const systemPrompt = 'You are a quantitative strategy analyst. Respond only with valid JSON. No markdown fences, no commentary.';

  const llmResult = await callLlm({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 2000,
    timeoutMs: 25_000,
    validate: (content) => parseInterpretation(content) !== null,
  });

  let interpretation: Interpretation;
  let provider = 'none';
  let model = 'none';
  let totalTokens = 0;

  if (llmResult) {
    const parsed = parseInterpretation(llmResult.content);
    interpretation = parsed ?? fallbackInterpretation(strategy.name);
    provider = llmResult.provider;
    model = llmResult.model;
    totalTokens = llmResult.tokens;
  } else {
    interpretation = fallbackInterpretation(strategy.name);
  }

  const aiEvent: AiEvent = {
    id: generateId(),
    type: 'strategy_interpretation',
    strategyId: strategy.id,
    provider,
    model,
    promptTemplate: 'interpret-strategy-v1',
    tokenUsage: { prompt: 0, completion: 0, total: totalTokens },
    costEstimate: null,
    input: `Strategy: ${strategy.name} (${strategy.templateId})`,
    output: JSON.stringify(interpretation),
    timestamp: Date.now(),
  };

  await storeAiEvent(aiEvent);

  return jsonResponse({
    aiEvent,
    interpretation,
    llmAvailable: provider !== 'none',
  });
}
