
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { apiRequest } from '../api';
import { getCurrentAllocationPlan } from '../services/allocation-plan-service';

import { auth } from '@/firebase';
import BalanceCard from '@/components/home/balance-card';
import TransferDetails from '@/components/transfers/TransferDetails';
import TransferHistorySection from '@/components/transfers/TransferHistorySection';

import type { AllocationPlanBucket } from '@/types/allocation-plan';

type Transfer = {
  id: string;
  fromBucketId: string;
  toBucketId: string;
  amount: string | number;
  transferredAt: string;
  note?: string | null;
  fromBucket?: {
    id: string;
    name: string;
  } | null;
  toBucket?: {
    id: string;
    name: string;
  } | null;
};

type BucketBalance = {
  bucketId: string;
  bucketName: string;
  bucketType: string;
  isActive: boolean;
  balance: string;
};

type BucketBalancesResponse = {
  totalBalance: string | number;
  buckets: BucketBalance[];
};

/**
 * Returns today's date in the device's local timezone.
 * Format: YYYY-MM-DD
 */
function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function TransfersScreen() {
  const insets = useSafeAreaInsets();

  const [buckets, setBuckets] = useState<AllocationPlanBucket[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [bucketBalances, setBucketBalances] = useState<
    Record<string, string>
  >({});

  const [totalBalance, setTotalBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(false);
  const [totalBalanceVisible, setTotalBalanceVisible] = useState(false);
  const [safeToSpendVisible, setSafeToSpendVisible] = useState(false);

  // Prevent unnecessary balance loading when returning to this tab.
  const hasLoadedBalance = useRef(false);

  const [fromBucketId, setFromBucketId] = useState('');
  const [toBucketId, setToBucketId] = useState('');

  // Keep the latest selections available without changing loadData's
  // callback whenever the user selects a different bucket.
  const fromBucketIdRef = useRef('');
  const toBucketIdRef = useRef('');

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [historyError, setHistoryError] = useState('');

  /**
   * Loads balances independently so they can be refreshed after a transfer
   * or retried without forcing BalanceCard to reload on every tab focus.
   */
  const loadBalance = useCallback(async () => {
    // Only show the initial loading indicator before the first successful load.
    if (!hasLoadedBalance.current) {
      setBalanceLoading(true);
    }

    setBalanceError(false);

    try {
      const balancesResponse = (await apiRequest(
        '/transfers/balances',
      )) as BucketBalancesResponse;

      setTotalBalance(String(balancesResponse.totalBalance ?? '0'));

      const nextBalances: Record<string, string> = {};

      for (const bucket of balancesResponse.buckets ?? []) {
        nextBalances[bucket.bucketId] = String(bucket.balance ?? '0');
      }

      setBucketBalances(nextBalances);

      hasLoadedBalance.current = true;
      setBalanceError(false);
    } catch {
      setBalanceError(true);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  /**
   * Loads transfer history and buckets.
   *
   * Balances are fetched on the first load, or when refreshBalances is true.
   */
  const loadData = useCallback(
    async (refreshBalances = false) => {
      setLoading(true);
      setError('');
      setHistoryError('');

      try {
        const [planResult, transferResult] = await Promise.all([
          getCurrentAllocationPlan(),
          apiRequest('/transfers'),
        ]);

        const planBuckets = (
          (planResult as { buckets?: AllocationPlanBucket[] } | null)
            ?.buckets ?? []
        ) as AllocationPlanBucket[];

        const activeBuckets = planBuckets.filter(
          (bucket) => bucket.isActive !== false,
        );

        setBuckets(activeBuckets);

        const transferData = Array.isArray(transferResult)
          ? transferResult
          : (
              transferResult as {
                transfers?: Transfer[];
                data?: Transfer[];
              } | null
            )?.transfers ??
            (
              transferResult as {
                data?: Transfer[];
              } | null
            )?.data ??
            [];

        setTransfers(transferData as Transfer[]);

        // Preserve selections when their buckets are still valid.
        const nextFromBucketId = activeBuckets.some(
          (bucket) => bucket.id === fromBucketIdRef.current,
        )
          ? fromBucketIdRef.current
          : (activeBuckets[0]?.id ?? '');

        const nextToBucketId = activeBuckets.some(
          (bucket) =>
            bucket.id === toBucketIdRef.current &&
            bucket.id !== nextFromBucketId,
        )
          ? toBucketIdRef.current
          : (activeBuckets.find(
              (bucket) => bucket.id !== nextFromBucketId,
            )?.id ?? '');

        fromBucketIdRef.current = nextFromBucketId;
        toBucketIdRef.current = nextToBucketId;

        setFromBucketId(nextFromBucketId);
        setToBucketId(nextToBucketId);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load transfers. Please try again.';

        setError(message);
        setHistoryError(message);
      } finally {
        setLoading(false);
      }

      // Load balances initially, or when explicitly requested.
      if (refreshBalances || !hasLoadedBalance.current) {
        await loadBalance();
      }
    },
    [loadBalance],
  );

  useFocusEffect(
    useCallback(() => {
      // Refresh history and buckets on focus. Balances load only when needed.
      void loadData();
    }, [loadData]),
  );

  const handleSelectSource = (bucketId: string) => {
    // All source buckets remain selectable.
    fromBucketIdRef.current = bucketId;
    setFromBucketId(bucketId);

    // Destination depends on source, never the reverse.
    if (bucketId === toBucketIdRef.current) {
      const nextDestination =
        buckets.find((bucket) => bucket.id !== bucketId)?.id ?? '';

      toBucketIdRef.current = nextDestination;
      setToBucketId(nextDestination);
    }

    setError('');
    setSuccess('');
  };

  const handleSelectDestination = (bucketId: string) => {
    // Prevent selecting the source as the destination.
    if (bucketId === fromBucketIdRef.current) {
      return;
    }

    toBucketIdRef.current = bucketId;
    setToBucketId(bucketId);

    setError('');
    setSuccess('');
  };

  const handleTransfer = async () => {
    setError('');
    setSuccess('');

    if (!fromBucketId || !toBucketId) {
      setError('Please select both the source and destination buckets.');
      return;
    }

    if (fromBucketId === toBucketId) {
      setError('Source and destination buckets must be different.');
      return;
    }

    const normalizedAmount = amount.trim();

    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
      setError('Enter a valid amount with up to two decimal places.');
      return;
    }

    const numericAmount = Number(normalizedAmount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('The transfer amount must be greater than zero.');
      return;
    }

    const sourceBalance = Number(bucketBalances[fromBucketId] ?? '0');

    if (
      Number.isFinite(sourceBalance) &&
      sourceBalance >= 0 &&
      numericAmount > sourceBalance
    ) {
      const sourceBucket = buckets.find(
        (bucket) => bucket.id === fromBucketId,
      );

      setError(
        `The amount exceeds the available balance in ${
          sourceBucket?.name ?? 'the source bucket'
        }.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest('/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromBucketId,
          toBucketId,
          amount: normalizedAmount,
          transferredAt: getTodayDate(),
          note: note.trim() || null,
        }),
      });

      setSuccess('Transfer completed successfully.');
      setAmount('');
      setNote('');

      // Refresh history, bucket balances, and the displayed total.
      await loadData(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete the transfer. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const displayName =
    auth.currentUser?.displayName?.trim() ||
    auth.currentUser?.email?.split('@')[0] ||
    'there';

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        <BalanceCard
          displayName={displayName}
          totalBalance={totalBalance}
          balanceLoading={balanceLoading}
          balanceError={balanceError}
          totalBalanceVisible={totalBalanceVisible}
          safeToSpendVisible={safeToSpendVisible}
          refreshKey={0}
          onToggleTotalBalance={() =>
            setTotalBalanceVisible((previous) => !previous)
          }
          onToggleSafeToSpend={() =>
            setSafeToSpendVisible((previous) => !previous)
          }
          onRetryBalance={() => void loadBalance()}
        />

        <View style={styles.pageHeading}>
          <View style={styles.headingIcon}>
            <Ionicons
              name="swap-horizontal-outline"
              size={23}
              color={Colors.primary}
            />
          </View>

          <View style={styles.headingTextContainer}>
            <Text style={styles.pageTitle}>Transfer Money</Text>
            <Text style={styles.pageSubtitle}>
              Move money between your buckets.
            </Text>
          </View>
        </View>

        <TransferDetails
          buckets={buckets}
          bucketBalances={bucketBalances}
          fromBucketId={fromBucketId}
          toBucketId={toBucketId}
          amount={amount}
          note={note}
          submitting={submitting}
          error={error}
          success={success}
          onFromBucketChange={handleSelectSource}
          onToBucketChange={handleSelectDestination}
          onAmountChange={(value: string) => {
            setAmount(value);
            setError('');
            setSuccess('');
          }}
          onNoteChange={(value: string) => {
            setNote(value);
            setError('');
            setSuccess('');
          }}
          onSubmit={handleTransfer}
        />

        <TransferHistorySection
          transfers={transfers}
          loading={loading}
          error={historyError || undefined}
          onRefresh={() => void loadData(true)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 20,
  },
  pageHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headingIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  headingTextContainer: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: Colors.text,
  },
  pageSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
