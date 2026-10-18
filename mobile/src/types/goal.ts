
import type { BucketType } from './bucket';

export interface GoalBucket {
  id: string;
  name: string;
  type: BucketType;
  isActive: boolean;
}

export interface Goal {
  id: string;
  name: string;
  bucketId: string;
  bucket: GoalBucket;
  targetAmount: string;
  targetDate: string | null;
  isActive: boolean;
  savedAmount: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  name: string;
  bucketId: string;
  targetAmount: string;
  targetDate: string | null;
}

export interface GoalBucketOption extends GoalBucket {
  balance: string;
}
