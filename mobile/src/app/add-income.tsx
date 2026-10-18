import { useCallback, useRef, useState } from 'react';
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
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiRequest } from '@/api';
import { Colors } from '@/constants/colors';

import IncomeDetailsSection from '@/components/income/IncomeDetailsSection';
import IncomeTypeSection from '@/components/income/IncomeTypeSection';
import MoneySourceSection from '@/components/income/MoneySourceSection';

import {
  formatAllocationSummary,
  formatAmount,
  getTodayDate,
  isValidReceivedDate,
  type CreatedIncome,
  type IncomeType,
  type MoneySource,
} from '@/components/income/income-types';

export default function AddIncomeScreen() {
  const insets = useSafeAreaInsets();

  const { moneySourceId } = useLocalSearchParams<{
    moneySourceId?: string | string[];
  }>();

  const requestedSourceId = Array.isArray(moneySourceId)
    ? moneySourceId[0]
    : moneySourceId;

  const [moneySources, setMoneySources] = useState<MoneySource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('REGULAR');
  const [receivedAt, setReceivedAt] = useState(getTodayDate());
  const [note, setNote] = useState('');
  const [loadingSources, setLoadingSources] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedSourceIdRef = useRef('');
  const amountRef = useRef('');
  const incomeTypeRef = useRef<IncomeType>('REGULAR');
  const returningFromAddSourceRef = useRef(false);
  const sourceIdsBeforeAddRef = useRef<string[]>([]);

  const filteredMoneySources = moneySources.filter(
    source => source.type === incomeType,
  );

  const updateAmount = (value: string) => {
    amountRef.current = value;
    setAmount(value);
  };

  const updateSelectedSource = (sourceId: string) => {
    selectedSourceIdRef.current = sourceId;
    setSelectedSourceId(sourceId);
  };

  const updateIncomeType = (type: IncomeType) => {
    incomeTypeRef.current = type;
    setIncomeType(type);
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadMoneySources = async () => {
        setLoadingSources(true);
        setErrorMessage('');

        try {
          const result = await apiRequest<MoneySource[]>(
            '/money-sources',
            { method: 'GET' },
          );

          if (!isActive) {
            return;
          }

          const activeSources = result.filter(
            source => source.isActive !== false,
          );

          setMoneySources(activeSources);

          const requestedSource = requestedSourceId
            ? activeSources.find(
                source => source.id === requestedSourceId,
              )
            : undefined;

          const isReturningFromAdd =
            returningFromAddSourceRef.current;

          const newlyAddedSource = isReturningFromAdd
            ? activeSources.find(
                source =>
                  !sourceIdsBeforeAddRef.current.includes(source.id),
              )
            : undefined;

          const currentSource = activeSources.find(
            source => source.id === selectedSourceIdRef.current,
          );

          const nextSource =
            requestedSource ??
            newlyAddedSource ??
            (currentSource?.type === incomeTypeRef.current
              ? currentSource
              : undefined) ??
            activeSources.find(
              source => source.type === incomeTypeRef.current,
            ) ??
            activeSources[0];

          if (nextSource) {
            if (
              nextSource.type === 'REGULAR' ||
              nextSource.type === 'OCCASIONAL'
            ) {
              updateIncomeType(nextSource.type);
            }

            updateSelectedSource(nextSource.id);

            if (
              nextSource.defaultAmount != null &&
              amountRef.current.trim() === ''
            ) {
              updateAmount(formatAmount(nextSource.defaultAmount));
            }
          } else {
            updateSelectedSource('');
          }

          returningFromAddSourceRef.current = false;
          sourceIdsBeforeAddRef.current = [];
        } catch (error) {
          if (isActive) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Could not load your money sources.',
            );
          }
        } finally {
          if (isActive) {
            setLoadingSources(false);
          }
        }
      };

      void loadMoneySources();

      return () => {
        isActive = false;
      };
    }, [requestedSourceId]),
  );

  const handleAddMoneySource = () => {
    sourceIdsBeforeAddRef.current = moneySources.map(
      source => source.id,
    );

    returningFromAddSourceRef.current = true;
    router.push('/add-money-source');
  };

  const handleSelectSource = (source: MoneySource) => {
    if (source.type !== incomeTypeRef.current) {
      return;
    }

    updateSelectedSource(source.id);

    updateAmount(
      source.defaultAmount != null
        ? formatAmount(source.defaultAmount)
        : '',
    );
  };

  const handleIncomeTypeChange = (type: IncomeType) => {
    updateIncomeType(type);

    const nextSource = moneySources.find(
      source => source.type === type,
    );

    updateSelectedSource(nextSource?.id ?? '');

    if (nextSource?.defaultAmount != null) {
      updateAmount(formatAmount(nextSource.defaultAmount));
    } else {
      updateAmount('');
    }
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }

    setErrorMessage('');

    if (!selectedSourceId) {
      setErrorMessage(
        `Please add and select a ${incomeType.toLowerCase()} money source.`,
      );
      return;
    }

    const selectedSource = filteredMoneySources.find(
      source => source.id === selectedSourceId,
    );

    if (!selectedSource) {
      setErrorMessage(
        'Please select a money source matching the selected income type.',
      );
      return;
    }

    const parsedAmount = Number(amount);

    if (
      !amount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setErrorMessage('Enter an amount greater than zero.');
      return;
    }

    if (!isValidReceivedDate(receivedAt)) {
      setErrorMessage(
        'Enter a valid received date in YYYY-MM-DD format.',
      );
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest<CreatedIncome>('/income', {
        method: 'POST',
        body: JSON.stringify({
          moneySourceId: selectedSourceId,
          amount: amount.trim(),
          type: incomeType,
          receivedAt,
          note: note.trim() || null,
        }),
      });

      const allocationSummary = formatAllocationSummary(
        result.allocations,
      );

      Alert.alert(
        'Income recorded',
        `${
          incomeType === 'REGULAR'
            ? 'Regular income'
            : 'Occasional income'
        } saved successfully.\n\n${allocationSummary}`,
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not save your income. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16) + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View
            style={styles.errorBox}
            accessibilityRole="alert"
          >
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <IncomeTypeSection
          incomeType={incomeType}
          disabled={saving}
          onIncomeTypeChange={handleIncomeTypeChange}
        />

        <MoneySourceSection
          moneySources={filteredMoneySources}
          selectedSourceId={selectedSourceId}
          loading={loadingSources}
          disabled={saving}
          onSelect={handleSelectSource}
          onAdd={handleAddMoneySource}
          onRetry={() => router.replace('/add-income')}
        />

        <IncomeDetailsSection
          incomeType={incomeType}
          amount={amount}
          receivedAt={receivedAt}
          note={note}
          disabled={saving}
          onAmountChange={updateAmount}
          onReceivedAtChange={setReceivedAt}
          onNoteChange={setNote}
        />

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            (saving || loadingSources) && styles.saveButtonDisabled,
            pressed &&
              !saving &&
              !loadingSources &&
              styles.saveButtonPressed,
          ]}
          onPress={() => void handleSave()}
          disabled={saving || loadingSources}
          accessibilityRole="button"
          accessibilityLabel="Save income"
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Income</Text>
          )}
        </Pressable>
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
    paddingHorizontal: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 19,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});