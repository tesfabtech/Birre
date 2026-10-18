
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

import { apiRequest, ApiRequestError } from '@/api';
import { Colors } from '@/constants/colors';
import { categoryService } from '@/services/category-service';
import type { Category } from '@/types/category';

import ExpenseFormSections, {
  type ExpenseBucket,
  type ExpenseCategory,
  type ExpenseFinancialPeriod,
  type ExpenseType,
} from '@/components/expenses/expense-form-sections';
import CategoryCreateModal from '@/components/expenses/category-create-modal';

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export default function AddExpenseScreen() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType | ''>('');
  const [note, setNote] = useState('');

  const [buckets, setBuckets] = useState<ExpenseBucket[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [periods, setPeriods] = useState<ExpenseFinancialPeriod[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const [bucketData, categoryData, periodData] = await Promise.all([
        apiRequest<ExpenseBucket[]>('/buckets'),
        categoryService.list(),
        apiRequest<ExpenseFinancialPeriod[]>('/financial-periods'),
      ]);

      setBuckets(bucketData);
      setCategories(categoryData);

      setPeriods(periodData);

      setBucketId(current =>
        bucketData.some(item => item.id === current) ? current : '',
      );

      setCategoryId(current =>
        categoryData.some(item => item.id === current) ? current : '',
      );

      setPeriodId(current =>
        periodData.some(item => item.id === current) ? current : '',
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Failed to load expense options.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
    }, [loadOptions]),
  );

  const todayDate = new Date();
  const today = [
    todayDate.getFullYear(),
    String(todayDate.getMonth() + 1).padStart(2, '0'),
    String(todayDate.getDate()).padStart(2, '0'),
  ].join('-');

  const eligiblePeriods = periods.filter(
    period =>
      period.status === 'ACTIVE' &&
      dateOnly(period.startDate) <= today &&
      dateOnly(period.endDate) >= today,
  );

  const selectedBucket = buckets.find(item => item.id === bucketId);
  const availableBalance = Number(selectedBucket?.balance ?? 0);
  const parsedAmount = Number(amount);

  const isFormValid =
    amount.trim() !== '' &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    categoryId !== '' &&
    bucketId !== '' &&
    eligiblePeriods.some(period => period.id === periodId) &&
    expenseType !== '' &&
    !loading &&
    !saving;

  async function handleCreateCategory(name: string): Promise<boolean> {
    if (creatingCategory) return false;

    setCreatingCategory(true);
    setCategoryError('');

    try {
      const existing = categories.find(
        item => item.name.trim().toLowerCase() === name.toLowerCase(),
      );

      if (existing) {
        setCategoryId(existing.id);
        setCategoryModalVisible(false);
        setCategoryError('');
        return true;
      }

      await categoryService.create(name);

      const updatedCategories = await categoryService.list();
      setCategories(updatedCategories);

      const created = updatedCategories.find(
        item => item.name.trim().toLowerCase() === name.toLowerCase(),
      );

      if (!created) {
        setCategoryError(
          'Category created, but it could not be selected. Please try again.',
        );
        return false;
      }

      setCategoryId(created.id);
      setCategoryModalVisible(false);
      setCategoryError('');
      return true;
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.code === 'CATEGORY_IN_TRASH'
      ) {
        setCategoryError(
          'This category is in the trash. Restore it from Manage Categories before using it.',
        );
      } else {
        setCategoryError(
          error instanceof Error
            ? error.message
            : 'Could not create category. Please try again.',
        );
      }

      return false;
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSave() {
    if (!isFormValid) {
      if (eligiblePeriods.length === 0) {
        Alert.alert(
          'No active financial period',
          'An active financial period covering today is required.',
        );
      } else if (!periodId) {
        Alert.alert('Select a financial period', 'Choose a period first.');
      }
      return;
    }

    if (parsedAmount > availableBalance) {
      Alert.alert(
        'Insufficient balance',
        `Available balance: ${availableBalance.toLocaleString()} ETB`,
      );
      return;
    }

    setSaving(true);

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          bucketId,
          categoryId,
          periodId,
          amount: String(parsedAmount),
          type: expenseType,
          spentAt: today,
          note: note.trim() || null,
        }),
      });

      Alert.alert('Expense saved', 'Your expense has been recorded.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ], { cancelable: false });
    } catch (error) {
      Alert.alert(
        'Could not save expense',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  function openCategoryModal() {
    setCategoryError('');
    setCategoryModalVisible(true);
  }

  function closeCategoryModal() {
    if (creatingCategory) return;

    setCategoryModalVisible(false);
    setCategoryError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {loading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : loadError ? (
          <View style={styles.messageCard}>
            <Ionicons
              name="alert-circle-outline"
              size={25}
              color={Colors.danger}
            />
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => void loadOptions()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ExpenseFormSections
              amount={amount}
              onAmountChange={setAmount}
              categories={categories}
              categoryId={categoryId}
              onCategoryChange={setCategoryId}
              onAddCategory={openCategoryModal}
              buckets={buckets}
              bucketId={bucketId}
              onBucketChange={setBucketId}
              eligiblePeriods={eligiblePeriods}
              periodId={periodId}
              onPeriodChange={setPeriodId}
              expenseType={expenseType}
              onExpenseTypeChange={setExpenseType}
              note={note}
              onNoteChange={setNote}
            />

            <Pressable
              onPress={() => void handleSave()}
              disabled={!isFormValid}
              style={({ pressed }) => [
                styles.saveButton,
                !isFormValid && styles.disabledSaveButton,
                pressed && isFormValid && styles.pressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.saveButtonText}>Save Expense</Text>
                </>
              )}
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.back()} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </ScrollView>

      <CategoryCreateModal
        visible={categoryModalVisible}
        saving={creatingCategory}
        error={categoryError}
        onClose={closeCategoryModal}
        onCreate={handleCreateCategory}
      />
    </KeyboardAvoidingView>
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
    paddingBottom: 32,
  },

  saveButton: {
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 15,
    backgroundColor: Colors.primary,
  },
  disabledSaveButton: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  cancelButton: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  messageCard: {
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
  },
  retryButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
