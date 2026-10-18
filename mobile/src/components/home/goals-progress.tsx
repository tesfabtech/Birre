import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { apiRequest } from '@/api';
import type { Goal } from '@/types/goal';

function formatMoney(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0.00 ETB';
  }

  return `${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ETB`;
}

export default function GoalsProgress() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGoals = useCallback(async () => {
    try {
      setError('');

      const response = await apiRequest<Goal[]>('/goals');
      setGoals(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load your goals.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGoals();
    }, [loadGoals]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Goals</Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/goals')}
          hitSlop={8}
        >
          <Text style={styles.manageText}>Manage goals</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {loading ? (
          <View style={styles.messageContainer}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.message}>Loading goals...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{error}</Text>

            <Pressable onPress={() => void loadGoals()} hitSlop={8}>
              <Text style={styles.manageText}>Try again</Text>
            </Pressable>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              You haven't created any goals yet.
            </Text>

            <Pressable
              onPress={() => router.push('/goals')}
              style={styles.createButton}
            >
              <Text style={styles.createButtonText}>Create your first goal</Text>
            </Pressable>
          </View>
        ) : (
          goals.map((goal, index) => {
            const progress = Math.max(
              0,
              Math.min(100, Number(goal.progress) || 0),
            );

            return (
              <View
                key={goal.id}
                style={[
                  styles.goal,
                  index === goals.length - 1 && styles.lastGoal,
                ]}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleContainer}>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.bucketName}>
                      {goal.bucket.name}
                    </Text>
                  </View>

                  <Text style={styles.percentage}>
                    {progress.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%` },
                    ]}
                  />
                </View>

                <Text style={styles.amount}>
                  {formatMoney(goal.savedAmount)} /{' '}
                  {formatMoney(goal.targetAmount)}
                </Text>

                {progress >= 100 && (
                  <Text style={styles.completedText}>
                    Target reached!
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  manageText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
  },

  goal: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  lastGoal: {
    borderBottomWidth: 0,
  },

  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  goalTitleContainer: {
    flex: 1,
  },

  goalName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  bucketName: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },

  percentage: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  progressBackground: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },

  amount: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },

  messageContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },

  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },

  createButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  completedText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});