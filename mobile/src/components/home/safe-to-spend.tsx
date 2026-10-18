
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';

import { apiRequest } from '@/api';
import { auth } from '@/firebase';
import { Colors } from '@/constants/colors';

type SafeToSpendProps = {
  refreshKey?: number;
  amountsVisible: boolean;
  onToggleVisibility: () => void;
};

type BucketBalance = {
  bucketId: string;
  bucketName: string;
  bucketType: string;
  isActive: boolean;
  balance: string | number;
};

type BalancesResponse = {
  totalBalance: string | number;
  buckets: BucketBalance[];
};

function calculateSafeToSpend(buckets: BucketBalance[]): number {
  return buckets.reduce((total, bucket) => {
    const isEligible =
      bucket.bucketType === 'UNALLOCATED' ||
      (bucket.isActive &&
        (bucket.bucketType === 'ESSENTIAL' ||
          bucket.bucketType === 'FLEXIBLE'));

    if (!isEligible) {
      return total;
    }

    const balance = Number(bucket.balance);

    if (!Number.isFinite(balance)) {
      return total;
    }

    return total + balance;
  }, 0);
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SafeToSpend({
  refreshKey = 0,
  amountsVisible,
  onToggleVisibility,
}: SafeToSpendProps) {
  const [safeToSpend, setSafeToSpend] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState('');

  const loadBalances = useCallback(async () => {
    setError('');

    try {
      const response = await apiRequest<BalancesResponse>(
        '/transfers/balances',
        { method: 'GET' },
      );

      setSafeToSpend(
        calculateSafeToSpend(response.buckets ?? []),
      );
    } catch (err) {
      console.error('[SafeToSpend] Failed to load balances:', err);
      setError('Unable to calculate Safe to Spend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => setAuthReady(Boolean(user)),
      err => {
        console.error('[SafeToSpend] Auth initialization failed:', err);
        setAuthReady(true);
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!auth.currentUser) {
      setSafeToSpend(null);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    void loadBalances();
  }, [authReady, refreshKey, loadBalances]);

  return (
    <View style={styles.safeSection}>
      <View style={styles.safeTextContainer}>
        <Text style={styles.safeLabel}>Safe to Spend</Text>
      </View>

      <View style={styles.amountRow}>
        <View style={styles.amountContainer}>
          {loading && safeToSpend === null ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : error && safeToSpend === null ? (
            <Pressable
              onPress={() => {
                setLoading(true);
                void loadBalances();
              }}
              accessibilityRole="button"
              accessibilityLabel="Retry Safe to Spend calculation"
            >
              <Text style={styles.safeAmount}>Retry</Text>
            </Pressable>
          ) : (
            <Text style={styles.safeAmount}>
              {amountsVisible && safeToSpend !== null
                ? formatAmount(safeToSpend)
                : '*****'}
              {amountsVisible && safeToSpend !== null && (
                <Text style={styles.safeCurrency}> ETB</Text>
              )}
            </Text>
          )}
        </View>

        <Pressable
          style={styles.visibilityButton}
          onPress={onToggleVisibility}
          accessibilityRole="button"
          accessibilityLabel={
            amountsVisible
              ? 'Hide safe-to-spend balance'
              : 'Show safe-to-spend balance'
          }
          hitSlop={8}
        >
          <Ionicons
            name={amountsVisible ? 'eye-outline' : 'eye-off-outline'}
            size={19}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  safeTextContainer: {
    flex: 1,
    marginRight: 8,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },

  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 32,
  },

  safeLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  safeAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },

  safeCurrency: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  visibilityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
  },
});
