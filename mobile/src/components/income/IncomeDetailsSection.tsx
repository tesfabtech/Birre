
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import type { IncomeType } from './income-types';

type IncomeDetailsSectionProps = {
  incomeType: IncomeType;
  amount: string;
  receivedAt: string;
  note: string;
  disabled?: boolean;
  onAmountChange: (value: string) => void;
  onReceivedAtChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  return new Date();
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  return parseDate(value).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function IncomeDetailsSection({
  incomeType,
  amount,
  receivedAt,
  note,
  disabled = false,
  onAmountChange,
  onReceivedAtChange,
  onNoteChange,
}: IncomeDetailsSectionProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDate = parseDate(receivedAt);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const handleDateChange = (
    event: DateTimePickerEvent,
    date?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type !== 'set' || !date) {
      return;
    }

    const chosenDate = new Date(date);
    chosenDate.setHours(12, 0, 0, 0);

    onReceivedAtChange(formatDate(chosenDate));
  };

  return (
    <View>
      <Text style={styles.label}>Amount (ETB)</Text>

      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={onAmountChange}
        placeholder="e.g. 5000"
        placeholderTextColor={Colors.textSecondary}
        keyboardType="decimal-pad"
        returnKeyType="done"
        editable={!disabled}
        accessibilityLabel="Income amount in ETB"
      />

      <Text style={styles.label}>Date received</Text>

      <Pressable
        style={({ pressed }) => [
          styles.dateButton,
          disabled && styles.disabledButton,
          pressed && !disabled && styles.pressedButton,
        ]}
        onPress={() => setShowDatePicker(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Date received: ${formatDisplayDate(receivedAt)}`}
        accessibilityHint="Opens the calendar to choose the date income was received"
      >
        <View style={styles.dateContent}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.dateText}>
            {formatDisplayDate(receivedAt)}
          </Text>
        </View>

        <Ionicons
          name="chevron-down"
          size={18}
          color={Colors.textSecondary}
        />
      </Pressable>

      <Text style={styles.helperText}>
        Choose the date you actually received this income. Past dates are
        allowed; future dates are not.
      </Text>

      {showDatePicker && (
        <View style={styles.datePickerContainer}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
            maximumDate={today}
            onChange={handleDateChange}
          />

          {Platform.OS === 'ios' && (
            <Pressable
              style={styles.datePickerDone}
              onPress={() => setShowDatePicker(false)}
              accessibilityRole="button"
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={styles.label}>Note (optional)</Text>

      <TextInput
        style={[styles.input, styles.noteInput]}
        value={note}
        onChangeText={onNoteChange}
        placeholder="What was this income for?"
        placeholderTextColor={Colors.textSecondary}
        multiline
        maxLength={500}
        textAlignVertical="top"
        editable={!disabled}
        accessibilityLabel="Optional income note"
      />

      <View style={styles.allocationNotice}>
        <View style={styles.noticeHeading}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.noticeTitle}>
            How your income is allocated
          </Text>
        </View>

        <Text style={styles.noticeText}>
          {incomeType === 'REGULAR'
            ? 'Birre will distribute this income using your saved allocation plan.'
            : 'Birre will place the entire amount in your Unallocated bucket.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 15,
  },
  dateButton: {
    minHeight: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressedButton: {
    opacity: 0.8,
  },
  datePickerContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  datePickerDoneText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  noteInput: {
    minHeight: 90,
  },
  allocationNotice: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 15,
    marginTop: 22,
  },
  noticeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeTitle: {
    flex: 1,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
});
