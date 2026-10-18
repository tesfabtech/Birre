
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatPercentage,
  formatRemainingAllocation,
} from './allocation-plan-utils';

interface AllocationPlanSummaryProps {
  totalHundredths: number;
  activeBucketCount: number;
  hasInvalidPercentage: boolean;
}

export default function AllocationPlanSummary({
  totalHundredths,
  activeBucketCount,
  hasInvalidPercentage,
}: AllocationPlanSummaryProps) {
  const remaining = 10000 - totalHundredths;
  const isValid = !hasInvalidPercentage && remaining === 0;

  const progress = Math.min(totalHundredths / 10000, 1);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>Income allocation</Text>
          <Text style={styles.subtitle}>
            Distribute regular income across your active buckets.
          </Text>
        </View>

        <Text style={[styles.total, isValid ? styles.valid : styles.invalid]}>
          {formatPercentage(totalHundredths)}%
        </Text>
      </View>

      <View style={styles.progressBackground}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
            },
            isValid && styles.progressComplete,
          ]}
        />
      </View>

      <Text style={[styles.message, isValid && styles.valid]}>
        {hasInvalidPercentage
          ? 'Enter valid percentages between 0 and 100, using up to two decimal places.'
          : formatRemainingAllocation(remaining)}
      </Text>

      <Text style={styles.bucketCount}>
        {activeBucketCount} active allocation bucket
        {activeBucketCount === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    maxWidth: 230,
  },
  total: {
    fontSize: 22,
    fontWeight: '700',
  },
  valid: {
    color: '#15803D',
  },
  invalid: {
    color: '#B45309',
  },
  progressBackground: {
    height: 8,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: 8,
  },
  progressComplete: {
    backgroundColor: '#16A34A',
  },
  message: {
    marginTop: 10,
    fontSize: 13,
    color: '#B45309',
  },
  bucketCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
});
