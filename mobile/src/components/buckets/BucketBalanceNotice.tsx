
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BucketBalanceNoticeProps {
  balance: number;
  currency?: string;
}

export default function BucketBalanceNotice({
  balance,
  currency = 'ETB',
}: BucketBalanceNoticeProps) {
  const hasBalance = balance > 0;

  return (
    <View
      style={[
        styles.container,
        hasBalance ? styles.warningContainer : styles.safeContainer,
      ]}
    >
      <Text
        style={[
          styles.title,
          hasBalance ? styles.warningText : styles.safeText,
        ]}
      >
        {hasBalance ? 'Balance must be transferred first' : 'No remaining balance'}
      </Text>

      <Text style={styles.description}>
        {hasBalance
          ? `This bucket contains ${currency} ${balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}. Transfer the remaining money to another bucket before deleting it.`
          : 'This bucket has no remaining balance and can be considered for deletion.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  safeContainer: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  warningText: {
    color: '#B91C1C',
  },
  safeText: {
    color: '#166534',
  },
  description: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
  },
});
