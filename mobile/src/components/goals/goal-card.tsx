
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import type { Goal } from '@/types/goal';

interface GoalCardProps {
  goal: Goal;
  updating: boolean;
  onEdit: (goal: Goal) => void;
  onToggleStatus: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

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

export default function GoalCard({
  goal,
  updating,
  onEdit,
  onToggleStatus,
  onDelete,
}: GoalCardProps) {
  const progress = Math.max(
    0,
    Math.min(100, Number(goal.progress) || 0),
  );

  return (
    <View
      style={[
        styles.card,
        !goal.isActive && styles.inactiveCard,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.goalInfo}>
          <Text style={styles.name}>{goal.name}</Text>
          <Text style={styles.bucketName}>{goal.bucket.name}</Text>
        </View>

        <Text
          style={[
            styles.status,
            !goal.isActive && styles.inactiveStatus,
          ]}
        >
          {goal.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.amount}>
          {formatMoney(goal.savedAmount)}
        </Text>
        <Text style={styles.target}>
          of {formatMoney(goal.targetAmount)}
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

      <Text style={styles.progressLabel}>
        {progress.toFixed(1)}% completed
      </Text>

      {goal.targetDate ? (
        <Text style={styles.targetDate}>
          Target date: {goal.targetDate.slice(0, 10)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={updating}
          style={[
            styles.actionButton,
            updating && styles.disabledButton,
          ]}
          onPress={() => onEdit(goal)}
        >
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={updating}
          style={[
            styles.actionButton,
            !goal.isActive && styles.activateButton,
            updating && styles.disabledButton,
          ]}
          onPress={() => onToggleStatus(goal)}
        >
          {updating ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Text
              style={[
                styles.actionText,
                !goal.isActive && styles.activateText,
              ]}
            >
              {goal.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          )}
        </Pressable>
      </View>

      {!goal.isActive && (
        <Pressable
          accessibilityRole="button"
          disabled={updating}
          style={[
            styles.deleteButton,
            updating && styles.disabledButton,
          ]}
          onPress={() => onDelete(goal)}
        >
          <Text style={styles.deleteText}>Delete goal</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  inactiveCard: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  goalInfo: {
    flex: 1,
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  bucketName: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  status: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  inactiveStatus: {
    color: Colors.textSecondary,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 5,
  },
  amount: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  target: {
    color: Colors.textSecondary,
    fontSize: 13,
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
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 7,
  },
  targetDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  actionText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  activateButton: {
    borderColor: Colors.primary,
  },
  activateText: {
    color: Colors.primary,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: 9,
    paddingVertical: 10,
  },
  deleteText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
