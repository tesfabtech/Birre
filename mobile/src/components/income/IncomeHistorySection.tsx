import React, { useState } from 'react';
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
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';

export type IncomeAllocation = {
  id: string;
  amount: string | number;
  percentage: string | number | null;
  bucket: {
    id: string;
    name: string;
  };
};

export type IncomeRecord = {
  id: string;
  amount: string | number;
  type: string;
  receivedAt: string;
  note: string | null;
  moneySource: {
    id: string;
    name: string;
  };
  period?: {
    id: string;
    startDate: string;
    endDate: string;
  } | null;
  allocations: IncomeAllocation[];
};

interface IncomeHistorySectionProps {
  incomeRecords: IncomeRecord[];
  loading: boolean;
  screenError: string | null;
  editingIncomeId: string | null;
  editAmount: string;
  editReceivedAt: string;
  saving: boolean;
  deletingIncomeId: string | null;
  onRetry: () => void;
  onEditAmountChange: (value: string) => void;
  onEditReceivedAtChange: (value: string) => void;
  onStartEditing: (income: IncomeRecord) => void;
  onCancelEditing: () => void;
  onSaveEdit: (income: IncomeRecord) => void;
  onDelete: (income: IncomeRecord) => void;
}

export function formatAmount(value: string | number): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0';
  }

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

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

