
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  calculateAllocationTotal,
  isValidPercentage,
} from './allocation-plan-utils';

import {
  getCurrentAllocationPlan,
  updateCurrentAllocationPlan,
} from '../../services/allocation-plan-service';

import type {
  AllocationPlanBucket,
  CurrentAllocationPlan,
} from '../../types/allocation-plan';

interface UseAllocationPlanEditorOptions {
  onSaved?: () => void;
}

function normalizeBuckets(
  buckets: AllocationPlanBucket[],
): AllocationPlanBucket[] {
  return buckets.map(bucket => ({
    ...bucket,
    percentage:
      bucket.type === 'UNALLOCATED'
        ? null
        : bucket.percentage ?? '0',
  }));
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error ? error.message : fallback;
}

export default function useAllocationPlanEditor({
  onSaved,
}: UseAllocationPlanEditorOptions = {}) {
  const [plan, setPlan] = useState<CurrentAllocationPlan | null>(null);
  const [buckets, setBuckets] = useState<AllocationPlanBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const result = await getCurrentAllocationPlan();

      setPlan(result);
      setBuckets(normalizeBuckets(result.buckets));
    } catch (err) {
      setError(
        getErrorMessage(err, 'Could not load the allocation plan.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const activeBuckets = useMemo(
    () => buckets.filter(bucket => bucket.isActive),
    [buckets],
  );

  const allocatableBuckets = useMemo(
    () =>
      activeBuckets.filter(
        bucket =>
          bucket.type !== 'UNALLOCATED' &&
          bucket.type !== 'CUSTOM',
      ),
    [activeBuckets],
  );

  const totalHundredths = useMemo(
    () =>
      calculateAllocationTotal(
        allocatableBuckets.map(bucket => bucket.percentage),
      ),
    [allocatableBuckets],
  );

  const hasInvalidPercentage = useMemo(
    () =>
      allocatableBuckets.some(
        bucket => !isValidPercentage(bucket.percentage ?? ''),
      ),
    [allocatableBuckets],
  );

  const isTotalValid =
    !hasInvalidPercentage &&
    allocatableBuckets.length > 0 &&
    totalHundredths === 10000;

  const handlePercentageChange = useCallback(
  (bucketId: string, percentage: string) => {
    const bucket = buckets.find(item => item.id === bucketId);

    if (
      !bucket ||
      !bucket.isActive ||
      bucket.type === 'UNALLOCATED' ||
      bucket.type === 'CUSTOM' ||
      saving
    ) {
      return;
    }

    setError('');
    setSuccess('');

    setBuckets(current =>
      current.map(item =>
        item.id === bucketId
          ? { ...item, percentage }
          : item,
      ),
    );
  },
  [buckets, saving],
);

  // Stage recommended-bucket changes locally.
  // The backend applies them together with allocation rules on Save.
  const handleToggleBucket = useCallback(
    (bucketId: string, enabled: boolean) => {
      const bucket = buckets.find(item => item.id === bucketId);

      if (
        !bucket ||
        bucket.type === 'UNALLOCATED' ||
        bucket.type === 'CUSTOM' ||
        saving
      ) {
        return;
      }

      if (bucket.isActive === enabled) {
        return;
      }

      setError('');
      setSuccess('');

      setBuckets(current =>
        current.map(item =>
          item.id === bucketId
            ? { ...item, isActive: enabled }
            : item,
        ),
      );
    },
    [buckets, saving],
  );

  const handleSave = useCallback(async () => {
    if (!plan) {
      setError('No allocation plan is loaded.');
      return;
    }

    if (saving) {
      return;
    }

    const enabledBuckets = buckets.filter(
      bucket =>
        bucket.isActive &&
        bucket.type !== 'UNALLOCATED' &&
        bucket.type !== 'CUSTOM',
    );

    if (enabledBuckets.length === 0) {
      setError('Keep at least one allocation bucket active.');
      return;
    }

    const invalidBucket = enabledBuckets.find(
      bucket => !isValidPercentage(bucket.percentage ?? ''),
    );

    if (invalidBucket) {
      setError(
        `Enter a valid percentage between 0 and 100 for "${invalidBucket.name}".`,
      );
      return;
    }

    const total = calculateAllocationTotal(
      enabledBuckets.map(bucket => bucket.percentage),
    );

    if (total !== 10000) {
      const currentTotal = (total / 100)
        .toFixed(2)
        .replace(/\.?0+$/, '');

      setError(
        `Your active allocation percentages must total exactly 100%. Current total: ${currentTotal}%.`,
      );
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateCurrentAllocationPlan({
        activeBucketIds: enabledBuckets.map(bucket => bucket.id),
        rules: enabledBuckets.map(bucket => ({
          bucketId: bucket.id,
          percentage: Number(bucket.percentage ?? '0').toFixed(2),
        })),
      });

      setPlan(result.plan);
      setBuckets(normalizeBuckets(result.plan.buckets));
      setSuccess('Your allocation plan has been saved successfully.');

      onSaved?.();
    } catch (err) {
      setError(
        getErrorMessage(err, 'Could not save your allocation plan.'),
      );
    } finally {
      setSaving(false);
    }
  }, [buckets, onSaved, plan, saving]);

  return {
    plan,
    buckets,
    loading,
    saving,
    error,
    success,
    activeBuckets,
    allocatableBuckets,
    totalHundredths,
    hasInvalidPercentage,
    isTotalValid,
    loadPlan,
    handlePercentageChange,
    handleToggleBucket,
    handleSave,
  };
}
