import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { BucketType } from '../../types/bucket';
import { BUCKET_TYPES } from '../../types/bucket';

type Props = {
  saving: boolean;
  onCreate: (
    name: string,
    type: BucketType,
  ) => Promise<boolean>;
};

export default function BucketForm({
  saving,
  onCreate,
}: Props) {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] =
    useState<BucketType>('CUSTOM');

  async function submit() {
    const trimmedName = name.trim();

    if (!trimmedName || saving) {
      return;
    }

    const created = await onCreate(
      trimmedName,
      selectedType,
    );

    if (created) {
      setName('');
      setSelectedType('CUSTOM');
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Create a Bucket</Text>

      <Text style={styles.label}>Bucket name</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Monthly Bills"
        placeholderTextColor="#9CA3AF"
        maxLength={100}
        editable={!saving}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      <Text style={styles.label}>Bucket type</Text>

      <View style={styles.typeGrid}>
        {BUCKET_TYPES.map((type) => {
          const active = selectedType === type.value;

          return (
            <Pressable
              key={type.value}
              style={[
                styles.typeOption,
                active && styles.typeOptionActive,
              ]}
              onPress={() => setSelectedType(type.value)}
              disabled={saving}
            >
              <Text
                style={[
                  styles.typeText,
                  active && styles.typeTextActive,
                ]}
              >
                {type.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[
          styles.button,
          (saving || !name.trim()) && styles.disabled,
        ]}
        onPress={() => void submit()}
        disabled={saving || !name.trim()}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            Create Bucket
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
  },
  typeOptionActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  typeText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#166534',
  },
  button: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});