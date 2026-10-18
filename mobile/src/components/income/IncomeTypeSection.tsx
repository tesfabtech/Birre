
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import type { IncomeType } from './income-types';

type IncomeTypeSectionProps = {
  incomeType: IncomeType;
  disabled?: boolean;
  onIncomeTypeChange: (type: IncomeType) => void;
};

export default function IncomeTypeSection({
  incomeType,
  disabled = false,
  onIncomeTypeChange,
}: IncomeTypeSectionProps) {
  const options: {
    value: IncomeType;
    title: string;
    description: string;
    icon: 'repeat-outline' | 'wallet-outline';
  }[] = [
    {
      value: 'REGULAR',
      title: 'Regular',
      description: 'Use allocation rules',
      icon: 'repeat-outline',
    },
    {
      value: 'OCCASIONAL',
      title: 'Occasional',
      description: 'Goes to Unallocated',
      icon: 'wallet-outline',
    },
  ];

  return (
    <View>
      <Text style={styles.label}>Income type</Text>

      <View style={styles.typeRow}>
        {options.map(option => {
          const selected = incomeType === option.value;

          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.typeOption,
                selected && styles.typeOptionSelected,
                disabled && styles.disabledOption,
                pressed && !disabled && styles.pressedOption,
              ]}
              onPress={() => onIncomeTypeChange(option.value)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
            >
              <View style={styles.optionHeading}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={selected ? Colors.primary : Colors.textSecondary}
                />

                {selected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={Colors.primary}
                  />
                )}
              </View>

              <Text
                style={[
                  styles.typeTitle,
                  selected && styles.selectedText,
                ]}
              >
                {option.title}
              </Text>

              <Text
                style={[
                  styles.typeDescription,
                  selected && styles.selectedDetail,
                ]}
              >
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    minHeight: 112,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 13,
    backgroundColor: '#FFFFFF',
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  typeDescription: {
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
  disabledOption: {
    opacity: 0.55,
  },
  pressedOption: {
    opacity: 0.8,
  },
});
