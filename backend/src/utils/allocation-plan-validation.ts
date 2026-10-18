import { Prisma } from '../generated/prisma/client.js';

export interface NormalizedAllocationRule {
  bucketId: string;
  percentageHundredths: number;
}

export interface SubmittedAllocationRule {
  bucketId: string;
  percentage: string | number;
}

/**
 * Converts a percentage into integer hundredths.
 *
 * Examples:
 * "50"   -> 5000
 * "12.5" -> 1250
 * "0.25" -> 25
 *
 * Returns null when the input is invalid.
 */
export function parsePercentage(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) {
    return null;
  }

  const number = Number(text);

  if (!Number.isFinite(number) || number < 0 || number > 100) {
    return null;
  }

  return Math.round(number * 100);
}

/**
 * Converts integer hundredths into a Prisma Decimal percentage.
 */
export function toPercentage(hundredths: number): Prisma.Decimal {
  return new Prisma.Decimal(hundredths).div(100);
}

/**
 * Formats integer hundredths as a percentage string.
 */
export function formatPercentage(hundredths: number): string {
  return (hundredths / 100).toFixed(2);
}

/**
 * Normalizes and validates the submitted allocation rules.
 */
export function normalizeAllocationRules(
  rules: unknown,
):
  | { valid: true; rules: NormalizedAllocationRule[] }
  | { valid: false; message: string } {
  if (!Array.isArray(rules)) {
    return {
      valid: false,
      message: 'A complete allocation rules array is required.',
    };
  }

  const seenIds = new Set<string>();
  const normalizedRules: NormalizedAllocationRule[] = [];

  for (const rule of rules) {
    if (
      !rule ||
      typeof rule.bucketId !== 'string' ||
      !rule.bucketId.trim()
    ) {
      return {
        valid: false,
        message: 'Every rule must contain a valid bucket ID.',
      };
    }

    const bucketId = rule.bucketId.trim();

    if (seenIds.has(bucketId)) {
      return {
        valid: false,
        message: 'Each bucket can appear only once.',
      };
    }

    const percentageHundredths = parsePercentage(rule.percentage);

    if (percentageHundredths === null) {
      return {
        valid: false,
        message:
          'Percentages must be between 0 and 100, with at most two decimal places.',
      };
    }

    seenIds.add(bucketId);

    normalizedRules.push({
      bucketId,
      percentageHundredths,
    });
  }

  return {
    valid: true,
    rules: normalizedRules,
  };
}

/**
 * Checks that the allocation percentages total exactly 100%.
 * Uses integer hundredths to avoid floating-point rounding errors.
 */
export function validateAllocationTotal(
  rules: NormalizedAllocationRule[],
):
  | { valid: true; totalHundredths: number }
  | { valid: false; totalHundredths: number; message: string } {
  const totalHundredths = rules.reduce(
    (total, rule) => total + rule.percentageHundredths,
    0,
  );

  if (totalHundredths !== 10000) {
    return {
      valid: false,
      totalHundredths,
      message: 'Allocation percentages must total exactly 100%.',
    };
  }

  return {
    valid: true,
    totalHundredths,
  };
}