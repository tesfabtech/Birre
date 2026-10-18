import type { BucketType } from './bucket';

export interface AllocationRule {
  id?: string;
  bucketId: string;
  percentage: string;
  bucket: {
    id: string;
    name: string;
    type: BucketType;
    isActive?: boolean;
  };
}

export interface AllocationPlan {
  id: string;
  userId?: string;
  name: string;
  createdAt?: string;
  rules: AllocationRule[];
}

export interface AllocationPlanBucket {
  id: string;
  name: string;
  type: BucketType;
  isActive: boolean;
  percentage: string | null;
  createdAt?: string;
}

export interface CurrentAllocationPlan {
  id: string;
  name: string;
  buckets: AllocationPlanBucket[];
}

export interface UpdateAllocationPlanRequest {
  activeBucketIds: string[];
  rules: {
    bucketId: string;
    percentage: string;
  }[];
}

export interface UpdateAllocationPlanResponse {
  message: string;
  plan: CurrentAllocationPlan;
}