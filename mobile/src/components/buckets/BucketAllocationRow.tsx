
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import type { AllocationPlanBucket } from '@/types/allocation-plan';

interface BucketAllocationRowProps {
  bucket: AllocationPlanBucket;
  onPercentageChange: (bucketId: string, percentage: string) => void;
}

export default function BucketAllocationRow({
  bucket,
  onPercentageChange,
}: BucketAllocationRowProps) {
  const isUnallocated = bucket.type === 'UNALLOCATED';

  return (
    <View style={styles.container}>
      <View style={styles.bucketIcon}>
        <Ionicons
          name={isUnallocated ? 'layers-outline' : 'wallet-outline'}
          size={21}
          color={isUnallocated ? Colors.textSecondary : Colors.primary}
        />
      </View>

      <View style={styles.bucketInfo}>
        <Text style={styles.bucketName}>{bucket.name}</Text>
        <Text style={styles.bucketType}>
          {isUnallocated
            ? 'Money not assigned to a bucket'
            : bucket.type === 'CUSTOM'
              ? 'Custom bucket'
              : 'Recommended bucket'}
        </Text>
      </View>

      {isUnallocated ? (
        <View style={styles.unallocatedBadge}>
          <Ionicons
            name="lock-closed-outline"
            size={12}
            color={Colors.textSecondary}
          />
          <Text style={styles.unallocatedText}>Separate</Text>
        </View>
      ) : (
        <View style={styles.percentageContainer}>
          <TextInput
            style={styles.percentageInput}
            value={bucket.percentage ?? '0'}
            onChangeText={value => onPercentageChange(bucket.id, value)}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={Colors.textSecondary}
            maxLength={6}
            selectTextOnFocus
            accessibilityLabel={`${bucket.name} allocation percentage`}
          />
          <Text style={styles.percentSymbol}>%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bucketIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A12',
    marginRight: 12,
  },
  bucketInfo: {
    flex: 1,
    paddingRight: 8,
  },
  bucketName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  bucketType: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageInput: {
    width: 66,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  percentSymbol: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 5,
  },
  unallocatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#6B72800D',
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 9,
  },
  unallocatedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
