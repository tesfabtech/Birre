
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { apiRequest } from '@/api';
import { auth } from '@/firebase';
import { Colors } from '@/constants/colors';
import BalanceCard from '@/components/home/balance-card';

type TransactionFilter = 'ALL' | 'EXPENSE' | 'TRANSFER' | 'INCOME';

type IncomeRecord = {
  id: string;
  amount: string | number;
  type: string;
  receivedAt: string;
  note: string | null;
  moneySource?: {
    id: string;
    name: string;
  } | null;
};

type ExpenseRecord = {
  id: string;
  amount: string | number;
  type: string;
  spentAt: string;
  note: string | null;
  bucket?: {
    id: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
  } | null;
};

type TransferRecord = {
  id: string;
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

type BalancesResponse = {
  totalBalance: string;
};

type Transaction = {
  id: string;
  key: string;
  kind: Exclude<TransactionFilter, 'ALL'>;
  amount: number;
  date: Date;
  dateKey: string;
  title: string;
  subtitle: string;
  note: string | null;
};

type DateGroup = {
  key: string;
  title: string;
  transactions: Transaction[];
};

const FILTERS: {
  label: string;
  value: TransactionFilter;
}[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Income', value: 'INCOME' },
];

const TRANSFER_COLOR = '#2563EB';
const INCOME_COLOR = Colors.primary;
const EXPENSE_COLOR = Colors.danger;

function parseAmount(value: string | number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * The API stores these transaction dates as YYYY-MM-DD dates.
 * Parse date-only strings as local calendar dates to avoid timezone shifts.
 */
function parseTransactionDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return new Date(Number.NaN);
    }

    return date;
  }

  return new Date(value);
}

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getGroupTitle(date: Date, today: Date): string {
  const dayDifference = Math.round(
    (getDayStart(today).getTime() - getDayStart(date).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTransactionDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

function makeIncomeTransactions(records: IncomeRecord[]): Transaction[] {
  return records.map(record => {
    const date = parseTransactionDate(record.receivedAt);
    const validDate = !Number.isNaN(date.getTime());

    return {
      id: record.id,
      key: `income-${record.id}`,
      kind: 'INCOME',
      amount: parseAmount(record.amount),
      date,
      dateKey: validDate ? getDateKey(date) : 'unknown',
      title: record.moneySource?.name || 'Income',
      subtitle:
        record.type === 'REGULAR'
          ? 'Regular income'
          : record.type === 'OCCASIONAL'
            ? 'Occasional income'
            : 'Income received',
      note: record.note,
    };
  });
}

function makeExpenseTransactions(records: ExpenseRecord[]): Transaction[] {
  return records.map(record => {
    const date = parseTransactionDate(record.spentAt);
    const validDate = !Number.isNaN(date.getTime());

    return {
      id: record.id,
      key: `expense-${record.id}`,
      kind: 'EXPENSE',
      amount: parseAmount(record.amount),
      date,
      dateKey: validDate ? getDateKey(date) : 'unknown',
      title: record.category?.name || 'Expense',
      subtitle: record.bucket?.name
        ? `From ${record.bucket.name}`
        : 'Expense',
      note: record.note,
    };
  });
}

function makeTransferTransactions(
  records: TransferRecord[],
): Transaction[] {
  return records.map(record => {
    const date = parseTransactionDate(record.transferredAt);
    const validDate = !Number.isNaN(date.getTime());

    const fromName = record.fromBucket?.name || 'Source bucket';
    const toName = record.toBucket?.name || 'Destination bucket';

    return {
      id: record.id,
      key: `transfer-${record.id}`,
      kind: 'TRANSFER',
      amount: parseAmount(record.amount),
      date,
      dateKey: validDate ? getDateKey(date) : 'unknown',
      title: 'Money transfer',
      subtitle: `${fromName} → ${toName}`,
      note: record.note ?? null,
    };
  });
}

function getTransactionColor(kind: Transaction['kind']): string {
  switch (kind) {
    case 'INCOME':
      return INCOME_COLOR;
    case 'EXPENSE':
      return EXPENSE_COLOR;
    case 'TRANSFER':
      return TRANSFER_COLOR;
  }
}

function getTransactionSign(kind: Transaction['kind']): string {
  switch (kind) {
    case 'INCOME':
      return '+';
    case 'EXPENSE':
      return '−';
    case 'TRANSFER':
      return '';
  }
}

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] =
    useState<TransactionFilter>('ALL');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  // Balance card state.
  const [totalBalance, setTotalBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState(false);
  const [totalBalanceVisible, setTotalBalanceVisible] = useState(false);
  const [safeToSpendVisible, setSafeToSpendVisible] = useState(false);

  const loadBalance = useCallback(async () => {
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
      console.error('[History] Failed to load total balance:', error);
      setBalanceError(true);
    } finally {
      setBalanceLoading(false);
    }
  }, [totalBalance]);

  const loadTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setScreenError(null);

    try {
      const [incomeResult, expenseResult, transferResult] =
        await Promise.all([
          apiRequest<IncomeRecord[]>('/income'),
          apiRequest<ExpenseRecord[]>('/expenses'),
          apiRequest<TransferRecord[]>('/transfers'),
        ]);

      const combined = [
        ...makeIncomeTransactions(incomeResult),
        ...makeExpenseTransactions(expenseResult),
        ...makeTransferTransactions(transferResult),
      ];

      combined.sort((a, b) => {
        const aTime = a.date.getTime();
        const bTime = b.date.getTime();

        if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
          return b.key.localeCompare(a.key);
        }

        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;

        return bTime - aTime || b.key.localeCompare(a.key);
      });

      setTransactions(combined);
    } catch (error) {
      setScreenError(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setScreenError(null);

        // Load the shared balance card's total balance.
        void loadBalance();

        try {
          const [incomeResult, expenseResult, transferResult] =
            await Promise.all([
              apiRequest<IncomeRecord[]>('/income'),
              apiRequest<ExpenseRecord[]>('/expenses'),
              apiRequest<TransferRecord[]>('/transfers'),
            ]);

          if (!active) return;

          const combined = [
            ...makeIncomeTransactions(incomeResult),
            ...makeExpenseTransactions(expenseResult),
            ...makeTransferTransactions(transferResult),
          ];

          combined.sort((a, b) => {
            const aTime = a.date.getTime();
            const bTime = b.date.getTime();

            if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
              return b.key.localeCompare(a.key);
            }

            if (Number.isNaN(aTime)) return 1;
            if (Number.isNaN(bTime)) return -1;

            return bTime - aTime || b.key.localeCompare(a.key);
          });

          setTransactions(combined);
        } catch (error) {
          if (active) {
            setScreenError(getErrorMessage(error));
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [loadBalance]),
  );

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadTransactions(true),
      loadBalance(),
    ]);
  }, [loadTransactions, loadBalance]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'ALL') {
      return transactions;
    }

    return transactions.filter(
      transaction => transaction.kind === activeFilter,
    );
  }, [activeFilter, transactions]);

  const groups = useMemo<DateGroup[]>(() => {
    const today = new Date();
    const grouped = new Map<string, DateGroup>();

    for (const transaction of filteredTransactions) {
      const key = transaction.dateKey;

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          title:
            key === 'unknown'
              ? 'Date unavailable'
              : getGroupTitle(transaction.date, today),
          transactions: [],
        });
      }

      grouped.get(key)!.transactions.push(transaction);
    }

    return Array.from(grouped.values());
  }, [filteredTransactions]);

  const displayName =
    auth.currentUser?.displayName?.trim() ||
    auth.currentUser?.email?.split('@')[0] ||
    'there';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
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
            setTotalBalanceVisible(previous => !previous)
          }
          onToggleSafeToSpend={() =>
            setSafeToSpendVisible(previous => !previous)
          }
          onRetryBalance={() => void loadBalance()}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map(filter => {
            const selected = activeFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                style={[
                  styles.filterButton,
                  selected && styles.filterButtonActive,
                ]}
                onPress={() => setActiveFilter(filter.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>
            {activeFilter === 'ALL'
              ? 'Recent activity'
              : `${FILTERS.find(filter => filter.value === activeFilter)?.label} history`}
          </Text>

          {!loading && !screenError ? (
            <Text style={styles.resultCount}>
              {filteredTransactions.length}{' '}
              {filteredTransactions.length === 1
                ? 'transaction'
                : 'transactions'}
            </Text>
          ) : null}
        </View>

        {loading && transactions.length === 0 ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateTitle}>Loading history</Text>
            <Text style={styles.stateDescription}>
              Fetching your income, expenses, and transfers.
            </Text>
          </View>
        ) : screenError ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Text style={styles.stateIconText}>!</Text>
            </View>
            <Text style={styles.stateTitle}>Couldn't load history</Text>
            <Text style={styles.stateDescription}>{screenError}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={() => void loadTransactions()}
              accessibilityRole="button"
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredTransactions.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Text style={styles.emptyIcon}>↗</Text>
            </View>
            <Text style={styles.stateTitle}>
              {activeFilter === 'ALL'
                ? 'No transactions yet'
                : `No ${activeFilter.toLowerCase()} transactions`}
            </Text>
            <Text style={styles.stateDescription}>
              {activeFilter === 'ALL'
                ? 'Your recorded income, expenses, and transfers will appear here.'
                : 'Try another filter or record a transaction to see it here.'}
            </Text>

            {activeFilter !== 'ALL' ? (
              <Pressable
                style={styles.retryButton}
                onPress={() => setActiveFilter('ALL')}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>
                  View all transactions
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          groups.map(group => (
            <View key={group.key} style={styles.dateGroup}>
              <View style={styles.dateHeading}>
                <Text style={styles.dateHeadingText}>{group.title}</Text>

                {group.key !== 'unknown' ? (
                  <Text style={styles.dateHeadingDate}>
                    {formatTransactionDate(group.transactions[0]!.date)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.transactionList}>
                {group.transactions.map((transaction, index) => {
                  const color = getTransactionColor(transaction.kind);
                  const sign = getTransactionSign(transaction.kind);

                  return (
                    <View
                      key={transaction.key}
                      style={[
                        styles.transactionRow,
                        index < group.transactions.length - 1 &&
                          styles.transactionDivider,
                      ]}
                    >
                      <View
                        style={[
                          styles.transactionIcon,
                          { backgroundColor: `${color}14` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.transactionIconText,
                            { color },
                          ]}
                        >
                          {transaction.kind === 'EXPENSE'
                            ? '↗'
                            : transaction.kind === 'INCOME'
                              ? '↙'
                              : '⇄'}
                        </Text>
                      </View>

                      <View style={styles.transactionInfo}>
                        <Text
                          style={styles.transactionTitle}
                          numberOfLines={1}
                        >
                          {transaction.title}
                        </Text>

                        <Text
                          style={styles.transactionSubtitle}
                          numberOfLines={1}
                        >
                          {transaction.subtitle}
                        </Text>

                        {transaction.note?.trim() ? (
                          <Text
                            style={styles.transactionNote}
                            numberOfLines={2}
                          >
                            {transaction.note.trim()}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.amountContainer}>
                        <Text style={[styles.amountText, { color }]}>
                          {sign}
                          {formatAmount(transaction.amount)}
                        </Text>
                        <Text style={styles.currencyText}>ETB</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <Text style={styles.footerText}>
          Transfers move money between buckets and don't change your total
          money.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },

  header: {
    marginBottom: 20,
  },

  filters: {
    gap: 9,
    paddingBottom: 8,
  },

  filterButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },

  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
  },

  resultCount: {
    color: Colors.textSecondary,
    fontSize: 12,
  },

  dateGroup: {
    marginBottom: 20,
  },

  dateHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },

  dateHeadingText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  dateHeadingDate: {
    color: Colors.textSecondary,
    fontSize: 12,
  },

  transactionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },

  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 11,
  },

  transactionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transactionIconText: {
    fontSize: 23,
    fontWeight: '600',
  },

  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },

  transactionTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  transactionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  transactionNote: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  amountContainer: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '36%',
  },

  amountText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },

  currencyText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  stateCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 30,
    marginTop: 4,
  },

  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  stateIconText: {
    color: Colors.danger,
    fontSize: 25,
    fontWeight: '700',
  },

  emptyIcon: {
    color: Colors.primary,
    fontSize: 25,
    fontWeight: '700',
  },

  stateTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  stateDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },

  retryButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 18,
  },

  retryButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  footerText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 10,
  },
});
