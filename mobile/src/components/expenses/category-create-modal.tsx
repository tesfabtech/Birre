
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

type Props = {
  visible: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onCreate: (name: string) => Promise<boolean>;
};

export default function CategoryCreateModal({
  visible,
  saving,
  error,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
    }
  }, [visible]);

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName || saving) return;

    const created = await onCreate(trimmedName);

    if (created) {
      setName('');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!saving) onClose();
          }}
        />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="pricetag-outline"
                size={23}
                color={Colors.primary}
              />
            </View>

            <Pressable
              onPress={onClose}
              disabled={saving}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close category modal"
            >
              <Ionicons
                name="close"
                size={22}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <Text style={styles.title}>New Category</Text>
          <Text style={styles.subtitle}>
            Give your expense a category.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor="#9CA3AF"
            autoFocus={visible}
            maxLength={50}
            returnKeyType="done"
            onSubmitEditing={() => void handleCreate()}
            editable={!saving}
            style={styles.input}
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={Colors.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => void handleCreate()}
            disabled={saving || !name.trim()}
            style={({ pressed }) => [
              styles.createButton,
              (saving || !name.trim()) && styles.disabledButton,
              pressed && !saving && !!name.trim() && styles.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>
                  Create Category
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconContainer: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
    marginBottom: 20,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 10,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
  },
  createButton: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  pressed: {
    opacity: 0.75,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
