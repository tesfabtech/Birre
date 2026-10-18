
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { apiRequest } from '@/api';
import { Colors } from '@/constants/colors';

type Expense = {
  id: string;
  amount: string | number;
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

type SpendingSummaryProps = {
  refreshKey?: number;
};

function parseExpenseDate(value: string): Date {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function formatDate(value: string): string {
  const date = parseExpenseDate(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const today = new Date();

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

export default function SpendingSummary({
  refreshKey = 0,
}: SpendingSummaryProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadExpenses = useCallback(async () => {
    setError(false);

    try {
      const data = await apiRequest<Expense[]>('/expenses');
      setExpenses(
        [...data].sort((a, b) => {
          return (
            parseExpenseDate(b.spentAt).getTime() -
            parseExpenseDate(a.spentAt).getTime()
          );
        }),
      );
    } catch (err) {
      console.error('[SpendingSummary] Failed to load expenses:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function load() {
        setLoading(true);
        setError(false);

        try {
          const data = await apiRequest<Expense[]>('/expenses');

          if (isActive) {
            setExpenses(
              [...data].sort((a, b) => {
                return (
                  parseExpenseDate(b.spentAt).getTime() -
                  parseExpenseDate(a.spentAt).getTime()
                );
              }),
            );
          }
        } catch (err) {
          console.error('[SpendingSummary] Failed to load expenses:', err);

          if (isActive) {
            setError(true);
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        isActive = false;
      };
    }, [refreshKey]),
  );

  const recentExpenses = expenses.slice(0, 5);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recent Expenses</Text>
          <Text style={styles.subtitle}>Your latest spending</Text>
        </View>

        <Pressable
          style={styles.viewAllButton}
          onPress={() => router.push('/(tabs)/expenses')}
          accessibilityRole="button"
          accessibilityLabel="View all expenses"
          hitSlop={8}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <Ionicons
            name="chevron-forward"
            size={15}
            color={Colors.primary}
          />
        </Pressable>
      </View>

      <View style={styles.list}>
        {loading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.statusText}>Loading expenses...</Text>
          </View>
        ) : error ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Unable to load recent expenses.
            </Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void loadExpenses();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : recentExpenses.length === 0 ? (
          <View style={styles.statusContainer}>
            <Ionicons
              name="receipt-outline"
              size={26}
              color={Colors.textSecondary}
            />
            <Text style={styles.statusText}>No expenses recorded yet.</Text>
            <Pressable
              style={styles.addExpenseButton}
              onPress={() => router.push('/add-expense')}
              accessibilityRole="button"
            >
              <Text style={styles.addExpenseText}>Add your first expense</Text>
            </Pressable>
          </View>
        ) : (
          recentExpenses.map((expense, index) => (
            <View
              key={expense.id}
              style={[
                styles.expenseRow,
                index === recentExpenses.length - 1 && styles.lastExpenseRow,
              ]}
            >
              <View style={styles.expenseIcon}>
                <Ionicons
                  name="arrow-up-right-box"
                  size={19}
                  color="#DC2626"
                />
              </View>

              <View style={styles.expenseInfo}>
                <Text style={styles.category} numberOfLines={1}>
                  {expense.category?.name ?? 'Uncategorized'}
                </Text>

                <Text style={styles.description} numberOfLines={1}>
                  {expense.note?.trim() ||
                    expense.bucket?.name ||
                    'Expense'}
                </Text>

                <Text style={styles.date}>
                  {formatDate(expense.spentAt)}
                </Text>
              </View>

              <Text style={styles.amount} numberOfLines={1}>
                -{formatAmount(expense.amount)} ETB
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  title: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
  },

  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingLeft: 8,
  },

  viewAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },

  lastExpenseRow: {
    borderBottomWidth: 0,
  },

  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  expenseInfo: {
    flex: 1,
    minWidth: 0,
  },

  category: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  description: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },

  date: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  amount: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },

  statusContainer: {
    minHeight: 105,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },

  statusText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },

  retryText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    padding: 4,
  },

  addExpenseButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 3,
  },

  addExpenseText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
