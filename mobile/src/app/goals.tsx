import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { apiRequest } from '@/api';
import type { Goal, GoalBucketOption, GoalInput } from '@/types/goal';
import type { Bucket } from '@/types/bucket';
import GoalCard from '@/components/goals/goal-card';
import GoalForm, {
  type GoalFormValues,
} from '@/components/goals/goal-form';

const EMPTY_FORM: GoalFormValues = {
  name: '',
  bucketId: '',
  targetAmount: '',
  targetDate: '',
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [buckets, setBuckets] = useState<GoalBucketOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<GoalFormValues>(EMPTY_FORM);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError('');

      const [goalResponse, bucketResponse] = await Promise.all([
        apiRequest<Goal[]>('/goals?includeInactive=true'),
        apiRequest<Bucket[]>('/buckets'),
      ]);

      setGoals(goalResponse);

      setBuckets(
        bucketResponse.map(bucket => ({
          id: bucket.id,
          name: bucket.name,
          type: bucket.type,
          isActive: bucket.isActive,
          balance: bucket.currentBalance ?? bucket.balance ?? '0',
        })),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const openCreateForm = () => {
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      bucketId: goal.bucketId,
      targetAmount: String(goal.targetAmount),
      targetDate: goal.targetDate?.slice(0, 10) ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingGoal(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const availableBuckets = buckets.filter(bucket => {
    if (
      !bucket.isActive ||
      ['UNALLOCATED', 'ESSENTIAL', 'FLEXIBLE'].includes(bucket.type)
    ) {
      return false;
    }

    const assignedToAnotherActiveGoal = goals.some(
      goal =>
        goal.isActive &&
        goal.bucketId === bucket.id &&
        goal.id !== editingGoal?.id,
    );

    return !assignedToAnotherActiveGoal;
  });

  const saveGoal = async (values: GoalFormValues) => {
    const payload: GoalInput = {
      name: values.name.trim(),
      bucketId: values.bucketId,
      targetAmount: String(Number(values.targetAmount.trim())),
      targetDate: values.targetDate.trim() || null,
    };

    setSaving(true);
    setFormError('');

    try {
      if (editingGoal) {
        await apiRequest<Goal>(`/goals/${editingGoal.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<Goal>('/goals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      closeForm();
      await loadData();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleGoalStatus = (goal: Goal) => {
    const nextStatus = !goal.isActive;

    Alert.alert(
      nextStatus ? 'Activate goal?' : 'Deactivate goal?',
      nextStatus
        ? 'This goal will become active again. Its bucket must be available.'
        : 'This goal will be deactivated, and its bucket can be assigned to another active goal.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextStatus ? 'Activate' : 'Deactivate',
          style: nextStatus ? 'default' : 'destructive',
          onPress: async () => {
            setUpdatingGoalId(goal.id);

            try {
              await apiRequest<Goal>(`/goals/${goal.id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: nextStatus }),
              });

              await loadData();
            } catch (err) {
              Alert.alert('Could not update goal', getErrorMessage(err));
            } finally {
              setUpdatingGoalId(null);
            }
          },
        },
      ],
    );
  };

  const deleteGoal = (goal: Goal) => {
    if (goal.isActive) {
      Alert.alert(
        'Cannot delete active goal',
        'Deactivate this goal before deleting it.',
      );
      return;
    }

    Alert.alert(
      'Delete goal?',
      `Are you sure you want to delete "${goal.name}"? This cannot be undone. The bucket and its financial transactions will be kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setUpdatingGoalId(goal.id);

            try {
              await apiRequest<{ message: string }>(`/goals/${goal.id}`, {
                method: 'DELETE',
              });

              await loadData();
            } catch (err) {
              Alert.alert('Could not delete goal', getErrorMessage(err));
            } finally {
              setUpdatingGoalId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!showForm && (
          <Pressable
            accessibilityRole="button"
            style={styles.primaryButton}
            onPress={openCreateForm}
          >
            <Text style={styles.primaryButtonText}>+ Create goal</Text>
          </Pressable>
        )}

        {showForm && (
          <GoalForm
            key={editingGoal?.id ?? 'new-goal'}
            editingGoal={editingGoal}
            availableBuckets={availableBuckets}
            initialValues={form}
            saving={saving}
            error={formError}
            onSave={values => void saveGoal(values)}
            onCancel={closeForm}
          />
        )}

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadData()}>
              <Text style={styles.linkText}>Try again</Text>
            </Pressable>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptyText}>
              Create a goal and connect it to a bucket to start tracking your
              savings.
            </Text>
          </View>
        ) : (
          <View style={styles.goalsList}>
            <Text style={styles.sectionTitle}>Your goals</Text>

            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                updating={updatingGoalId === goal.id}
                onEdit={openEditForm}
                onToggleStatus={toggleGoalStatus}
                onDelete={deleteGoal}
              />
            ))}
          </View>
        )}
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
    padding: 20,
    paddingBottom: 24,
    paddingTop: 24,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loader: {
    marginTop: 28,
  },
  messageCard: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    marginTop: 8,
    gap: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginVertical: 10,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  goalsList: {
    marginTop: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
});