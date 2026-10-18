
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import type { Goal, GoalBucketOption, GoalInput } from '@/types/goal';

export interface GoalFormValues {
  name: string;
  bucketId: string;
  targetAmount: string;
  targetDate: string;
}

interface GoalFormProps {
  editingGoal: Goal | null;
  availableBuckets: GoalBucketOption[];
  initialValues: GoalFormValues;
  saving: boolean;
  error: string;
  onSave: (values: GoalFormValues) => void;
  onCancel: () => void;
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

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export default function GoalForm({
  editingGoal,
  availableBuckets,
  initialValues,
  saving,
  error,
  onSave,
  onCancel,
}: GoalFormProps) {
  const [form, setForm] = useState<GoalFormValues>(initialValues);
  const [formError, setFormError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateForm = (field: keyof GoalFormValues, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setFormError('');
  };

  const handleSave = () => {
    const name = form.name.trim();
    const targetAmount = form.targetAmount.trim();
    const amount = Number(targetAmount);
    const targetDate = form.targetDate.trim();

    if (!name) {
      setFormError('Enter a name for your goal.');
      return;
    }

    if (!targetAmount || !Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a target amount greater than zero.');
      return;
    }

    if (!form.bucketId) {
      setFormError('Choose a bucket for this goal.');
      return;
    }

    if (!availableBuckets.some(bucket => bucket.id === form.bucketId)) {
      setFormError(
        'Choose an eligible bucket that is not assigned to another active goal.',
      );
      return;
    }

    if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      setFormError('Choose a valid target date.');
      return;
    }

    if (targetDate) {
      const parsedDate = parseLocalDate(targetDate);

      if (
        Number.isNaN(parsedDate.getTime()) ||
        formatLocalDate(parsedDate) !== targetDate
      ) {
        setFormError('Choose a valid calendar date.');
        return;
      }

      if (targetDate < formatLocalDate(getToday())) {
        setFormError('The target date cannot be in the past.');
        return;
      }
    }

    const payload: GoalInput = {
      name,
      bucketId: form.bucketId,
      targetAmount: String(amount),
      targetDate: targetDate || null,
    };

    setFormError('');

    onSave({
      name: payload.name,
      bucketId: payload.bucketId,
      targetAmount: payload.targetAmount,
      targetDate: payload.targetDate ?? '',
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.formHeader}>
        <View style={styles.headerIcon}>
          <Ionicons
            name="flag-outline"
            size={23}
            color={Colors.primary}
          />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.sectionTitle}>
            {editingGoal ? 'Edit goal' : 'Create a goal'}
          </Text>
          <Text style={styles.headerDescription}>
            {editingGoal
              ? 'Update your savings target and details.'
              : 'Set a target and give your savings a purpose.'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.label}>Goal name</Text>
      <TextInput
        style={styles.input}
        value={form.name}
        onChangeText={value => updateForm('name', value)}
        placeholder="e.g. Emergency fund"
        placeholderTextColor={Colors.textSecondary}
        maxLength={80}
        returnKeyType="next"
        editable={!saving}
      />

      <Text style={styles.label}>Target amount</Text>
      <View style={styles.amountInputContainer}>
        <TextInput
          style={styles.amountInput}
          value={form.targetAmount}
          onChangeText={value => updateForm('targetAmount', value)}
          placeholder="10,000"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="decimal-pad"
          returnKeyType="done"
          editable={!saving}
        />
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>ETB</Text>
        </View>
      </View>

      <Text style={styles.label}>Target date</Text>
      <Text style={styles.fieldHint}>
        Optional — choose when you want to reach your goal.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose target date"
        disabled={saving}
        onPress={() => setShowDatePicker(true)}
        style={({ pressed }) => [
          styles.dateInput,
          pressed && styles.pressed,
          showDatePicker && styles.inputFocused,
          saving && styles.disabledButton,
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={Colors.textSecondary}
        />
        <Text
          style={[
            styles.dateText,
            !form.targetDate && styles.placeholderText,
          ]}
        >
          {form.targetDate || 'Choose a date'}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={Colors.textSecondary}
        />
      </Pressable>

      {form.targetDate ? (
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => updateForm('targetDate', '')}
          hitSlop={8}
          style={styles.clearDateButton}
        >
          <Ionicons
            name="close-circle-outline"
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.clearDateText}>Remove date</Text>
        </Pressable>
      ) : null}

      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={
              form.targetDate
                ? parseLocalDate(form.targetDate)
                : getToday()
            }
            mode="date"
            minimumDate={getToday()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, selectedDate) => {
              if (Platform.OS !== 'ios') {
                setShowDatePicker(false);
              }

              if (selectedDate) {
                updateForm('targetDate', formatLocalDate(selectedDate));
              }
            }}
          />

          {Platform.OS === 'ios' && (
            <Pressable
              style={styles.dateDoneButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.dateDoneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.bucketSectionHeader}>
        <Text style={styles.label}>Savings bucket</Text>
        <Text style={styles.requiredLabel}>Required</Text>
      </View>

      <Text style={styles.fieldHint}>
        Choose an eligible bucket for this goal. Each bucket can belong to
        only one active goal.
      </Text>

      {availableBuckets.length === 0 ? (
        <View style={styles.emptyBuckets}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>
            No eligible buckets are available. Activate an eligible bucket
            or deactivate another goal to free its bucket.
          </Text>
        </View>
      ) : (
        <View style={styles.bucketList}>
          {availableBuckets.map(bucket => {
            const selected = form.bucketId === bucket.id;

            return (
              <Pressable
                key={bucket.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                disabled={saving}
                style={({ pressed }) => [
                  styles.bucketOption,
                  selected && styles.bucketOptionSelected,
                  pressed && styles.pressed,
                  saving && styles.disabledOption,
                ]}
                onPress={() => updateForm('bucketId', bucket.id)}
              >
                <View style={styles.bucketIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={21}
                    color={selected ? Colors.primary : Colors.textSecondary}
                  />
                </View>

                <View style={styles.bucketInfo}>
                  <Text
                    style={[
                      styles.bucketOptionName,
                      selected && styles.bucketOptionNameSelected,
                    ]}
                  >
                    {bucket.name}
                  </Text>
                  <Text style={styles.bucketBalance}>
                    Available balance · {formatMoney(bucket.balance)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    selected && styles.radioSelected,
                  ]}
                >
                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {formError ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color="#DC2626"
          />
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color="#DC2626"
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={saving || availableBuckets.length === 0}
        style={({ pressed }) => [
          styles.primaryButton,
          (saving || availableBuckets.length === 0) &&
            styles.disabledButton,
          pressed && !saving && styles.primaryButtonPressed,
        ]}
        onPress={handleSave}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={editingGoal ? 'checkmark-circle-outline' : 'add-circle-outline'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              {editingGoal ? 'Save changes' : 'Create goal'}
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && styles.cancelButtonPressed,
        ]}
        onPress={onCancel}
        disabled={saving}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    marginBottom: 24,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#16A34A12',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  headerDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 15,
    backgroundColor: Colors.background,
  },
  amountInputContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 8,
  },
  amountInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#16A34A12',
  },
  currencyText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
    marginBottom: 10,
  },
  dateInput: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  dateText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
  clearDateText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginTop: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dateDoneText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  bucketSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  requiredLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 16,
  },
  bucketList: {
    gap: 10,
  },
  bucketOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 13,
    padding: 12,
    gap: 11,
  },
  bucketOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#16A34A0D',
  },
  bucketIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B72800D',
  },
  bucketInfo: {
    flex: 1,
  },
  bucketOptionName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  bucketOptionNameSelected: {
    color: Colors.primary,
  },
  bucketBalance: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  radio: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  emptyBuckets: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  emptyText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#DC26260D',
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 13,
    lineHeight: 19,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 22,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 13,
    marginTop: 5,
    borderRadius: 10,
  },
  cancelButtonPressed: {
    backgroundColor: '#6B72800D',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  disabledOption: {
    opacity: 0.6,
  },
});
