export type BucketType =
  | 'ESSENTIAL'
  | 'EMERGENCY'
  | 'INVESTMENT'
  | 'FLEXIBLE'
  | 'BUFFER'
  | 'UNALLOCATED'
  | 'CUSTOM';

export const BUCKET_TYPES: {
  value: BucketType;
  label: string;
}[] = [
  { value: 'ESSENTIAL', label: 'Essential' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'BUFFER', label: 'Buffer' },
  { value: 'UNALLOCATED', label: 'Unallocated' },
];

export interface Bucket {
  id: string;
  name: string;
  type: BucketType;
  isActive: boolean;
  createdAt: string;
  allocatedBalance: string;
  currentBalance: string;
  balance: string;
}