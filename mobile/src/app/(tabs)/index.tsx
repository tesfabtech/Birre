
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { apiRequest } from '@/api';
import { auth } from '@/firebase';
import { Colors } from '@/constants/colors';
import BalanceCard from '@/components/home/balance-card';
import PeriodCard from '@/components/home/period-card';
import BucketBalances from '@/components/home/bucket-balances';
import GoalsProgress from '@/components/home/goals-progress';
import SpendingSummary from '@/components/home/spending-summary';

type BalancesResponse = {
  totalBalance: string;
  buckets: {
    bucketId: string;
    bucketName: string;
    bucketType: string;
    isActive: boolean;
    balance: string;
  }[];
};

export default function HomeScreen() {
  const [totalBalance, setTotalBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(false);

  // Each balance has its own visibility state.
  const [totalBalanceVisible, setTotalBalanceVisible] = useState(false);
  const [safeToSpendVisible, setSafeToSpendVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const user = auth.currentUser;

  const displayName =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'there';

  const loadBalance = useCallback(async () => {
    // Never request private balance data without a signed-in user.
    if (!auth.currentUser) {
      setBalanceLoading(false);
      setBalanceError(false);
      return;
    }

    // Only show the large loading indicator before the first load.
    if (totalBalance === null) {
      setBalanceLoading(true);
    }

    setBalanceError(false);

    try {
      const response = await apiRequest<BalancesResponse>(
        '/transfers/balances',
        { method: 'GET' },
      );

      setTotalBalance(response.totalBalance);
    } catch (error) {
      console.error('[Home] Failed to load total balance:', error);
      setBalanceError(true);
    } finally {
      setBalanceLoading(false);
    }
  }, [totalBalance]);

  // Load the balance only when a user is signed in.
  useEffect(() => {
    if (!auth.currentUser) {
      setBalanceLoading(false);
      return;
    }

    void loadBalance();
  }, [loadBalance]);

  const onRefresh = useCallback(async () => {
    if (refreshing || !auth.currentUser) return;

    setRefreshing(true);

    // Refresh the balance, periods, and bucket balances.
    setRefreshKey(previous => previous + 1);

    try {
      await loadBalance();
    } finally {
      setRefreshing(false);
    }
  }, [loadBalance, refreshing]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <BalanceCard
        displayName={displayName}
        totalBalance={totalBalance}
        balanceLoading={balanceLoading}
        balanceError={balanceError}
        totalBalanceVisible={totalBalanceVisible}
        safeToSpendVisible={safeToSpendVisible}
        refreshKey={refreshKey}
        onToggleTotalBalance={() =>
          setTotalBalanceVisible(previous => !previous)
        }
        onToggleSafeToSpend={() =>
          setSafeToSpendVisible(previous => !previous)
        }
        onRetryBalance={() => void loadBalance()}
      />

      {/* Income, expense, and transfer actions */}
      <View style={styles.actionButtonsRow}>
        <Link href="/add-income" asChild>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add income"
          >
            <Text style={styles.actionIcon}>＋</Text>
            <Text style={styles.actionTitle}>Income</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/add-expense" asChild>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
          >
            <Text style={styles.actionIcon}>−</Text>
            <Text style={styles.actionTitle}>Expense</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/transfers" asChild>
          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Transfer money"
          >
            <Text style={styles.actionIcon}>⇄</Text>
            <Text style={styles.actionTitle}>Transfer</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <SpendingSummary refreshKey={refreshKey} />

      <BucketBalances refreshKey={refreshKey} />

      <PeriodCard refreshKey={refreshKey} />

      <GoalsProgress />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  actionButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 6,
  },

  actionIcon: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '600',
    marginRight: 5,
  },

  actionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
