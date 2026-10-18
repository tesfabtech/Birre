
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  saving: boolean;
  onCreate: (name: string) => Promise<boolean>;
};


export default function CategoryForm({ saving, onCreate }: Props) {
  const [name, setName] = useState('');

  async function submit() {
  const trimmedName = name.trim();

  if (!trimmedName || saving) return;

  const created = await onCreate(trimmedName);

  if (created) {
    setName('');
  }
}


  return (
    <View style={styles.form}>
      <Text style={styles.label}>Category name</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Food, Transport, Housing"
        placeholderTextColor="#9CA3AF"
        maxLength={100}
        editable={!saving}
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
      />

      <Pressable
        style={[styles.button, saving && styles.disabled]}
        onPress={() => void submit()}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Create Category</Text>
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
  },
  button: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
