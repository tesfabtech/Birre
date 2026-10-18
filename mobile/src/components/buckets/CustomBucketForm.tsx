import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface CustomBucketFormData {
  name: string;
  percentage: string;
}

interface CustomBucketFormProps {
  onAdd: (bucket: CustomBucketFormData) => void;
  disabled?: boolean;
}

export default function CustomBucketForm({
  onAdd,
  disabled = false,
}: CustomBucketFormProps) {
  const [name, setName] = useState('');
  const [percentage, setPercentage] = useState('');
  const [error, setError] = useState('');

  function handleAdd() {
    const trimmedName = name.trim();
    const normalizedPercentage = percentage.trim();

    if (!trimmedName) {
      setError('Enter a name for your custom bucket.');
      return;
    }

    if (trimmedName.length > 40) {
      setError('Bucket name must be 40 characters or fewer.');
      return;
    }

    const parsedPercentage = Number(normalizedPercentage);

    if (
      normalizedPercentage === '' ||
      !Number.isFinite(parsedPercentage) ||
      parsedPercentage < 0 ||
      parsedPercentage > 100
    ) {
      setError('Enter a percentage between 0 and 100.');
      return;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(normalizedPercentage)) {
      setError('Use up to two decimal places, such as 12.5.');
      return;
    }

    setError('');

    onAdd({
      name: trimmedName,
      percentage: parsedPercentage.toFixed(2),
    });

    setName('');
    setPercentage('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create a custom bucket</Text>
      <Text style={styles.description}>
        Add your own bucket and choose the percentage of regular income
        it should receive. The percentage counts toward the 100% total.
      </Text>

      <Text style={styles.label}>Bucket name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Family support"
        maxLength={40}
        editable={!disabled}
        accessibilityLabel="Custom bucket name"
      />

      <Text style={styles.label}>Allocation percentage</Text>
      <View style={styles.percentageRow}>
        <TextInput
          style={[styles.input, styles.percentageInput]}
          value={percentage}
          onChangeText={setPercentage}
          placeholder="e.g. 5"
          keyboardType="decimal-pad"
          maxLength={6}
          editable={!disabled}
          accessibilityLabel="Custom bucket allocation percentage"
        />
        <Text style={styles.percentSymbol}>%</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[
          styles.addButton,
          disabled && styles.disabledButton,
        ]}
        onPress={handleAdd}
        disabled={disabled}
        accessibilityRole="button"
      >
        <Text style={styles.addButtonText}>Add custom bucket</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageInput: {
    flex: 1,
    marginBottom: 0,
  },
  percentSymbol: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 16,
    color: '#374151',
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 10,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    paddingVertical: 13,
    borderRadius: 9,
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});