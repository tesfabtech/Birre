import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';
import AllocationPlanSummary from './AllocationPlanSummary';
import BucketManagementRow from './BucketManagementRow';
import useAllocationPlanEditor from './useAllocationPlanEditor';

interface AllocationPlanEditorProps {
  onSaved?: () => void;
}

export default function AllocationPlanEditor({
  onSaved,
}: AllocationPlanEditorProps) {
  const editor = useAllocationPlanEditor({ onSaved });

  const availableBuckets = editor.buckets.filter(
    bucket => bucket.type !== 'CUSTOM',
  );

  if (editor.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!editor.plan) {
    return (
      <View style={styles.centered}>
        <Ionicons
          name="alert-circle-outline"
          size={36}
          color={Colors.textSecondary}
        />

        <Text style={styles.errorTitle}>Couldn't load buckets</Text>

        {editor.error ? (
          <Text style={styles.errorText}>{editor.error}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void editor.loadPlan()}
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      <AllocationPlanSummary
        totalHundredths={editor.totalHundredths}
        activeBucketCount={editor.allocatableBuckets.length}
        hasInvalidPercentage={editor.hasInvalidPercentage}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Buckets</Text>
        <Text style={styles.bucketCount}>
          {availableBuckets.length}
        </Text>
      </View>

      {availableBuckets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="wallet-outline"
            size={28}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No buckets available</Text>
        </View>
      ) : (
        <View style={styles.bucketList}>
          {availableBuckets.map(bucket => (
            <BucketManagementRow
              key={bucket.id}
              bucket={bucket}
              onPercentageChange={editor.handlePercentageChange}
              onToggle={(bucketId, enabled) => {
                void editor.handleToggleBucket(bucketId, enabled);
              }}
              disabled={editor.saving}
            />
          ))}
        </View>
      )}

      {editor.error ? (
        <View style={styles.messageError}>
          <Ionicons
            name="alert-circle-outline"
            size={19}
            color="#B91C1C"
          />
          <Text style={styles.errorMessageText}>{editor.error}</Text>
        </View>
      ) : null}

      {editor.success ? (
        <View style={styles.messageSuccess}>
          <Ionicons
            name="checkmark-circle-outline"
            size={19}
            color="#047857"
          />
          <Text style={styles.successText}>{editor.success}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.saveButton,
          (!editor.isTotalValid || editor.saving) &&
            styles.saveButtonDisabled,
        ]}
        onPress={() => void editor.handleSave()}
        disabled={!editor.isTotalValid || editor.saving}
        accessibilityRole="button"
        accessibilityState={{
          disabled: !editor.isTotalValid || editor.saving,
          busy: editor.saving,
        }}
      >
        {editor.saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  bucketCount: {
    minWidth: 28,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#16A34A12',
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  bucketList: {
    gap: 10,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  messageError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 11,
    marginTop: 14,
  },
  errorMessageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#B91C1C',
  },
  messageSuccess: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 12,
    backgroundColor: '#ECFDF5',
    borderRadius: 11,
    marginTop: 14,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#047857',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 22,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});