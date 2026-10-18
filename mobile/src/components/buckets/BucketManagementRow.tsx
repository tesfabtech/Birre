import React from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AllocationPlanBucket } from '../../types/allocation-plan';

interface BucketManagementRowProps {
  bucket: AllocationPlanBucket;
  onPercentageChange: (bucketId: string, percentage: string) => void;
  onToggle: (bucketId: string, enabled: boolean) => void;
  disabled?: boolean;
}

const RECOMMENDED_BUCKET_TYPES = [
  'ESSENTIAL',
  'EMERGENCY',
  'INVESTMENT',
  'FLEXIBLE',
  'BUFFER',
] as const;

export default function BucketManagementRow({
  bucket,
  onPercentageChange,
  onToggle,
  disabled = false,
}: BucketManagementRowProps) {
  const isUnallocated = bucket.type === 'UNALLOCATED';

  const isRecommended = RECOMMENDED_BUCKET_TYPES.some(
    type => type === bucket.type,
  );

  const canToggle = isRecommended && !isUnallocated;
  const isEnabled = bucket.isActive;

  return (
    <View
      style={[
        styles.container,
        !isEnabled && styles.inactiveContainer,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketName}>{bucket.name}</Text>

          <Text style={styles.bucketDescription}>
            {isUnallocated
              ? 'Receives occasional income'
              : isRecommended
                ? 'Recommended bucket'
                : 'Bucket'}
          </Text>
        </View>

        {canToggle && (
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>
              {isEnabled ? 'On' : 'Off'}
            </Text>

            <Switch
              value={isEnabled}
              onValueChange={enabled => onToggle(bucket.id, enabled)}
              disabled={disabled}
              accessibilityLabel={`Enable ${bucket.name}`}
            />
          </View>
        )}
      </View>

      {!isUnallocated && (
        <View style={styles.percentageRow}>
          <Text style={styles.percentageLabel}>Allocation</Text>

          <View
            style={[
              styles.inputContainer,
              (!isEnabled || disabled) && styles.disabledInputContainer,
            ]}
          >
            <TextInput
              style={[
                styles.percentageInput,
                (!isEnabled || disabled) && styles.disabledInput,
              ]}
              value={bucket.percentage ?? '0'}
              onChangeText={value =>
                onPercentageChange(bucket.id, value)
              }
              keyboardType="decimal-pad"
              editable={isEnabled && !disabled}
              selectTextOnFocus
              maxLength={6}
              accessibilityLabel={`${bucket.name} allocation percentage`}
            />

            <Text style={styles.percentSymbol}>%</Text>
          </View>
        </View>
      )}

      {!isEnabled && (
        <Text style={styles.inactiveMessage}>
          This bucket is off and will not be available for future
          allocations.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  inactiveContainer: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bucketDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#374151',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  percentageLabel: {
    fontSize: 14,
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  disabledInputContainer: {
    backgroundColor: '#F3F4F6',
  },
  percentageInput: {
    minWidth: 48,
    paddingVertical: 7,
    textAlign: 'right',
    fontSize: 15,
    color: '#111827',
  },
  disabledInput: {
    color: '#9CA3AF',
  },
  percentSymbol: {
    marginLeft: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  inactiveMessage: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },
});