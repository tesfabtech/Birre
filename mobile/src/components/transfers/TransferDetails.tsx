
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import type { AllocationPlanBucket } from '../../types/allocation-plan';

type TransferDetailsProps = {
  buckets: AllocationPlanBucket[];
  bucketBalances: Record<string, string>;
  fromBucketId: string;
  toBucketId: string;
  amount: string;
  note: string;
  submitting: boolean;
  error: string;
  success: string;
  onFromBucketChange: (bucketId: string) => void;
  onToBucketChange: (bucketId: string) => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
};

function formatAmount(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return '0.00';

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransferDetails({
  buckets,
  bucketBalances,
  fromBucketId,
  toBucketId,
  amount,
  note,
  submitting,
  error,
  success,
  onFromBucketChange,
  onToBucketChange,
  onAmountChange,
  onNoteChange,
  onSubmit,
}: TransferDetailsProps) {
  const fromBucket = buckets.find((bucket) => bucket.id === fromBucketId);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Transfer details</Text>

      {buckets.length < 2 ? (
        <View style={styles.emptyBuckets}>
          <View style={styles.emptyBucketsIcon}>
            <Ionicons
              name="wallet-outline"
              size={28}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.emptyBucketsTitle}>Not enough buckets</Text>

          <Text style={styles.emptyBucketsText}>
            You need at least two active buckets to transfer money.
          </Text>

          <Text style={styles.emptyBucketsHint}>
            Add another active bucket to enable transfers.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Transfer From</Text>

          <View style={styles.bucketOptions}>
            {buckets.map((bucket) => {
              const selected = bucket.id === fromBucketId;

              return (
                <Pressable
                  key={`from-${bucket.id}`}
                  style={[
                    styles.bucketOption,
                    selected && styles.bucketOptionSelected,
                  ]}
                  onPress={() => onFromBucketChange(bucket.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.bucketOptionTop}>
                    <Ionicons
                      name="wallet-outline"
                      size={17}
                      color={
                        selected ? Colors.primary : Colors.textSecondary
                      }
                    />

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color={Colors.primary}
                      />
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.bucketOptionName,
                      selected && styles.bucketOptionNameSelected,
                    ]}
                  >
                    {bucket.name}
                  </Text>

                  <Text style={styles.bucketBalance}>
                    {bucketBalances[bucket.id] !== undefined
                      ? `${formatAmount(bucketBalances[bucket.id])} ETB`
                      : 'Available balance'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.swapDivider}>
            <View style={styles.dividerLine} />

            <View style={styles.swapIconCircle}>
              <Ionicons
                name="swap-vertical"
                size={20}
                color={Colors.primary}
              />
            </View>

            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.label}>Transfer To</Text>

          <View style={styles.bucketOptions}>
            {buckets.map((bucket) => {
              const selected = bucket.id === toBucketId;
              const disabled = bucket.id === fromBucketId;

              return (
                <Pressable
                  key={`to-${bucket.id}`}
                  style={[
                    styles.bucketOption,
                    selected && styles.bucketOptionSelected,
                    disabled && styles.bucketOptionDisabled,
                  ]}
                  onPress={() => onToBucketChange(bucket.id)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                >
                  <View style={styles.bucketOptionTop}>
                    <Ionicons
                      name="wallet-outline"
                      size={17}
                      color={
                        disabled
                          ? Colors.textSecondary
                          : selected
                            ? Colors.primary
                            : Colors.textSecondary
                      }
                    />

                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color={Colors.primary}
                      />
                    )}

                    {disabled && (
                      <Ionicons
                        name="ban-outline"
                        size={16}
                        color={Colors.textSecondary}
                      />
                    )}
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.bucketOptionName,
                      selected && styles.bucketOptionNameSelected,
                    ]}
                  >
                    {bucket.name}
                  </Text>

                  <Text style={styles.bucketBalance}>
                    {disabled
                      ? 'Same as source'
                      : selected
                        ? 'Selected destination'
                        : 'Choose destination'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Amount (ETB)</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>ETB</Text>

            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={onAmountChange}
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="done"
              accessibilityLabel="Transfer amount in ETB"
            />
          </View>

          {fromBucket && bucketBalances[fromBucket.id] !== undefined && (
            <Text style={styles.helperText}>
              Available in {fromBucket.name}:{' '}
              {formatAmount(bucketBalances[fromBucket.id])} ETB
            </Text>
          )}

          <Text style={styles.label}>Note (optional)</Text>

          <View style={[styles.inputContainer, styles.noteInputContainer]}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={onNoteChange}
              placeholder="What is this transfer for?"
              placeholderTextColor={Colors.textSecondary}
              multiline
              maxLength={250}
              textAlignVertical="top"
              accessibilityLabel="Transfer note"
            />
          </View>

          {!!error && (
            <View style={styles.messageError}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={Colors.danger}
              />

              <Text style={styles.messageErrorText}>{error}</Text>
            </View>
          )}

          {!!success && (
            <View style={styles.messageSuccess}>
              <Ionicons
                name="checkmark-circle-outline"
                size={19}
                color="#15803D"
              />

              <Text style={styles.messageSuccessText}>{success}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.submitButtonText}>Transfer money</Text>
              </>
            )}
          </Pressable>

          <View style={styles.footnote}>
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={Colors.textSecondary}
            />

            <Text style={styles.footnoteText}>
              Transfers move money between buckets and do not count as new
              income or an expense.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 9,
    marginTop: 17,
  },
  bucketOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bucketOption: {
    width: '48%',
    flexGrow: 1,
    minWidth: 125,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 8,
  },
  bucketOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bucketOptionDisabled: {
    opacity: 0.45,
  },
  bucketOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bucketOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  bucketOptionNameSelected: {
    color: Colors.primary,
  },
  bucketBalance: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  swapDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  swapIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  inputContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: Colors.background,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  noteInputContainer: {
    alignItems: 'flex-start',
    minHeight: 92,
    paddingTop: 10,
    paddingBottom: 10,
  },
  noteInput: {
    flex: 1,
    width: '100%',
    minHeight: 68,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  helperText: {
    marginTop: 7,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  messageError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  messageErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.danger,
  },
  messageSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  messageSuccessText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#15803D',
  },
  submitButton: {
    minHeight: 52,
    marginTop: 22,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 15,
  },
  footnoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  emptyBuckets: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  emptyBucketsIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyBucketsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptyBucketsText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyBucketsHint: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },
});
