import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiRequest } from '@/api';
import { Colors } from '@/constants/colors';
import IncomeHistorySection, {
  formatAmount,
  type IncomeRecord,
} from '@/components/income/IncomeHistorySection';

function getDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return new Date(Number.NaN);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export default function IncomeHistoryScreen() {
  const insets = useSafeAreaInsets();

  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);

  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReceivedAt, setEditReceivedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);

  const loadIncome = useCallback(async () => {
    setLoading(true);
    setScreenError(null);

    try {
      const result = await apiRequest<IncomeRecord[]>('/income');
      setIncomeRecords(result);
    } catch (error) {
      setScreenError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadIncome();
    }, [loadIncome]),
  );

  function startEditing(income: IncomeRecord) {
    setEditingIncomeId(income.id);
    setEditAmount(String(income.amount));
    setEditReceivedAt(getDateInputValue(income.receivedAt));
    setScreenError(null);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    setEditingIncomeId(null);
    setEditAmount('');
    setEditReceivedAt('');
  }

  async function saveEdit(income: IncomeRecord) {
    const parsedAmount = Number(editAmount.trim());

    if (
      !editAmount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }

    const parsedDate = parseLocalDate(editReceivedAt);

    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert(
        'Invalid date',
        'Enter a valid date in YYYY-MM-DD format.',
      );
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedDate > today) {
      Alert.alert(
        'Invalid date',
        'The received date cannot be in the future.',
      );
      return;
    }

    setSaving(true);
    setScreenError(null);

    try {
      const updated = await apiRequest<IncomeRecord>(
        `/income/${income.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            amount: editAmount.trim(),
            receivedAt: editReceivedAt.trim(),
          }),
        },
      );

      setIncomeRecords(current =>
        current.map(item => (item.id === updated.id ? updated : item)),
      );

      setEditingIncomeId(null);
      setEditAmount('');
      setEditReceivedAt('');

      Alert.alert('Income updated', 'Your income record was updated.');
      await loadIncome();
    } catch (error) {
      Alert.alert('Could not update income', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(income: IncomeRecord) {
    Alert.alert(
      'Delete this income?',
      `This will permanently delete the ${formatAmount(income.amount)} ETB income from ${income.moneySource?.name ?? 'this money source'} and remove its allocations. If the allocated money has already been spent or transferred, Birre may reject the deletion to protect your bucket balances. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Income',
          style: 'destructive',
          onPress: () => {
            void deleteIncome(income);
          },
        },
      ],
    );
  }

  async function deleteIncome(income: IncomeRecord) {
    setDeletingIncomeId(income.id);
    setScreenError(null);

    try {
      await apiRequest<{
        message: string;
        id: string;
        deleted: boolean;
      }>(`/income/${income.id}`, {
        method: 'DELETE',
      });

      setIncomeRecords(current =>
        current.filter(item => item.id !== income.id),
      );

      if (editingIncomeId === income.id) {
        setEditingIncomeId(null);
        setEditAmount('');
        setEditReceivedAt('');
      }

      Alert.alert('Income deleted', 'The income record was deleted.');
      await loadIncome();
    } catch (error) {
      Alert.alert('Could not delete income', getErrorMessage(error));
    } finally {
      setDeletingIncomeId(null);
    }
  }

  const totalIncome = incomeRecords.reduce((total, income) => {
    const amount = Number(income.amount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="trending-up"
                size={21}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.summaryLabel}>Total Income</Text>
          </View>

          <Text style={styles.summaryAmount}>
            {formatAmount(totalIncome)}{' '}
            <Text style={styles.summaryCurrency}>ETB</Text>
          </Text>

          <Text style={styles.summaryDescription}>
            {incomeRecords.length}{' '}
            {incomeRecords.length === 1 ? 'record' : 'records'}
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/add-income')}
          accessibilityRole="button"
          accessibilityLabel="Add income"
        >
          <Ionicons
            name="add-circle-outline"
            size={21}
            color="#FFFFFF"
          />
          <Text style={styles.addButtonText}>Add Income</Text>
        </Pressable>

        <IncomeHistorySection
          incomeRecords={incomeRecords}
          loading={loading}
          screenError={screenError}
          editingIncomeId={editingIncomeId}
          editAmount={editAmount}
          editReceivedAt={editReceivedAt}
          saving={saving}
          deletingIncomeId={deletingIncomeId}
          onRetry={() => void loadIncome()}
          onEditAmountChange={setEditAmount}
          onEditReceivedAtChange={setEditReceivedAt}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onSaveEdit={saveEdit}
          onDelete={confirmDelete}
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
  content: {
    paddingHorizontal: 18,
  },
  summaryCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 20,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    width: 36,
    height: 36,
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
    fontSize: 30,
    fontWeight: '800',
    marginTop: 12,
  },
  summaryCurrency: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    minHeight: 50,
    paddingVertical: 14,
    marginTop: 14,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});