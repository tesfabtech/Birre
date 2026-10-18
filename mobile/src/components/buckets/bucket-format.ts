import type { Bucket, BucketType } from '../../types/bucket';
import { BUCKET_TYPES } from '../../types/bucket';

export function formatMoney(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0.00';
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getAllocatedBalance(bucket: Bucket): string {
  return bucket.allocatedBalance ?? '0';
}

export function getCurrentBalance(bucket: Bucket): string {
  return bucket.currentBalance ?? bucket.balance ?? '0';
}

export function formatType(type: BucketType): string {
  return (
    BUCKET_TYPES.find((item) => item.value === type)?.label ?? type
  );
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}