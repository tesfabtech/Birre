
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiRequestError } from '@/api';
import CategoryForm from '@/components/categories/CategoryForm';
import CategoryList from '@/components/categories/CategoryList';
import CategoryTrash from '@/components/categories/CategoryTrash';
import { categoryService } from '@/services/category-service';
import type { Category } from '@/types/category';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export default function ManageCategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [trash, setTrash] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [promptCategory, setPromptCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [trashVisible, setTrashVisible] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setTrashLoading(true);
    setError('');

    const [activeResult, trashResult] = await Promise.allSettled([
      categoryService.list(),
      categoryService.listTrash(),
    ]);

    if (activeResult.status === 'fulfilled') {
      setCategories(activeResult.value);
    } else {
      setError(getErrorMessage(activeResult.reason));
    }

    if (trashResult.status === 'fulfilled') {
      setTrash(trashResult.value);
    } else if (activeResult.status === 'fulfilled') {
      setError(
        `Categories loaded, but trash could not be loaded: ${getErrorMessage(trashResult.reason)}`,
      );
    }

    setLoading(false);
    setTrashLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories]),
  );

  async function handleCreate(name: string): Promise<boolean> {
    if (saving) return false;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const existing = categories.find(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      );

      if (existing) {
        setError('This category already exists.');
        return false;
      }

      await categoryService.create(name);
      setSuccessMessage(`"${name}" category created successfully.`);
      await loadCategories();

      return true;
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        err.code === 'CATEGORY_IN_TRASH' &&
        err.data?.category
      ) {
        setPromptCategory({
          id: err.data.category.id,
          name: err.data.category.name,
          isActive: false,
          isDefault: false,
          deletedAt: err.data.category.deletedAt,
        });
        setError('');
      } else {
        setError(getErrorMessage(err));
      }

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category): Promise<void> {
    if (deletingId) return;

    setDeletingId(category.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await categoryService.delete(category.id);

      setSuccessMessage(
        response.message || `"${category.name}" moved to trash.`,
      );

      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function restoreCategory(category: Category): Promise<boolean> {
    if (restoringId) return false;

    setRestoringId(category.id);
    setError('');
    setSuccessMessage('');

    try {
      const response = await categoryService.restore(category.id);

      setPromptCategory(null);
      setSuccessMessage(
        response.message || `"${category.name}" restored successfully.`,
      );

      await loadCategories();

      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setRestoringId(null);
    }
  }

  async function handleRestoreFromPrompt(): Promise<void> {
    if (!promptCategory) return;

    const restored = await restoreCategory(promptCategory);

    if (restored) {
      setPromptCategory(null);
    }
  }

  function cancelRestorePrompt() {
    setPromptCategory(null);
    setError('');
    setSuccessMessage(
      'No changes made. The deleted category remains in the trash.',
    );
  }

  function toggleTrash() {
    setTrashVisible((visible) => !visible);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        <CategoryForm saving={saving} onCreate={handleCreate} />

        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ {successMessage}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Categories</Text>

          <View style={styles.countBadge}>
            <Text style={styles.countText}>{categories.length}</Text>
          </View>
        </View>

        <CategoryList
          categories={categories}
          loading={loading}
          deletingId={deletingId}
          onDelete={handleDelete}
        />

        <Pressable
          style={styles.trashToggle}
          onPress={toggleTrash}
          accessibilityRole="button"
          accessibilityLabel={trashVisible ? 'Hide trash' : 'Open trash'}
          accessibilityState={{ expanded: trashVisible }}
        >
          <Text style={styles.trashIcon}>🗑️</Text>

          <Text style={styles.trashToggleText}>
            {trashVisible ? 'Hide Trash' : 'Trash'}
          </Text>

          <View style={styles.trashCountBadge}>
            <Text style={styles.trashCountText}>
              {trashLoading ? '…' : trash.length}
            </Text>
          </View>

          <Text style={styles.trashChevron}>
            {trashVisible ? '▲' : '▼'}
          </Text>
        </Pressable>

        {trashVisible ? (
          <CategoryTrash
            visible={trashVisible}
            categories={trash}
            loading={trashLoading}
            restoringId={restoringId}
            promptCategory={promptCategory}
            onRestore={restoreCategory}
            onCancelPrompt={cancelRestorePrompt}
            onConfirmPrompt={() => void handleRestoreFromPrompt()}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },

  successBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  successText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 26,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  countBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },

  countText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },

  trashToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 22,
  },

  trashIcon: {
    fontSize: 19,
    marginRight: 10,
  },

  trashToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  trashCountBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    marginRight: 10,
  },

  trashCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  trashChevron: {
    fontSize: 12,
    color: '#6B7280',
  },
});
