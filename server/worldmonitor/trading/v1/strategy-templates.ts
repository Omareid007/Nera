/**
 * Declarative algorithm template definitions.
 * Each template specifies parameters, presets, and default risk limits.
 */

import type { AlgorithmTemplate, RiskLimits } from './types';

const DEFAULT_RISK: RiskLimits = {
  maxPositionPct: 20,
  maxDrawdownPct: 15,
  stopLossPct: 5,
  takeProfitPct: 10,
  maxExposurePct: 100,
  maxPositions: 10,
};

export const ALGORITHM_TEMPLATES: AlgorithmTemplate[] = [
  {
    id: 'momentum',
    name: 'Momentum',
    description: 'Buy assets showing strong upward price movement. Ride trends and exit when momentum fades.',
    difficulty: 'Beginner',
    useCase: 'Best for trending markets with strong directional moves',
    fields: [
      { key: 'lookbackPeriod', label: 'Lookback Period', type: 'number', description: 'Number of days to measure momentum', default: 20, min: 10, max: 60, step: 5 },
      { key: 'momentumThreshold', label: 'Momentum Threshold (%)', type: 'number', description: 'Minimum return % to trigger entry', default: 5, min: 1, max: 30, step: 0.5 },
      { key: 'volumeConfirm', label: 'Volume Confirmation', type: 'boolean', description: 'Require above-average volume for entry', default: true },
      { key: 'rebalanceFreq', label: 'Rebalance Frequency', type: 'select', description: 'How often to re-evaluate positions', default: 'weekly', options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }] },
      { key: 'holdingPeriod', label: 'Max Holding Period (days)', type: 'number', description: 'Maximum days to hold a position', default: 30, min: 5, max: 90, step: 5, advanced: true },
      { key: 'topN', label: 'Top N Picks', type: 'number', description: 'Number of top momentum stocks to hold', default: 5, min: 1, max: 20, step: 1, advanced: true },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Longer lookback, higher threshold, fewer positions', values: { lookbackPeriod: 40, momentumThreshold: 8, volumeConfirm: true, rebalanceFreq: 'monthly', holdingPeriod: 60, topN: 3 } },
      { id: 'balanced', label: 'Balanced', description: 'Moderate parameters for balanced risk/reward', values: { lookbackPeriod: 20, momentumThreshold: 5, volumeConfirm: true, rebalanceFreq: 'weekly', holdingPeriod: 30, topN: 5 } },
      { id: 'aggressive', label: 'Aggressive', description: 'Shorter lookback, lower threshold, more positions', values: { lookbackPeriod: 10, momentumThreshold: 3, volumeConfirm: false, rebalanceFreq: 'daily', holdingPeriod: 15, topN: 10 } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 20, stopLossPct: 5, takeProfitPct: 15 },
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Buy undervalued assets and sell overvalued ones, expecting prices to revert to their historical average.',
    difficulty: 'Intermediate',
    useCase: 'Best for range-bound markets with mean-reverting behavior',
    fields: [
      { key: 'lookbackPeriod', label: 'Lookback Period', type: 'number', description: 'Window for computing mean', default: 20, min: 10, max: 60, step: 5 },
      { key: 'entryZScore', label: 'Entry Z-Score', type: 'number', description: 'Z-score threshold to enter (e.g. -2 for oversold)', default: -2, min: -3, max: -0.5, step: 0.25 },
      { key: 'exitZScore', label: 'Exit Z-Score', type: 'number', description: 'Z-score threshold to exit (near zero = near mean)', default: 0, min: -0.5, max: 1, step: 0.25 },
      { key: 'holdingPeriod', label: 'Max Holding Period (days)', type: 'number', description: 'Maximum days before forced exit', default: 15, min: 3, max: 30, step: 1 },
      { key: 'useRsi', label: 'RSI Confirmation', type: 'boolean', description: 'Also require RSI oversold/overbought for entry', default: false, advanced: true },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Wider Z-score, shorter hold', values: { lookbackPeriod: 30, entryZScore: -2.5, exitZScore: -0.25, holdingPeriod: 10, useRsi: true } },
      { id: 'balanced', label: 'Balanced', description: 'Standard mean reversion parameters', values: { lookbackPeriod: 20, entryZScore: -2, exitZScore: 0, holdingPeriod: 15, useRsi: false } },
      { id: 'aggressive', label: 'Aggressive', description: 'Tighter Z-score, longer hold', values: { lookbackPeriod: 14, entryZScore: -1.5, exitZScore: 0.25, holdingPeriod: 20, useRsi: false } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 15, stopLossPct: 7, takeProfitPct: 8 },
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Enter positions when price breaks through consolidation levels with volume confirmation.',
    difficulty: 'Intermediate',
    useCase: 'Best for volatile markets with clear support/resistance levels',
    fields: [
      { key: 'consolidationPeriod', label: 'Consolidation Period', type: 'number', description: 'Days of consolidation to watch', default: 15, min: 5, max: 30, step: 1 },
      { key: 'breakoutThreshold', label: 'Breakout Threshold (%)', type: 'number', description: 'Price must exceed this % above resistance', default: 2, min: 0.5, max: 10, step: 0.5 },
      { key: 'volumeSurge', label: 'Volume Surge Multiplier', type: 'number', description: 'Volume must exceed average by this multiple', default: 1.5, min: 1, max: 5, step: 0.25 },
      { key: 'atrStopMultiplier', label: 'ATR Stop Multiplier', type: 'number', description: 'Stop loss at X times ATR below entry', default: 2, min: 1, max: 5, step: 0.5, advanced: true },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Wider breakout threshold, tight stops', values: { consolidationPeriod: 20, breakoutThreshold: 3, volumeSurge: 2, atrStopMultiplier: 1.5 } },
      { id: 'balanced', label: 'Balanced', description: 'Standard breakout parameters', values: { consolidationPeriod: 15, breakoutThreshold: 2, volumeSurge: 1.5, atrStopMultiplier: 2 } },
      { id: 'aggressive', label: 'Aggressive', description: 'Lower threshold, wider stops', values: { consolidationPeriod: 10, breakoutThreshold: 1, volumeSurge: 1.2, atrStopMultiplier: 3 } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 15, stopLossPct: 5, takeProfitPct: 12 },
  },
  {
    id: 'trend_following',
    name: 'Trend Following',
    description: 'Follow established trends using moving average crossovers and trailing stops.',
    difficulty: 'Beginner',
    useCase: 'Best for extended market trends across multiple timeframes',
    fields: [
      { key: 'fastMa', label: 'Fast MA Period', type: 'number', description: 'Short moving average window', default: 10, min: 5, max: 20, step: 1 },
      { key: 'slowMa', label: 'Slow MA Period', type: 'number', description: 'Long moving average window', default: 50, min: 20, max: 200, step: 5 },
      { key: 'signalBars', label: 'Signal Confirmation (bars)', type: 'number', description: 'Bars above/below to confirm crossover', default: 2, min: 1, max: 5, step: 1 },
      { key: 'trailingStopPct', label: 'Trailing Stop (%)', type: 'number', description: 'Trailing stop as % below peak', default: 5, min: 1, max: 15, step: 0.5 },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Longer MAs, tighter trailing stop', values: { fastMa: 20, slowMa: 100, signalBars: 3, trailingStopPct: 3 } },
      { id: 'balanced', label: 'Balanced', description: 'Classic trend following setup', values: { fastMa: 10, slowMa: 50, signalBars: 2, trailingStopPct: 5 } },
      { id: 'aggressive', label: 'Aggressive', description: 'Shorter MAs, wider stops', values: { fastMa: 5, slowMa: 20, signalBars: 1, trailingStopPct: 8 } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 25, stopLossPct: 8, takeProfitPct: 20 },
  },
  {
    id: 'etf_rotation',
    name: 'ETF Rotation',
    description: 'Rotate between ETFs based on relative momentum, shifting capital to the strongest performers.',
    difficulty: 'Beginner',
    useCase: 'Best for passive-style allocation with systematic rebalancing',
    fields: [
      { key: 'momentumWindow', label: 'Momentum Window (days)', type: 'number', description: 'Period to measure ETF momentum', default: 60, min: 20, max: 120, step: 10 },
      { key: 'topN', label: 'Top N ETFs', type: 'number', description: 'Number of top-performing ETFs to hold', default: 3, min: 1, max: 10, step: 1 },
      { key: 'rebalanceFreq', label: 'Rebalance Frequency', type: 'select', description: 'How often to rotate', default: 'monthly', options: [{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }] },
      { key: 'cashFilter', label: 'Cash Filter', type: 'boolean', description: 'Move to cash if no ETF has positive momentum', default: true },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Longer window, fewer ETFs, quarterly rotation', values: { momentumWindow: 90, topN: 2, rebalanceFreq: 'quarterly', cashFilter: true } },
      { id: 'balanced', label: 'Balanced', description: 'Standard ETF rotation', values: { momentumWindow: 60, topN: 3, rebalanceFreq: 'monthly', cashFilter: true } },
      { id: 'aggressive', label: 'Aggressive', description: 'Shorter window, more ETFs, weekly rotation', values: { momentumWindow: 30, topN: 5, rebalanceFreq: 'weekly', cashFilter: false } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 40, stopLossPct: 10, takeProfitPct: 25, maxPositions: 5 },
  },
  {
    id: 'sector_rotation',
    name: 'Sector Rotation',
    description: 'Rotate between market sectors based on relative strength and economic cycle positioning.',
    difficulty: 'Intermediate',
    useCase: 'Best for capturing sector-level trends driven by macro factors',
    fields: [
      { key: 'momentumWindow', label: 'Sector Momentum Window', type: 'number', description: 'Days to measure sector performance', default: 30, min: 14, max: 90, step: 7 },
      { key: 'relativeStrength', label: 'Relative Strength Threshold', type: 'number', description: 'Minimum RS ratio vs benchmark', default: 1.05, min: 1.0, max: 1.3, step: 0.05 },
      { key: 'rotationFreq', label: 'Rotation Frequency', type: 'select', description: 'How often to rotate sectors', default: 'monthly', options: [{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }] },
      { key: 'topSectors', label: 'Top N Sectors', type: 'number', description: 'Number of top sectors to hold', default: 3, min: 1, max: 5, step: 1, advanced: true },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Longer window, higher RS threshold', values: { momentumWindow: 60, relativeStrength: 1.1, rotationFreq: 'monthly', topSectors: 2 } },
      { id: 'balanced', label: 'Balanced', description: 'Standard sector rotation', values: { momentumWindow: 30, relativeStrength: 1.05, rotationFreq: 'monthly', topSectors: 3 } },
      { id: 'aggressive', label: 'Aggressive', description: 'Shorter window, weekly rotation', values: { momentumWindow: 14, relativeStrength: 1.0, rotationFreq: 'weekly', topSectors: 4 } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 35, stopLossPct: 8, takeProfitPct: 18, maxPositions: 5 },
  },
  {
    id: 'event_driven',
    name: 'Event-Driven',
    description: 'Trade based on news events, earnings, or geopolitical catalysts with sentiment analysis.',
    difficulty: 'Advanced',
    useCase: 'Best for capitalizing on market-moving events and catalysts',
    fields: [
      { key: 'eventTypes', label: 'Event Types', type: 'select', description: 'Types of events to track', default: 'earnings', options: [{ value: 'earnings', label: 'Earnings' }, { value: 'news', label: 'Major News' }, { value: 'geopolitical', label: 'Geopolitical' }, { value: 'all', label: 'All Events' }] },
      { key: 'reactionWindow', label: 'Reaction Window (hours)', type: 'number', description: 'Hours after event to enter trade', default: 4, min: 1, max: 48, step: 1 },
      { key: 'sentimentThreshold', label: 'Sentiment Threshold', type: 'number', description: 'Minimum sentiment score for entry (0-100)', default: 70, min: 50, max: 95, step: 5 },
      { key: 'holdingPeriod', label: 'Holding Period (days)', type: 'number', description: 'Days to hold event-driven positions', default: 5, min: 1, max: 20, step: 1, advanced: true },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'High sentiment threshold, shorter hold', values: { eventTypes: 'earnings', reactionWindow: 2, sentimentThreshold: 85, holdingPeriod: 3 } },
      { id: 'balanced', label: 'Balanced', description: 'Standard event-driven parameters', values: { eventTypes: 'all', reactionWindow: 4, sentimentThreshold: 70, holdingPeriod: 5 } },
      { id: 'aggressive', label: 'Aggressive', description: 'Lower threshold, longer reaction window', values: { eventTypes: 'all', reactionWindow: 8, sentimentThreshold: 55, holdingPeriod: 10 } },
    ],
    defaultRiskLimits: { ...DEFAULT_RISK, maxPositionPct: 10, stopLossPct: 3, takeProfitPct: 8, maxPositions: 15 },
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Build your own strategy from scratch using available technical indicators and rules.',
    difficulty: 'Advanced',
    useCase: 'For experienced traders who want full control over strategy logic',
    fields: [
      { key: 'entryIndicator', label: 'Entry Indicator', type: 'select', description: 'Technical indicator for entry signal', default: 'ma_crossover', options: [{ value: 'ma_crossover', label: 'MA Crossover' }, { value: 'rsi', label: 'RSI' }, { value: 'macd', label: 'MACD' }, { value: 'breakout', label: 'Price Breakout' }] },
      { key: 'exitIndicator', label: 'Exit Indicator', type: 'select', description: 'Technical indicator for exit signal', default: 'trailing_stop', options: [{ value: 'trailing_stop', label: 'Trailing Stop' }, { value: 'ma_crossover', label: 'MA Crossover' }, { value: 'rsi', label: 'RSI' }, { value: 'fixed_target', label: 'Fixed Target' }] },
      { key: 'entryThreshold', label: 'Entry Threshold', type: 'number', description: 'Threshold value for entry signal', default: 30, min: 0, max: 100, step: 5 },
      { key: 'exitThreshold', label: 'Exit Threshold', type: 'number', description: 'Threshold value for exit signal', default: 70, min: 0, max: 100, step: 5 },
      { key: 'frequency', label: 'Evaluation Frequency', type: 'select', description: 'How often to check signals', default: 'daily', options: [{ value: '1h', label: 'Hourly' }, { value: '4h', label: '4-Hour' }, { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }] },
    ],
    presets: [
      { id: 'conservative', label: 'Conservative', description: 'Safe custom defaults', values: { entryIndicator: 'ma_crossover', exitIndicator: 'trailing_stop', entryThreshold: 20, exitThreshold: 80, frequency: 'daily' } },
      { id: 'balanced', label: 'Balanced', description: 'Balanced custom defaults', values: { entryIndicator: 'rsi', exitIndicator: 'rsi', entryThreshold: 30, exitThreshold: 70, frequency: 'daily' } },
      { id: 'aggressive', label: 'Aggressive', description: 'Aggressive custom defaults', values: { entryIndicator: 'macd', exitIndicator: 'fixed_target', entryThreshold: 40, exitThreshold: 60, frequency: '4h' } },
    ],
    defaultRiskLimits: DEFAULT_RISK,
  },
];

export function getTemplate(id: string): AlgorithmTemplate | undefined {
  return ALGORITHM_TEMPLATES.find((t) => t.id === id);
}
