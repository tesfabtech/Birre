
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';

export type TransferRecord = {
  id: string;
  fromBucketId: string;
  toBucketId: string;
  amount: string | number;
  transferredAt: string;
  note?: string | null;
  fromBucket?: { id: string; name: string } | null;
  toBucket?: { id: string; name: string } | null;
};

interface TransferHistorySectionProps {
  transfers: TransferRecord[];
  loading: boolean;
  error?: string;
  onRefresh: () => void;
}

function formatAmount(value: string | number): string {
  const amount = Number(value);

  return Number.isFinite(amount)
    ? amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(value);
}

function formatDate(value: string): string {
  if (!value) return '';

  const date = new Date(
    value.length === 10 ? `${value}T12:00:00` : value,
  );

  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TransferHistorySection({
  transfers,
  loading,
  error,
  onRefresh,
}: TransferHistorySectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.historyHeader}>
        <View style={styles.headingText}>
          <Text style={styles.sectionTitle}>Transfer history</Text>
          <Text style={styles.subtitle}>Your completed transfers</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh transfer history"
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.pressed,
          ]}
          onPress={onRefresh}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={17}
              color={Colors.primary}
            />
          )}
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading && transfers.length === 0 ? (
        <View style={styles.statusCard}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.muted}>Loading transfers...</Text>
        </View>
      ) : error && transfers.length === 0 ? (
        <View style={styles.statusCard}>
          <Ionicons
            name="alert-circle-outline"
            size={28}
            color={Colors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={onRefresh}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : transfers.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="swap-horizontal-outline"
              size={25}
              color={Colors.textSecondary}
            />
          </View>
          <Text style={styles.emptyTitle}>No transfers yet</Text>
          <Text style={styles.muted}>
            Your completed transfers will appear here.
          </Text>
        </View>
      ) : (
        transfers.map(transfer => (
          <View key={transfer.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <View style={styles.amountRow}>
                <View style={styles.transferIcon}>
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={20}
                    color="#2563EB"
                  />
                </View>

                <View style={styles.amountWrapper}>
                  <Text style={styles.amount}>
                    {formatAmount(transfer.amount)} ETB
                  </Text>
                  <Text style={styles.date}>
                    {formatDate(transfer.transferredAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Completed</Text>
              </View>
            </View>

            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={styles.sourceDot} />
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.routeName} numberOfLines={2}>
                  {transfer.fromBucket?.name ?? 'Source'}
                </Text>
              </View>

              <View style={styles.routeLine} />

              <View style={styles.routeRow}>
                <View style={styles.destinationDot} />
                <Text style={styles.routeLabel}>To</Text>
                <Text style={styles.routeName} numberOfLines={2}>
                  {transfer.toBucket?.name ?? 'Destination'}
                </Text>
              </View>
            </View>

            {!!transfer.note?.trim() && (
              <View style={styles.noteContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.note}>{transfer.note.trim()}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 4,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  headingText: {
    flex: 1,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  statusCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  muted: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 24,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  historyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 15,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  transferIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountWrapper: {
    flex: 1,
  },
  amount: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  completedBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  completedText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  routeContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 11,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  sourceDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.textSecondary,
  },
  destinationDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  routeLabel: {
    width: 34,
    color: Colors.textSecondary,
    fontSize: 11,
  },
  routeName: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  routeLine: {
    height: 13,
    width: 1,
    backgroundColor: Colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 12,
  },
  note: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
