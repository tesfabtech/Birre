
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiRequest } from '@/api';
import { Colors } from '@/constants/colors';

type MoneySourceType = 'REGULAR' | 'OCCASIONAL';

type MoneySourceFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'TWICE_MONTHLY'
  | 'MONTHLY';

type MoneySource = {
  id: string;
  name: string;
  type: MoneySourceType;
  defaultAmount: number | string | null;
  frequency: MoneySourceFrequency | null;
  isActive: boolean;
};

const SOURCE_TYPES: {
  label: string;
  value: MoneySourceType;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'Regular income',
    value: 'REGULAR',
    description: 'Income you expect to receive repeatedly.',
    icon: 'calendar-outline',
  },
  {
    label: 'Occasional income',
    value: 'OCCASIONAL',
    description: 'Income that arrives from time to time.',
    icon: 'wallet-outline',
  },
];

const FREQUENCIES: {
  label: string;
  value: MoneySourceFrequency;
}[] = [
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Every two weeks', value: 'BIWEEKLY' },
  { label: 'Twice a month', value: 'TWICE_MONTHLY' },
  { label: 'Monthly', value: 'MONTHLY' },
];

export default function AddMoneySourceScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sourceId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEditing = Boolean(sourceId);

  const [name, setName] = useState('');
  const [type, setType] = useState<MoneySourceType>('REGULAR');
  const [defaultAmount, setDefaultAmount] = useState('');
  const [frequency, setFrequency] =
    useState<MoneySourceFrequency>('MONTHLY');
  const [isActive, setIsActive] = useState(true);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!sourceId) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSource() {
  setInitialLoading(true);
  setLoadError('');

  try {
    const result = await apiRequest<MoneySource | { data: MoneySource }>(
      `/money-sources/${sourceId}`,
      { method: 'GET' },
    );

    const source: MoneySource =
      'data' in result ? result.data : result;

    if (cancelled) return;

    setName(source.name ?? '');
    setType(source.type ?? 'REGULAR');
    setDefaultAmount(
      source.defaultAmount == null ? '' : String(source.defaultAmount),
    );
    setFrequency(source.frequency ?? 'MONTHLY');
    setIsActive(source.isActive !== false);
  } catch (error) {
    if (!cancelled) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Could not load this money source.',
      );
    }
  } finally {
    if (!cancelled) {
      setInitialLoading(false);
    }
  }
}

    void loadSource();

    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Name required', 'Enter a name for this money source.');
      return;
    }

    const parsedAmount =
      defaultAmount.trim() === '' ? null : Number(defaultAmount);

    if (
      parsedAmount !== null &&
      (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
    ) {
      Alert.alert(
        'Invalid amount',
        'Enter an amount greater than zero, or leave it empty.',
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: trimmedName,
        type,
        defaultAmount: parsedAmount,
        frequency: type === 'REGULAR' ? frequency : null,
        ...(isEditing ? { isActive } : {}),
      };

      if (sourceId) {
        await apiRequest(`/money-sources/${sourceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        Alert.alert('Changes saved', 'Your money source has been updated.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      } else {
        const created = await apiRequest<MoneySource>('/money-sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        Alert.alert(
          'Money source added',
          `${created.name} is ready to use.`,
          [{ text: 'Continue', onPress: () => router.back() }],
        );
      }
    } catch (error) {
      Alert.alert(
        isEditing ? 'Could not update money source' : 'Could not add money source',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading money source...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { paddingTop: insets.top + 24 },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={42}
          color={Colors.danger}
        />
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.formCard}>
          <Text style={styles.label}>Source name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Monthly salary"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            maxLength={100}
            editable={!saving}
            returnKeyType="next"
          />

          <Text style={styles.label}>Income type *</Text>
          <View style={styles.options}>
            {SOURCE_TYPES.map((option) => {
              const selected = type === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    selected && styles.optionSelected,
                  ]}
                  onPress={() => setType(option.value)}
                  disabled={saving}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={selected ? Colors.primary : Colors.textSecondary}
                    />
                  </View>

                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        selected && styles.optionTitleSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>

                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? Colors.primary : Colors.border}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {type === 'REGULAR' && (
            <>
              <Text style={styles.label}>Expected frequency *</Text>
              <View style={styles.frequencyOptions}>
                {FREQUENCIES.map((option) => {
                  const selected = frequency === option.value;

                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.frequencyOption,
                        selected && styles.frequencyOptionSelected,
                      ]}
                      onPress={() => setFrequency(option.value)}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.frequencyText,
                          selected && styles.frequencyTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.label}>Default amount (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 15000"
            placeholderTextColor={Colors.textSecondary}
            value={defaultAmount}
            onChangeText={(value) => {
                if (/^\d*\.?\d*$/.test(value)) {
                  setDefaultAmount(value);
                 }
              }}
            keyboardType="decimal-pad"
            editable={!saving}
          />
          <Text style={styles.helperText}>
            A reference amount only; this does not record an income transaction.
          </Text>

          {isEditing && (
            <>
              <Text style={styles.label}>Source status</Text>
              <TouchableOpacity
                style={styles.statusToggle}
                onPress={() => setIsActive((current) => !current)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <View style={styles.statusToggleText}>
                  <Text style={styles.statusTitle}>
                    {isActive ? 'Source is active' : 'Source is inactive'}
                  </Text>
                  <Text style={styles.helperText}>
                    {isActive
                      ? 'This source can be used to record income.'
                      : 'This source cannot be used to record income.'}
                  </Text>
                </View>
                <Ionicons
                  name={isActive ? 'toggle' : 'toggle-outline'}
                  size={34}
                  color={isActive ? Colors.primary : Colors.textSecondary}
                />
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Save changes' : 'Save money source'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  pageHeading: {
    marginBottom: 24,
  },
  headingIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    marginTop: 7,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 16,
  },
  label: {
    marginTop: 20,
    marginBottom: 9,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  optionTitleSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  frequencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  frequencyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  frequencyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  frequencyTextSelected: {
    color: Colors.primary,
  },
  helperText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  statusToggleText: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  saveButton: {
    minHeight: 52,
    marginTop: 28,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '700',
  },
});
