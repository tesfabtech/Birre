import { apiRequest } from '../api';

import type {
  CurrentAllocationPlan,
  UpdateAllocationPlanRequest,
  UpdateAllocationPlanResponse,
} from '../types/allocation-plan';

export async function getCurrentAllocationPlan(): Promise<CurrentAllocationPlan> {
  return apiRequest<CurrentAllocationPlan>(
    '/allocation-plans/current',
    {
      method: 'GET',
    },
  );
}

export async function updateCurrentAllocationPlan(
  request: UpdateAllocationPlanRequest,
): Promise<UpdateAllocationPlanResponse> {
  return apiRequest<UpdateAllocationPlanResponse>(
    '/allocation-plans/current',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    },
  );
}

/**
 * Activate or deactivate an eligible predefined bucket.
 */
export async function updateBucketStatus(
  bucketId: string,
  isActive: boolean,
): Promise<void> {
  await apiRequest<unknown>(
    `/buckets/${encodeURIComponent(bucketId)}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    },
  );
}