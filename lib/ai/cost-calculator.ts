/**
 * Cost Calculation Service
 * Calculates token costs and tracks extraction expenses
 * Reference: docs/specs/81_AI_Cost_Optimization.md Section 6.2
 */

export interface CostCalculation {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelPricing {
  input: number; // Cost per 1M input tokens
  output: number; // Cost per 1M output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { input: 2.00, output: 8.00 },
  'gpt-4o-mini': { input: 0.40, output: 1.60 },
};

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4o'
): CostCalculation {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: roundToDecimals(inputCost, 6),
    outputCost: roundToDecimals(outputCost, 6),
    totalCost: roundToDecimals(totalCost, 6),
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

/**
 * Estimate tokens from text (approximate)
 * Uses rule of thumb: ~0.75 tokens per word, ~1.3 tokens per word for English
 * More accurate: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // Method 1: Character-based (more accurate for code/structured text)
  const charBased = Math.ceil(text.length / 4);
  
  // Method 2: Word-based (more accurate for natural language)
  const words = text.trim().split(/\s+/).length;
  const wordBased = Math.ceil(words * 1.3);
  
  // Use average of both methods for better accuracy
  return Math.ceil((charBased + wordBased) / 2);
}

/**
 * Estimate tokens for JSON structure
 */
export function estimateJSONTokens(json: any): number {
  const jsonString = JSON.stringify(json);
  return estimateTokens(jsonString);
}

/**
 * Check if document fits in token budget
 */
export interface TokenBudgetCheck {
  fits: boolean;
  availableTokens: number;
  documentTokens: number;
  recommendation: string;
}

export function checkTokenBudget(
  documentTokens: number,
  maxTokens: number = 800_000,
  safetyBuffer: number = 10_000
): TokenBudgetCheck {
  const available = maxTokens - safetyBuffer;
  const fits = documentTokens <= available;

  let recommendation: string;
  if (fits) {
    recommendation = 'Process normally';
  } else if (documentTokens <= available * 2) {
    recommendation = 'Split into 2 segments';
  } else {
    const segmentsNeeded = Math.ceil(documentTokens / available);
    recommendation = `Split into ${segmentsNeeded} segments`;
  }

  return {
    fits,
    availableTokens: available,
    documentTokens,
    recommendation,
  };
}

/**
 * Round to specified decimal places
 */
function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculate cost savings from rule library hits
 */
export function calculateRuleLibrarySavings(
  libraryHits: number,
  avgTokensPerSegment: number = 50_000,
  model: 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4o'
): number {
  const pricing = MODEL_PRICING[model];
  const avgCostPerSegment = (avgTokensPerSegment / 1_000_000) * (pricing.input + pricing.output * 0.1);
  return libraryHits * avgCostPerSegment;
}

