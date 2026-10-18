
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';

import { apiRequest } from '@/api';
import { auth } from '@/firebase';
import { Colors } from '@/constants/colors';

type PeriodCardProps = {
  refreshKey?: number;
};

type FinancialPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  moneySource?: {
    id: string;
    name: string;
  } | null;
};

type IncomeRecord = {
  id: string;
  amount: string | number;
  receivedAt: string;
  periodId?: string | null;
  period?: {
    id: string;
  } | null;
};

type ExpenseRecord = {
  id: string;
  amount: string | number;
  spentAt: string;
  periodId?: string | null;
};

type PeriodSummary = {
  period: FinancialPeriod;
  received: number;
  spent: number;
  dayNumber: number;
  totalDays: number;
};

type PeriodsResponse = FinancialPeriod[];
type IncomesResponse = IncomeRecord[];
type ExpensesResponse = ExpenseRecord[];

function dateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function localTodayKey(): string {
  return dateKey(new Date());
}

function dateNumber(value: string): number {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return Math.floor(date.getTime() / 86400000);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function validAmount(value: string | number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function buildSummaries(
  periods: FinancialPeriod[],
  incomes: IncomeRecord[],
  expenses: ExpenseRecord[],
): PeriodSummary[] {
  const today = localTodayKey();
  const todayNumber = dateNumber(today);

  const activePeriods = periods
    .filter((period) => {
      if (period.status !== 'ACTIVE') {
        return false;
      }

      const start = dateKey(period.startDate);
      const end = dateKey(period.endDate);

      return Boolean(start && end && start <= today && end >= today);
    })
    .sort(
      (a, b) =>
        dateNumber(dateKey(b.startDate)) -
        dateNumber(dateKey(a.startDate)),
    );

  return activePeriods.map((period) => {
    const startKey = dateKey(period.startDate);
    const endKey = dateKey(period.endDate);
    const startNumber = dateNumber(startKey);
    const endNumber = dateNumber(endKey);

    // Count only income explicitly assigned to this period.
    // Unallocated income must not be counted by date alone.
    const periodIncomes = incomes.filter((income) => {
      const incomePeriodId = income.periodId ?? income.period?.id;
      return incomePeriodId === period.id;
    });

    const periodExpenses = expenses.filter((expense) => {
      if (expense.periodId) {
        return expense.periodId === period.id;
      }

      // Keep the date fallback for expenses that lack a period ID.
      const spentDate = dateKey(expense.spentAt);
      return spentDate >= startKey && spentDate <= endKey;
    });

    const received = periodIncomes.reduce(
      (total, income) => total + validAmount(income.amount),
      0,
    );

    const spent = periodExpenses.reduce(
      (total, expense) => total + validAmount(expense.amount),
      0,
    );

    return {
      period,
      received,
      spent,
      dayNumber: Math.max(
        1,
        Math.min(
          todayNumber - startNumber + 1,
          endNumber - startNumber + 1,
        ),
      ),
      totalDays: Math.max(1, endNumber - startNumber + 1),
    };
  });
}

export function PeriodCard({
  refreshKey = 0,
}: PeriodCardProps) {
  const { width: windowWidth } = useWindowDimensions();

  const [authReady, setAuthReady] = useState(false);
  const [periods, setPeriods] = useState<FinancialPeriod[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = Math.max(
    260,
    Math.min(windowWidth - 56, 360),
  );

  const loadPeriods = useCallback(async () => {
    if (!hasLoaded) {
      setLoading(true);
    }

    setError('');

    try {
      const [periodResponse, incomeResponse, expenseResponse] =
        await Promise.all([
          apiRequest<PeriodsResponse>('/financial-periods', {
            method: 'GET',
          }),
          apiRequest<IncomesResponse>('/income', {
            method: 'GET',
          }),
          apiRequest<ExpensesResponse>('/expenses', {
            method: 'GET',
          }),
        ]);

      setPeriods(periodResponse);
      setIncomes(incomeResponse);
      setExpenses(expenseResponse);
      setHasLoaded(true);
      setActiveIndex(0);
    } catch {
      setError('Unable to load current periods. Please try again.');
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
      setPeriods([]);
      setIncomes([]);
      setExpenses([]);
      setLoading(false);
      return;
    }

    void loadPeriods();
  }, [authReady, refreshKey, loadPeriods]);

  const summaries = buildSummaries(periods, incomes, expenses);

  const renderPeriod = ({
    item,
  }: ListRenderItemInfo<PeriodSummary>) => {
    const progress = Math.min(
      100,
      Math.max(0, (item.dayNumber / item.totalDays) * 100),
    );

    const remaining = Math.max(0, item.received - item.spent);

    return (
      <View style={[styles.periodCard, { width: cardWidth }]}>
        <View style={styles.cardHeader}>
          <View style={styles.periodTitleContainer}>
            <Text style={styles.periodTitle}>
              {item.period.moneySource?.name ?? 'Current Period'}
            </Text>

            <Text style={styles.periodDates}>
              {formatDate(item.period.startDate)} –{' '}
              {formatDate(item.period.endDate)}
            </Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Received</Text>
            <Text style={styles.receivedAmount}>
              {formatMoney(item.received)}
            </Text>
          </View>

          <View style={styles.amountColumn}>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={styles.spentAmount}>
              {formatMoney(item.spent)}
            </Text>
          </View>
        </View>

        <View style={styles.remainingRow}>
          <Text style={styles.remainingLabel}>Remaining</Text>
          <Text style={styles.remainingAmount}>
            {formatMoney(remaining)}
          </Text>
        </View>

        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Period progress</Text>
          <Text style={styles.progressDay}>
            Day {item.dayNumber} of {item.totalDays}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Current Periods</Text>
      </View>

      {loading && !hasLoaded ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.mutedText}>
            Loading current periods...
          </Text>
        </View>
      ) : error && summaries.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadPeriods()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : summaries.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No current period</Text>
          <Text style={styles.mutedText}>
            Your active financial periods will appear here.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={summaries}
            horizontal
            keyExtractor={(item) => item.period.id}
            renderItem={renderPeriod}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={styles.cardSeparator} />
            )}
            snapToInterval={cardWidth + 12}
            decelerationRate="fast"
            snapToAlignment="start"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(
                event.nativeEvent.contentOffset.x /
                  (cardWidth + 12),
              );

              setActiveIndex(
                Math.max(
                  0,
                  Math.min(nextIndex, summaries.length - 1),
                ),
              );
            }}
            getItemLayout={(_, index) => ({
              length: cardWidth + 12,
              offset: (cardWidth + 12) * index,
              index,
            })}
          />

          {summaries.length > 1 && (
            <View style={styles.pagination}>
              {summaries.map((summary, index) => (
                <View
                  key={summary.period.id}
                  style={[
                    styles.paginationDot,
                    index === activeIndex &&
                      styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          <Text style={styles.swipeHint}>
            Swipe to view other periods
          </Text>

          {error ? (
            <Text style={styles.refreshErrorText}>{error}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

export default PeriodCard;

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
  },
  cardSeparator: {
    width: 12,
  },
  periodCard: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  periodTitleContainer: {
    flex: 1,
  },
  periodTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  periodDates: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountColumn: {
    flex: 1,
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  receivedAmount: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  spentAmount: {
    color: Colors.danger,
    fontSize: 18,
    fontWeight: '700',
  },
  remainingRow: {
    alignItems: 'center',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
  },
  remainingLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  remainingAmount: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  progressDay: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: Colors.border,
    borderRadius: 6,
    height: 7,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: Colors.primary,
    borderRadius: 6,
    height: '100%',
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
  },
  paginationDot: {
    backgroundColor: Colors.border,
    borderRadius: 4,
    height: 7,
    marginHorizontal: 4,
    width: 7,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
  swipeHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
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
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  refreshErrorText: {
    color: Colors.danger,
    fontSize: 12,
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
