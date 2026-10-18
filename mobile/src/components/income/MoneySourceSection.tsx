
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import { formatAmount, type MoneySource } from './income-types';

type MoneySourceSectionProps = {
  moneySources: MoneySource[];
  selectedSourceId: string;
  loading: boolean;
  disabled?: boolean;
  onSelect: (source: MoneySource) => void;
  onAdd: () => void;
  onRetry: () => void;
};

export default function MoneySourceSection({
  moneySources,
  selectedSourceId,
  loading,
  disabled = false,
  onSelect,
  onAdd,
  onRetry,
}: MoneySourceSectionProps) {
  return (
    <View>
      <View style={styles.sectionHeading}>
        <Text style={styles.label}>Money source</Text>

        <Pressable
          style={({ pressed }) => [
            styles.addSourceButton,
            disabled && styles.disabledButton,
            pressed && !disabled && styles.pressedButton,
          ]}
          onPress={onAdd}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Add money source"
        >
          <Ionicons
            name="add"
            size={17}
            color={Colors.primary}
          />
          <Text style={styles.addSourceButtonText}>Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>
            Loading money sources...
          </Text>
        </View>
      ) : moneySources.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="wallet-outline"
              size={24}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>No money sources yet</Text>

          <Text style={styles.emptyText}>
            Add a money source before recording your income.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.emptyAddButton,
              pressed && styles.pressedButton,
            ]}
            onPress={onAdd}
            disabled={disabled}
            accessibilityRole="button"
          >
            <Text style={styles.emptyAddButtonText}>
              Add money source
            </Text>
          </Pressable>

          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressedButton,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.sourceList}>
          {moneySources.map(source => {
            const selected = selectedSourceId === source.id;

            return (
              <Pressable
                key={source.id}
                style={({ pressed }) => [
                  styles.sourceOption,
                  selected && styles.sourceOptionSelected,
                  disabled && styles.disabledButton,
                  pressed && !disabled && styles.pressedSource,
                ]}
                onPress={() => onSelect(source)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
              >
                <View style={styles.sourceTextContainer}>
                  <Text
                    style={[
                      styles.sourceName,
                      selected && styles.selectedText,
                    ]}
                  >
                    {source.name}
                  </Text>

                  <Text
                    style={[
                      styles.sourceDetail,
                      selected && styles.selectedDetail,
                    ]}
                  >
                    {source.frequency
                      ? source.frequency.replace(/_/g, ' ')
                      : 'No fixed frequency'}
                    {source.defaultAmount != null
                      ? ` · Default ${formatAmount(source.defaultAmount)} ETB`
                      : ''}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  addSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.primaryLight,
  },
  addSourceButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  sourceList: {
    gap: 10,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  sourceOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  sourceTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  sourceName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  sourceDetail: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  selectedText: {
    color: Colors.primary,
  },
  selectedDetail: {
    color: Colors.primary,
  },
  radioOuter: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },
  emptyAddButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressedButton: {
    opacity: 0.8,
  },
  pressedSource: {
    opacity: 0.8,
  },
});
