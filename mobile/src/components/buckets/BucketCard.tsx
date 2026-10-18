import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Bucket } from '../../types/bucket';
import {
  formatMoney,
  formatType,
  getAllocatedBalance,
  getCurrentBalance,
} from './bucket-format';

type Props = {
  bucket: Bucket;
};

export default function BucketCard({ bucket }: Props) {
  const [selected, setSelected] = useState(false);

  function showActions() {
    Alert.alert(bucket.name, 'Choose an action.', [
      {
        text: 'View Details',
        onPress: () => {
          Alert.alert(
            bucket.name,
            `Type: ${formatType(bucket.type)}\nAllocated balance: ${formatMoney(getAllocatedBalance(bucket))} Birr\nCurrent balance: ${formatMoney(getCurrentBalance(bucket))} Birr`,
          );
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }

  return (
    <Pressable
      style={[
        styles.card,
        selected && styles.cardSelected,
      ]}
      onPress={() => setSelected(false)}
      onLongPress={() => setSelected(true)}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={`${bucket.name}. Long press for options.`}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>▤</Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.name}>{bucket.name}</Text>

        <Text style={styles.type}>
          {formatType(bucket.type)}
        </Text>

        <Text style={styles.balanceLabel}>
          Allocated balance
        </Text>

        <Text style={styles.allocatedBalanceValue}>
          {formatMoney(getAllocatedBalance(bucket))} Birr
        </Text>

        <Text style={styles.balanceLabel}>
          Current balance
        </Text>

        <Text style={styles.balanceValue}>
          {formatMoney(getCurrentBalance(bucket))} Birr
        </Text>
      </View>

      {selected && (
        <Pressable
          style={styles.actionButton}
          onPress={showActions}
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${bucket.name}`}
        >
          <Text style={styles.actionText}>Actions</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  cardSelected: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 23,
    fontWeight: '700',
    color: '#16A34A',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  type: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
  allocatedBalanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#DCFCE7',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginLeft: 8,
  },
  actionText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
});