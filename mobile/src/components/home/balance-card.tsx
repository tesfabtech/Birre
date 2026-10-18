
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import SafeToSpend from '@/components/home/safe-to-spend';

type BalanceCardProps = {
  displayName: string;
  totalBalance: string | null;
  balanceLoading: boolean;
  balanceError: boolean;
  totalBalanceVisible: boolean;
  safeToSpendVisible: boolean;
  refreshKey: number;
  onToggleTotalBalance: () => void;
  onToggleSafeToSpend: () => void;
  onRetryBalance: () => void;
};

function formatAmount(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return '—';

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BalanceCard({
  displayName,
  totalBalance,
  balanceLoading,
  balanceError,
  totalBalanceVisible,
  safeToSpendVisible,
  refreshKey,
  onToggleTotalBalance,
  onToggleSafeToSpend,
  onRetryBalance,
}: BalanceCardProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || 'there';

  return (
    <View style={styles.balanceCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.greeting} numberOfLines={1}>
          Hello, <Text style={styles.name}>{firstName}</Text>
        </Text>
      </View>

      <View style={styles.totalSection}>
        <Text style={styles.totalLabel}>Balance</Text>

        <View style={styles.amountRow}>
          <View style={styles.totalAmountContainer}>
            {balanceLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : balanceError && totalBalance === null ? (
              <Pressable
                onPress={onRetryBalance}
                accessibilityRole="button"
                accessibilityLabel="Retry loading balance"
              >
                <Text style={styles.totalAmount}>Tap to retry</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  if (balanceError) onRetryBalance();
                }}
                accessibilityRole={balanceError ? 'button' : undefined}
                accessibilityLabel={
                  balanceError ? 'Retry loading balance' : undefined
                }
              >
                <Text style={styles.totalAmount}>
                  {totalBalanceVisible
                    ? formatAmount(totalBalance ?? '0')
                    : '*****'}
                  {totalBalanceVisible && (
                    <Text style={styles.totalCurrency}> ETB</Text>
                  )}
                </Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.visibilityButton}
            onPress={onToggleTotalBalance}
            accessibilityRole="button"
            accessibilityLabel={
              totalBalanceVisible ? 'Hide balance' : 'Show balance'
            }
            hitSlop={8}
          >
            <Ionicons
              name={totalBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {balanceError && (
          <Text style={styles.balanceError}>
            Unable to refresh balance. Pull down to try again.
          </Text>
        )}
      </View>

      <SafeToSpend
        refreshKey={refreshKey}
        amountsVisible={safeToSpendVisible}
        onToggleVisibility={onToggleSafeToSpend}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  greeting: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.9,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  totalSection: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },

  totalLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    opacity: 0.9,
    marginBottom: 5,
    textAlign: 'center',
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },

  totalAmountContainer: {
    flexShrink: 1,
    alignItems: 'center',
  },

  totalAmount: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  totalCurrency: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  visibilityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 16,
  },

  balanceError: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 6,
    opacity: 0.9,
    textAlign: 'center',
  },
});
