export function toHundredths(
  value: string | number | null | undefined,
): number {
  const parsed = Number(value ?? '0');

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.round(parsed * 100);
}

export function formatPercentage(value: number): string {
  return (value / 100).toFixed(2).replace(/\.?0+$/, '');
}

export function isValidPercentage(value: string): boolean {
  const trimmed = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return false;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}

export function calculateAllocationTotal(
  percentages: Array<string | null | undefined>,
  additionalPercentage?: string | null,
): number {
  const total = percentages.reduce(
    (sum, percentage) => sum + toHundredths(percentage),
    0,
  );

  return total + toHundredths(additionalPercentage);
}

export function formatRemainingAllocation(
  remainingHundredths: number,
): string {
  if (remainingHundredths === 0) {
    return 'Your allocations add up to 100%.';
  }

  if (remainingHundredths > 0) {
    return `${formatPercentage(remainingHundredths)}% left to allocate.`;
  }

  return `${formatPercentage(Math.abs(remainingHundredths))}% over the limit.`;
}