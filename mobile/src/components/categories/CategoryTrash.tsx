
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Category } from '@/types/category';

type Props = {
  visible: boolean;
  categories: Category[];
  loading: boolean;
  restoringId: string | null;
  promptCategory: Category | null;
  onRestore: (category: Category) => Promise<unknown>;
  onCancelPrompt: () => void;
  onConfirmPrompt: () => void;
};


function formatDeletedDate(value?: string | null): string {
  if (!value) return 'Deletion date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Deletion date unavailable';
  }

  return `Deleted ${date.toLocaleDateString()}`;
}

export default function CategoryTrash({
  visible,
  categories,
  loading,
  restoringId,
  promptCategory,
  onRestore,
  onCancelPrompt,
  onConfirmPrompt,
}: Props) {
      if (!visible) {
    return null;
  }
  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <Text style={styles.title}>Trash</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{categories.length}</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Deleted categories stay here for 30 days. Categories linked to expenses
        are retained until their history can be preserved safely.
      </Text>

      {loading ? (
        <ActivityIndicator color="#16A34A" style={styles.loader} />
      ) : categories.length === 0 ? (
        <Text style={styles.emptyText}>Your trash is empty.</Text>
      ) : (
        <ScrollView nestedScrollEnabled style={styles.list}>
          {categories.map((category) => (
            <View key={category.id} style={styles.item}>
              <View style={styles.details}>
                <Text style={styles.name}>{category.name}</Text>
                <Text style={styles.date}>
                  {formatDeletedDate(category.deletedAt)}
                </Text>
              </View>

              <Pressable
                style={styles.restoreButton}
                onPress={() => void onRestore(category)}
                disabled={restoringId !== null}
              >
                {restoringId === category.id ? (
                  <ActivityIndicator size="small" color="#166534" />
                ) : (
                  <Text style={styles.restoreText}>Restore</Text>
                )}
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={promptCategory !== null}
        transparent
        animationType="fade"
        onRequestClose={onCancelPrompt}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Category already in Trash</Text>
            <Text style={styles.dialogMessage}>
              {promptCategory
                ? `"${promptCategory.name}" was previously deleted. Would you like to restore the original category?`
                : ''}
            </Text>

            <Pressable
              style={styles.confirmButton}
              onPress={onConfirmPrompt}
            >
              <Text style={styles.confirmText}>Restore Category</Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={onCancelPrompt}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexShrink: 1,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  badge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    marginTop: 7,
    marginBottom: 12,
  },
  loader: { marginVertical: 18 },
  emptyText: { color: '#9CA3AF', fontSize: 14, paddingVertical: 12 },
  list: { maxHeight: 260 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  details: { flex: 1, marginRight: 8 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  date: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  restoreButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#DCFCE7',
    minWidth: 76,
    alignItems: 'center',
  },
  restoreText: { fontSize: 12, color: '#166534', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    marginTop: 10,
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  confirmText: { color: '#FFFFFF', fontWeight: '700' },
  cancelButton: {
    padding: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelText: { color: '#374151', fontWeight: '600' },
});
