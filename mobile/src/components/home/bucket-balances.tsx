
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';

import { apiRequest } from '@/api';
import { auth } from '@/firebase';
import { Colors } from '@/constants/colors';

type BucketBalancesProps = {
  refreshKey?: number;
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

function formatAmount(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0.00';
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BucketBalances({
  refreshKey = 0,
}: BucketBalancesProps) {
  const [buckets, setBuckets] = useState<BucketBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [authReady, setAuthReady] = useState(false);

  const loadBalances = useCallback(async () => {
    if (!hasLoaded) {
      setLoading(true);
    }

    setError('');

    try {
      const response = await apiRequest<BalancesResponse>(
        '/transfers/balances',
        {
          method: 'GET',
        },
      );

      setBuckets(response.buckets ?? []);

      setHasLoaded(true);
    } catch {
      setError('Unable to load your bucket balances.');
    } finally {
      setLoading(false);
    }
  }, [hasLoaded]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(Boolean(user));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady) {
      setBuckets([]);
      setLoading(false);
      return;
    }

    void loadBalances();
  }, [authReady, refreshKey, loadBalances]);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Money</Text>

        <Pressable
          onPress={() => void loadBalances()}
          style={styles.refreshButton}
          accessibilityRole="button"
          accessibilityLabel="Refresh bucket balances"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </Pressable>
      </View>

      {loading && !hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.mutedText}>
            Loading bucket balances...
          </Text>
        </View>
      ) : error && !hasLoaded ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            onPress={() => void loadBalances()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : buckets.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No active buckets</Text>
          <Text style={styles.mutedText}>
            Your active money buckets will appear here.
          </Text>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.bucketList}>
          {buckets.map((bucket) => (
            <View key={bucket.bucketId} style={styles.bucketRow}>
              <View style={styles.bucketInfo}>
                <Text style={styles.bucketName}>
                  {bucket.bucketName}
                </Text>

                <Text style={styles.bucketType}>
                  {bucket.bucketType}
                </Text>
              </View>

              <Text style={styles.bucketBalance}>
                {formatAmount(bucket.balance)}
              </Text>
            </View>
          ))}

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  bucketList: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    paddingHorizontal: 16,
  },
  bucketRow: {
    alignItems: 'center',
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  bucketInfo: {
    flex: 1,
    marginRight: 12,
  },
  bucketName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  bucketType: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  bucketBalance: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    padding: 24,
  },
  mutedText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  messageCard: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 20,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#D94C4C',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
