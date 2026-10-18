
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';

import { Colors } from '@/constants/colors';
import { apiRequest } from '@/api';
import BalanceCard from '@/components/home/balance-card';
import { auth } from '@/firebase';

type Expense = {
  id: string;
  amount: string | number;
  type: string;
  spentAt: string;
  note: string | null;
  periodId: string | null;
  bucket: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  };
};

type BucketBalancesResponse = {
  totalBalance: string | number;
  buckets: {
    bucketId: string;
    bucketName: string;
    bucketType: string;
    isActive: boolean;
    balance: string;
  }[];
};

function parseExpenseDate(value: string): Date {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function formatDate(value: string): string {
  const date = parseExpenseDate(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year:
      date.getFullYear() === today.getFullYear()
        ? undefined
        : 'numeric',
  });
}

function formatAmount(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0';
  }

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading expenses.';
}

export default function ExpensesScreen() {
  const isOpeningAddExpense = useRef(false);
  const isLoadingRef = useRef(false);
  const hasLoadedBalance = useRef(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalBalance, setTotalBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(false);
  const [totalBalanceVisible, setTotalBalanceVisible] = useState(false);
  const [safeToSpendVisible, setSafeToSpendVisible] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);

      if (!hasLoadedBalance.current) {
        setBalanceLoading(true);
      }
    }

    setError(null);

    if (!hasLoadedBalance.current) {
      setBalanceError(false);
    }

    try {
      const results = await Promise.allSettled([
        apiRequest<Expense[]>('/expenses'),
        apiRequest<BucketBalancesResponse>('/transfers/balances'),
      ]);

      const [expenseResult, balanceResult] = results;

      if (expenseResult.status === 'fulfilled') {
        setExpenses(expenseResult.value);
      } else {
        setError(getErrorMessage(expenseResult.reason));
      }

      if (balanceResult.status === 'fulfilled') {
        setTotalBalance(
          String(balanceResult.value.totalBalance ?? '0'),
        );
        hasLoadedBalance.current = true;
        setBalanceError(false);
      } else {
        setBalanceError(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setBalanceLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      isOpeningAddExpense.current = false;

      async function loadExpenses() {
        setLoading(true);
        setError(null);

        // Fetch the balance only until its first successful load.
        if (!hasLoadedBalance.current) {
          setBalanceLoading(true);
          setBalanceError(false);
        }

        try {
          const expenseRequest = apiRequest<Expense[]>('/expenses');

          const balanceRequest = hasLoadedBalance.current
            ? null
            : apiRequest<BucketBalancesResponse>('/transfers/balances');

          const [expenseResult, balanceResult] = await Promise.all([
            expenseRequest.then(
              value => ({ status: 'fulfilled' as const, value }),
              reason => ({ status: 'rejected' as const, reason }),
            ),
            balanceRequest
              ? balanceRequest.then(
                  value => ({ status: 'fulfilled' as const, value }),
                  reason => ({ status: 'rejected' as const, reason }),
                )
              : Promise.resolve(null),
          ]);

          if (!isActive) {
            return;
          }

          if (expenseResult.status === 'fulfilled') {
            setExpenses(expenseResult.value);
          } else {
            setError(getErrorMessage(expenseResult.reason));
          }

          if (balanceResult) {
            if (balanceResult.status === 'fulfilled') {
              setTotalBalance(
                String(balanceResult.value.totalBalance ?? '0'),
              );
              hasLoadedBalance.current = true;
              setBalanceError(false);
            } else {
              setBalanceError(true);
            }
          }
        } finally {
          if (isActive) {
            setLoading(false);
            setBalanceLoading(false);
          }
        }
      }

      void loadExpenses();

      return () => {
        isActive = false;
      };
    }, []),
  );

  function handleAddExpense() {
    if (isOpeningAddExpense.current) {
      return;
    }

    isOpeningAddExpense.current = true;
    router.push('/add-expense');
  }

  const now = new Date();

  const periodTotal = expenses.reduce((total, expense) => {
    const date = parseExpenseDate(expense.spentAt);

    if (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    ) {
      const amount = Number(expense.amount);

      if (Number.isFinite(amount)) {
        return total + amount;
      }
    }

    return total;
  }, 0);

  const displayName =
    auth.currentUser?.displayName?.trim() ||
    auth.currentUser?.email?.split('@')[0] ||
    'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadData(true)}
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
        refreshKey={0}
        onToggleTotalBalance={() =>
          setTotalBalanceVisible(visible => !visible)
        }
        onToggleSafeToSpend={() =>
          setSafeToSpendVisible(visible => !visible)
        }
        onRetryBalance={() => void loadData(true)}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="trending-down"
              size={21}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.summaryLabel}>This Month</Text>
        </View>

        <Text style={styles.summaryAmount}>
          {formatAmount(periodTotal)}
          <Text style={styles.summaryCurrency}> ETB</Text>
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.pressed,
        ]}
        onPress={handleAddExpense}
        accessibilityRole="button"
        accessibilityLabel="Add expense"
      >
        <Ionicons name="add" size={23} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Expense</Text>
      </Pressable>

      <View style={styles.expensesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Expenses</Text>

          {!loading && !error && expenses.length > 0 && (
            <Text style={styles.expenseCount}>
              {expenses.length}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name="alert-circle-outline"
              size={28}
              color={Colors.danger}
            />
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => void loadData()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="receipt-outline"
                size={27}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>
              Your expenses will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.expensesCard}>
            {expenses.map((expense, index) => (
              <View
                key={expense.id}
                style={[
                  styles.expenseRow,
                  index === expenses.length - 1 &&
                    styles.lastExpenseRow,
                ]}
              >
                <View style={styles.expenseIcon}>
                  <Ionicons
                    name="arrow-up-right-box"
                    size={21}
                    color={Colors.danger}
                  />
                </View>

                <View style={styles.expenseInfo}>
                  <Text
                    style={styles.expenseCategory}
                    numberOfLines={1}
                  >
                    {expense.category?.name ?? 'Uncategorized'}
                  </Text>

                  <Text
                    style={styles.expenseDescription}
                    numberOfLines={1}
                  >
                    {expense.note?.trim() ||
                      expense.bucket?.name ||
                      'Expense'}
                  </Text>

                  <Text style={styles.expenseDate}>
                    {formatDate(expense.spentAt)}
                  </Text>
                </View>

                <Text style={styles.expenseAmount}>
                  −{formatAmount(expense.amount)}
                  <Text style={styles.amountCurrency}> ETB</Text>
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
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

  summaryCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },

  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  summaryAmount: {
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 14,
  },

  summaryCurrency: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },

  addButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    marginBottom: 28,
  },

  pressed: {
    opacity: 0.75,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  expensesSection: {
    gap: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
  },

  expenseCount: {
    overflow: 'hidden',
    color: Colors.textSecondary,
    backgroundColor: '#F3F4F6',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },

  expensesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  lastExpenseRow: {
    borderBottomWidth: 0,
  },

  expenseIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },

  expenseCategory: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  expenseDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  expenseDate: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 5,
  },

  expenseAmount: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 0,
  },

  amountCurrency: {
    fontSize: 11,
    fontWeight: '600',
  },

  statusContainer: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    gap: 10,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
  },

  errorText: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },

  retryButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },

  retryButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