function formatDate(value: string): string {
  const date = parseLocalDate(getDateInputValue(value));

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function IncomeHistorySection({
  incomeRecords,
  loading,
  screenError,
  editingIncomeId,
  editAmount,
  editReceivedAt,
  saving,
  deletingIncomeId,
  onRetry,
  onEditAmountChange,
  onEditReceivedAtChange,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onDelete,
}: IncomeHistorySectionProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parsedEditDate = parseLocalDate(editReceivedAt);
  const datePickerValue = Number.isNaN(parsedEditDate.getTime())
    ? new Date()
    : parsedEditDate;

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      onEditReceivedAtChange(formatDateForInput(selectedDate));
    }
  }

  function openDatePicker() {
    if (!saving) {
      setShowDatePicker(true);
    }
  }

  function closeDatePicker() {
    setShowDatePicker(false);
  }

  return (
    <View style={styles.historySection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Income History</Text>

        {!loading && !screenError ? (
          <Text style={styles.recordCount}>{incomeRecords.length}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.statusCard}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.statusText}>Loading income...</Text>
        </View>
      ) : screenError ? (
        <View style={styles.statusCard}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color="#B91C1C"
          />
          <Text style={styles.errorText}>{screenError}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : incomeRecords.length === 0 ? (
        <View style={styles.statusCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="wallet-outline"
              size={30}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>No income yet</Text>

          <Text style={styles.statusText}>
            Your recorded income will appear here.
          </Text>
        </View>
      ) : (
        incomeRecords.map(income => {
          const isEditing = editingIncomeId === income.id;
          const isDeleting = deletingIncomeId === income.id;

          return (
            <View key={income.id} style={styles.incomeCard}>
              <View style={styles.incomeHeader}>
                <View style={styles.incomeIcon}>
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={Colors.primary}
                  />
                </View>

                <View style={styles.incomeInfo}>
                  <Text style={styles.sourceName}>
                    {income.moneySource?.name ?? 'Money source'}
                  </Text>

                  <Text style={styles.incomeDate}>
                    {formatDate(income.receivedAt)}
                  </Text>
                </View>

                <Text style={styles.incomeAmount}>
                  +{formatAmount(income.amount)}
                  {'\n'}
                  <Text style={styles.amountCurrency}>ETB</Text>
                </Text>
              </View>

              <View style={styles.typeRow}>
                <View
                  style={[
                    styles.typeBadge,
                    income.type === 'REGULAR'
                      ? styles.regularBadge
                      : styles.occasionalBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      income.type === 'REGULAR'
                        ? styles.regularText
                        : styles.occasionalText,
                    ]}
                  >
                    {income.type === 'REGULAR' ? 'Regular' : 'Occasional'}
                  </Text>
                </View>
              </View>

              {income.note?.trim() ? (
                <Text style={styles.noteText}>{income.note.trim()}</Text>
              ) : null}

              {income.allocations?.length ? (
                <View style={styles.allocationsSection}>
                  <Text style={styles.allocationsTitle}>ALLOCATIONS</Text>

                  {income.allocations.map(allocation => (
                    <View key={allocation.id} style={styles.allocationRow}>
                      <View style={styles.allocationNameRow}>
                        <View style={styles.allocationDot} />

                        <Text style={styles.allocationBucket}>
                          {allocation.bucket?.name ?? 'Bucket'}
                        </Text>
                      </View>

                      <Text style={styles.allocationAmount}>
                        {formatAmount(allocation.amount)} ETB
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {isEditing ? (
                <View style={styles.editForm}>
                  <Text style={styles.inputLabel}>Amount (ETB)</Text>

                  <TextInput
                    style={styles.input}
                    value={editAmount}
                    onChangeText={onEditAmountChange}
                    keyboardType="decimal-pad"
                    placeholder="Enter amount"
                    placeholderTextColor={Colors.textSecondary}
                    editable={!saving}
                  />

                  <Text style={styles.inputLabel}>Received date</Text>

                  <Pressable
                    style={[
                      styles.datePickerButton,
                      saving && styles.disabledButton,
                    ]}
                    onPress={openDatePicker}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel="Choose received date"
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={Colors.primary}
                    />

                    <Text
                      style={[
                        styles.datePickerText,
                        Number.isNaN(parsedEditDate.getTime()) &&
                          styles.datePickerPlaceholder,
                      ]}
                    >
                      {Number.isNaN(parsedEditDate.getTime())
                        ? 'Select date'
                        : formatDateForDisplay(parsedEditDate)}
                    </Text>

                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </Pressable>

                  {showDatePicker ? (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={datePickerValue}
                        mode="date"
                        display={
                          Platform.OS === 'ios' ? 'inline' : 'calendar'
                        }
                        maximumDate={new Date()}
                        onChange={handleDateChange}
                        disabled={saving}
                      />

                      {Platform.OS === 'ios' ? (
                        <Pressable
                          style={styles.datePickerDoneButton}
                          onPress={closeDatePicker}
                        >
                          <Text style={styles.datePickerDoneText}>Done</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        closeDatePicker();
                        onCancelEditing();
                      }}
                      disabled={saving}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.saveButton,
                        saving && styles.disabledButton,
                      ]}
                      onPress={() => {
                        closeDatePicker();
                        onSaveEdit(income);
                      }}
                      disabled={saving}
                      accessibilityRole="button"
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() => {
                      closeDatePicker();
                      onStartEditing(income);
                    }}
                    disabled={saving || isDeleting}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={Colors.primary}
                    />

                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.deleteButton,
                      isDeleting && styles.disabledButton,
                    ]}
                    onPress={() => onDelete(income)}
                    disabled={saving || isDeleting}
                    accessibilityRole="button"
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#B91C1C" />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#B91C1C"
                        />

                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  historySection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  recordCount: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  retryButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  incomeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  incomeIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeInfo: {
    flex: 1,
  },
  sourceName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  incomeDate: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  incomeAmount: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 21,
  },
  amountCurrency: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  regularBadge: {
    backgroundColor: '#DCFCE7',
  },
  occasionalBadge: {
    backgroundColor: '#F3F4F6',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  regularText: {
    color: '#166534',
  },
  occasionalText: {
    color: '#4B5563',
  },
  noteText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  allocationsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 13,
    paddingTop: 12,
  },
  allocationsTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    gap: 10,
  },
  allocationNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  allocationBucket: {
    color: Colors.text,
    fontSize: 13,
    flex: 1,
  },
  allocationAmount: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  editForm: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 14,
    paddingTop: 12,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: '#FFFFFF',
  },
  datePickerButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  datePickerText: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
  },
  datePickerPlaceholder: {
    color: Colors.textSecondary,
  },
  datePickerContainer: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  datePickerDoneButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  datePickerDoneText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    minWidth: 100,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
});