import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Category } from '@/types/category';

type Props = {
  categories: Category[];
  loading: boolean;
  deletingId: string | null;
  onDelete: (category: Category) => Promise<void>;
};

export default function CategoryList({
  categories,
  loading,
  deletingId,
  onDelete,
}: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  function handleLongPress(category: Category) {
    if (category.isDefault) {
      Alert.alert(
        'Default category',
        'Default categories cannot be deleted.',
      );
      return;
    }

    setSelectedCategoryId((currentId) =>
      currentId === category.id ? null : category.id,
    );
  }

  function confirmDelete(category: Category) {
    Alert.alert(
      'Move category to trash?',
      `"${category.name}" will be moved to the trash. Existing expenses will be preserved.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            await onDelete(category);
            setSelectedCategoryId(null);
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#16A34A"
        style={styles.loader}
      />
    );
  }

  return (
    <FlatList
      data={categories}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      extraData={selectedCategoryId}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏷️</Text>
          <Text style={styles.emptyTitle}>No categories yet</Text>
          <Text style={styles.emptyText}>
            Create your first category above to organize your expenses.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isSelected = selectedCategoryId === item.id;
        const isDeleting = deletingId === item.id;

        return (
          <Pressable
            onLongPress={() => handleLongPress(item)}
            delayLongPress={450}
            onPress={() => {
              if (selectedCategoryId !== null) {
                setSelectedCategoryId(null);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}. Long press for category actions.`}
            style={[
              styles.item,
              isSelected && styles.selectedItem,
            ]}
          >
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>#</Text>
            </View>

            <View style={styles.details}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.subtitle}>
                {isSelected
                  ? 'Category selected'
                  : 'Long press for options'}
              </Text>
            </View>

            {item.isDefault ? (
              <Text style={styles.defaultLabel}>Default</Text>
            ) : isSelected ? (
              <Pressable
                style={[
                  styles.deleteButton,
                  isDeleting && styles.disabled,
                ]}
                onPress={() => confirmDelete(item)}
                disabled={deletingId !== null}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.name}`}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#B91C1C" />
                ) : (
                  <>
                    <Text style={styles.deleteIcon}>⌫</Text>
                    <Text style={styles.deleteText}>Delete</Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  selectedItem: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16A34A',
  },
  details: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },
  defaultLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minWidth: 82,
  },
  deleteIcon: {
    fontSize: 17,
    color: '#B91C1C',
  },
  deleteText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});