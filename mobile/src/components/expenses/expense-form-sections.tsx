
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export type ExpenseBucket = {
  id: string;
  name: string;
  type: string;
  balance: string | number;
};

export type ExpenseCategory = {
  id: string;
  name: string;
};

export type ExpenseFinancialPeriod = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  moneySource?: {
    name?: string;
  } | null;
};

export type ExpenseType = 'NEED' | 'WANT';

type Props = {
  amount: string;
  onAmountChange: (value: string) => void;
  categories: ExpenseCategory[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  onAddCategory: () => void;
  buckets: ExpenseBucket[];
  bucketId: string;
  onBucketChange: (id: string) => void;
  eligiblePeriods: ExpenseFinancialPeriod[];
  periodId: string;
  onPeriodChange: (id: string) => void;
  expenseType: ExpenseType | '';
  onExpenseTypeChange: (type: ExpenseType) => void;
  note: string;
  onNoteChange: (value: string) => void;
};

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function formatDate(value: string): string {
  const [year, month, day] = dateOnly(value).split('-');
  return `${day}/${month}/${year}`;
}

export default function ExpenseFormSections({
  amount,
  onAmountChange,
  categories,
  categoryId,
  onCategoryChange,
  onAddCategory,
  buckets,
  bucketId,
  onBucketChange,
  eligiblePeriods,
  periodId,
  onPeriodChange,
  expenseType,
  onExpenseTypeChange,
  note,
  onNoteChange,
}: Props) {
  return (
    <>
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Amount</Text>

        <View style={styles.amountRow}>
          <TextInput
            value={amount}
            onChangeText={value =>
              onAmountChange(value.replace(/[^0-9.]/g, ''))
            }
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            style={styles.amountInput}
          />
          <Text style={styles.currency}>ETB</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Category</Text>

          <Pressable
            style={styles.addCategoryButton}
            onPress={onAddCategory}
            accessibilityRole="button"
            accessibilityLabel="Create category"
          >
            <Ionicons name="add" size={19} color="#FFFFFF" />
          </Pressable>
        </View>

        {categories.length === 0 ? (
          <Pressable
            style={styles.emptyOption}
            onPress={onAddCategory}
          >
            <Ionicons
              name="add-circle-outline"
              size={22}
              color={Colors.primary}
            />
            <Text style={styles.emptyOptionText}>
              Create your first category
            </Text>
          </Pressable>
        ) : (
          <View style={styles.optionsContainer}>
            {categories.map(item => {
              const selected = categoryId === item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onCategoryChange(item.id)}
                  style={[
                    styles.categoryOption,
                    selected && styles.selectedOption,
                  ]}
                >
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={Colors.primary}
                    />
                  )}
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.selectedOptionText,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Paid From</Text>

        {buckets.length === 0 ? (
          <Text style={styles.helperText}>
            No money buckets available.
          </Text>
        ) : (
          <View style={styles.listCard}>
            {buckets.map((item, index) => {
              const selected = bucketId === item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => onBucketChange(item.id)}
                  style={[
                    styles.listOption,
                    index === buckets.length - 1 && styles.lastOption,
                    selected && styles.selectedListOption,
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name="wallet-outline"
                      size={20}
                      color={
                        selected
                          ? Colors.primary
                          : Colors.textSecondary
                      }
                    />
                  </View>

                  <View style={styles.listOptionInfo}>
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.selectedOptionText,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.balanceText}>
                      {Number(item.balance).toLocaleString()} ETB
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selected
                        ? 'radio-button-on'
                        : 'radio-button-off'
                    }
                    size={21}
                    color={selected ? Colors.primary : '#D1D5DB'}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Financial Period</Text>

        {eligiblePeriods.length === 0 ? (
          <View style={styles.warningCard}>
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#B45309"
            />
            <Text style={styles.warningText}>
              No active period covers today.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {eligiblePeriods.map((period, index) => {
              const selected = periodId === period.id;

              return (
                <Pressable
                  key={period.id}
                  onPress={() => onPeriodChange(period.id)}
                  style={[
                    styles.listOption,
                    index === eligiblePeriods.length - 1 &&
                      styles.lastOption,
                    selected && styles.selectedListOption,
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={
                        selected
                          ? Colors.primary
                          : Colors.textSecondary
                      }
                    />
                  </View>

                  <View style={styles.listOptionInfo}>
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.selectedOptionText,
                      ]}
                    >
                      {period.moneySource?.name || 'Financial period'}
                    </Text>
                    <Text style={styles.balanceText}>
                      {formatDate(period.startDate)} –{' '}
                      {formatDate(period.endDate)}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selected
                        ? 'radio-button-on'
                        : 'radio-button-off'
                    }
                    size={21}
                    color={selected ? Colors.primary : '#D1D5DB'}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Expense Type</Text>

        <View style={styles.typeContainer}>
          <Pressable
            onPress={() => onExpenseTypeChange('NEED')}
            style={[
              styles.typeOption,
              expenseType === 'NEED' && styles.selectedTypeOption,
            ]}
          >
            <View
              style={[
                styles.typeIcon,
                expenseType === 'NEED' && styles.selectedTypeIcon,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color={
                  expenseType === 'NEED'
                    ? Colors.primary
                    : Colors.textSecondary
                }
              />
            </View>
            <Text
              style={[
                styles.typeTitle,
                expenseType === 'NEED' && styles.selectedOptionText,
              ]}
            >
              Need
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onExpenseTypeChange('WANT')}
            style={[
              styles.typeOption,
              expenseType === 'WANT' && styles.selectedTypeOption,
            ]}
          >
            <View
              style={[
                styles.typeIcon,
                expenseType === 'WANT' && styles.selectedTypeIcon,
              ]}
            >
              <Ionicons
                name="heart-outline"
                size={21}
                color={
                  expenseType === 'WANT'
                    ? Colors.primary
                    : Colors.textSecondary
                }
              />
            </View>
            <Text
              style={[
                styles.typeTitle,
                expenseType === 'WANT' && styles.selectedOptionText,
              ]}
            >
              Want
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>
          Note <Text style={styles.optional}>(Optional)</Text>
        </Text>

        <TextInput
          value={note}
          onChangeText={onNoteChange}
          placeholder="Add a note"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.noteInput}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  amountCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amountInput: {
    flex: 1,
    color: Colors.primary,
    fontSize: 34,
    fontWeight: '800',
    paddingVertical: 4,
  },
  currency: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  addCategoryButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -7,
    marginBottom: 5,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  selectedOption: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  emptyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 15,
  },
  emptyOptionText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    paddingHorizontal: 13,
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  selectedListOption: {
    backgroundColor: '#FAFFF9',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listOptionInfo: {
    flex: 1,
  },
  balanceText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 17,
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  selectedTypeOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  selectedTypeIcon: {
    backgroundColor: '#FFFFFF',
  },
  typeTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  optional: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  noteInput: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 13,
  },
  warningText: {
    color: '#B45309',
    fontSize: 13,
    flex: 1,
  },
});
