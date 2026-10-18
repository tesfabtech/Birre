import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiRequest } from '@/api';
import { Colors } from '@/constants/colors';

type MoneySource = {
  id: string;
  name: string;
  type: 'REGULAR' | 'OCCASIONAL';
  defaultAmount: string | number | null;
  frequency: string | null;
  nextExpectedDate?: string | null;
  isActive: boolean;
};

function formatAmount(value: string | number | null): string | null {
  if (value === null || value === '') return null;

  const amount = Number(value);

  if (!Number.isFinite(amount)) return String(value);

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFrequency(value: string | null): string {
  if (!value) return 'No fixed frequency';

  const labels: Record<string, string> = {
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Every two weeks',
    TWICE_MONTHLY: 'Twice a month',
    MONTHLY: 'Monthly',
  };

  return labels[value] ?? value.replace(/_/g, ' ');
}

export default function ManageMoneySourcesScreen() {
  const insets = useSafeAreaInsets();

  const [sources, setSources] = useState<MoneySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [menuSourceId, setMenuSourceId] = useState<string | null>(null);
  const [showInactiveSources, setShowInactiveSources] = useState(false);

  // Separate active and inactive sources for display.
  const activeSources = sources.filter(
    (source) => source.isActive !== false,
  );

  const inactiveSources = sources.filter(
    (source) => source.isActive === false,
  );

  const loadSources = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const result = await apiRequest<
        MoneySource[] | {
          data?: MoneySource[];
          moneySources?: MoneySource[];
        }
      >('/money-sources', { method: 'GET' });

      const sourceList = Array.isArray(result)
        ? result
        : result.moneySources ?? result.data ?? [];

      setSources(sourceList);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not load your money sources.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSources();
    }, [loadSources]),
  );

  function handleAddSource() {
    router.push('/add-money-source');
  }

  function handleEditSource(source: MoneySource) {
    setMenuSourceId(null);

    router.push({
      pathname: '/add-money-source',
      params: { id: source.id },
    });
  }

  function handleRecordIncome(source: MoneySource) {
    if (source.isActive === false) {
      Alert.alert(
        'Source inactive',
        'This money source is inactive and cannot be used to record income.',
      );
      return;
    }

    router.push({
      pathname: '/add-income',
      params: { moneySourceId: source.id },
    });
  }

  function handleDeleteSource(source: MoneySource) {
    setMenuSourceId(null);

    Alert.alert(
      'Delete money source?',
      `Are you sure you want to delete "${source.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await apiRequest(`/money-sources/${source.id}`, {
                  method: 'DELETE',
                });

                setSources((current) =>
                  current.filter((item) => item.id !== source.id),
                );

                Alert.alert(
                  'Source deleted',
                  `"${source.name}" was deleted.`,
                );
              } catch (error) {
                Alert.alert(
                  'Could not delete source',
                  error instanceof Error
                    ? error.message
                    : 'Please try again.',
                );
              }
            })();
          },
        },
      ],
    );
  }

  function renderSource(source: MoneySource) {
    const defaultAmount = formatAmount(source.defaultAmount);
    const active = source.isActive !== false;
    const regular = source.type === 'REGULAR';

    const accentColor = !active
      ? '#6B7280'
      : regular
        ? '#15803D'
        : '#2563EB';

    const iconBackground = !active
      ? '#F3F4F6'
      : regular
        ? '#DCFCE7'
        : '#DBEAFE';

    return (
      <View
        key={source.id}
        style={[styles.sourceCard, !active && styles.inactiveCard]}
      >
        <View style={styles.sourceHeader}>
          <View
            style={[
              styles.sourceIcon,
              { backgroundColor: iconBackground },
            ]}
          >
            <Ionicons
              name={regular ? 'trending-up' : 'briefcase-outline'}
              size={25}
              color={accentColor}
            />
          </View>

          <View style={styles.sourceInfo}>
            <Text style={styles.sourceName} numberOfLines={2}>
              {source.name}
            </Text>

            <View style={styles.sourceMeta}>
              <View
                style={[
                  styles.typeDot,
                  { backgroundColor: accentColor },
                ]}
              />
              <Text style={styles.sourceType}>
                {regular ? 'Regular income' : 'Occasional income'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.moreButton,
              menuSourceId === source.id && styles.moreButtonActive,
            ]}
            onPress={() =>
              setMenuSourceId((current) =>
                current === source.id ? null : source.id,
              )
            }
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${source.name}`}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={21}
              color={Colors.text}
            />
          </TouchableOpacity>
        </View>

        {defaultAmount !== null && (
          <View style={styles.amountPanel}>
            <View style={styles.amountHeading}>
              <Ionicons
                name="wallet-outline"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.amountLabel}>Default amount</Text>
            </View>

            <View style={styles.amountLine}>
              <Text
                style={[styles.amountValue, { color: accentColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {defaultAmount}
              </Text>
              <Text style={styles.currencyLabel}>ETB</Text>
            </View>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={styles.detailLabelContainer}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="repeat-outline"
                  size={15}
                  color={Colors.textSecondary}
                />
              </View>
              <Text style={styles.detailLabel}>Frequency</Text>
            </View>

            <Text style={styles.detailValue}>
              {formatFrequency(source.frequency)}
            </Text>
          </View>

          {source.nextExpectedDate ? (
            <View style={styles.detailRow}>
              <View style={styles.detailLabelContainer}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={Colors.textSecondary}
                  />
                </View>
                <Text style={styles.detailLabel}>Next expected</Text>
              </View>

              <Text style={styles.detailValue}>
                {source.nextExpectedDate.slice(0, 10)}
              </Text>
            </View>
          ) : null}
        </View>

        {menuSourceId === source.id && (
          <View style={styles.actionMenu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleEditSource(source)}
              accessibilityRole="button"
            >
              <View style={styles.menuIcon}>
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.text}
                />
              </View>

              <Text style={styles.menuItemText}>Edit source</Text>

              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDeleteSource(source)}
              accessibilityRole="button"
            >
              <View style={[styles.menuIcon, styles.deleteMenuIcon]}>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={Colors.danger}
                />
              </View>

              <Text style={styles.deleteMenuText}>Delete source</Text>

              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.danger}
              />
            </TouchableOpacity>
          </View>
        )}

        {active && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => handleRecordIncome(source)}
            accessibilityRole="button"
            accessibilityLabel={`Record income for ${source.name}`}
            activeOpacity={0.8}
          >
            <View style={styles.recordIcon}>
              <Ionicons name="add" size={19} color="#FFFFFF" />
            </View>

            <Text style={styles.recordButtonText}>Record income</Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color={Colors.primary}
            />
          </TouchableOpacity>
        )}

        {!active && (
          <View style={styles.inactiveBadge}>
            <Ionicons
              name="pause-circle-outline"
              size={14}
              color="#6B7280"
            />
            <Text style={styles.inactiveBadgeText}>
              Inactive source
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSources(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSource}
          accessibilityRole="button"
          accessibilityLabel="Add money source"
          activeOpacity={0.85}
        >
          <View style={styles.addButtonIcon}>
            <Ionicons name="add" size={22} color={Colors.primary} />
          </View>

          <Text style={styles.addButtonText}>Add Money Source</Text>

          <View style={styles.addButtonArrow}>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />
          </View>
        </TouchableOpacity>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color={Colors.danger}
            />

            <View style={styles.errorContent}>
              <Text style={styles.errorText}>{errorMessage}</Text>

              <TouchableOpacity
                onPress={() => void loadSources()}
                style={styles.retryButton}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>
              Loading money sources...
            </Text>
          </View>
        ) : sources.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="wallet"
                size={32}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No money sources yet
            </Text>

            <Text style={styles.emptyText}>
              Add your salary, business income, freelance work, or another
              source to start recording income.
            </Text>

            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={handleAddSource}
              accessibilityRole="button"
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyAddButtonText}>
                Add your first source
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Active money sources */}
            <View style={styles.listHeading}>
              <View>
                <Text style={styles.sectionTitle}>
                  Active money sources
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Your available sources for recording income.
                </Text>
              </View>

              <View style={styles.sourceCountBadge}>
                <Text style={styles.sourceCount}>
                  {activeSources.length}
                </Text>
              </View>
            </View>

            {activeSources.length > 0 ? (
              <View style={styles.sourceList}>
                {activeSources.map(renderSource)}
              </View>
            ) : (
              <View style={styles.sectionEmptyBox}>
                <Ionicons
                  name="wallet-outline"
                  size={27}
                  color={Colors.textSecondary}
                />
                <Text style={styles.sectionEmptyTitle}>
                  No active money sources
                </Text>
                <Text style={styles.sectionEmptyText}>
                  All your existing sources are inactive. You can expand
                  the inactive section below to view or manage them.
                </Text>
              </View>
            )}

            {/* Inactive money sources: hidden until expanded */}
            {inactiveSources.length > 0 && (
              <View style={styles.inactiveSection}>
                <TouchableOpacity
                  style={styles.inactiveToggle}
                  onPress={() =>
                    setShowInactiveSources((current) => !current)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    showInactiveSources
                      ? 'Hide inactive money sources'
                      : `Show ${inactiveSources.length} inactive money sources`
                  }
                  accessibilityState={{
                    expanded: showInactiveSources,
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.inactiveToggleIcon}>
                    <Ionicons
                      name="archive-outline"
                      size={21}
                      color="#6B7280"
                    />
                  </View>

                  <View style={styles.inactiveToggleText}>
                    <Text style={styles.inactiveToggleTitle}>
                      Inactive money sources
                    </Text>
                    <Text style={styles.inactiveToggleSubtitle}>
                      {showInactiveSources
                        ? 'Tap to hide inactive sources'
                        : 'Tap to view paused sources'}
                    </Text>
                  </View>

                  <View style={styles.inactiveCountBadge}>
                    <Text style={styles.inactiveCountText}>
                      {inactiveSources.length}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      showInactiveSources
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>

                {showInactiveSources && (
                  <View style={styles.inactiveList}>
                    {inactiveSources.map(renderSource)}
                  </View>
                )}
              </View>
            )}

            <View style={styles.footer}>
              <Ionicons
                name="refresh-outline"
                size={15}
                color={Colors.textSecondary}
              />
              <Text style={styles.footerText}>
                Pull down to refresh your money sources.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  addButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 17,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#14532D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  addButtonIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  addButtonArrow: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  sourceCountBadge: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCount: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
  },
  sourceList: {
    gap: 15,
  },
  sourceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 21,
    padding: 16,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
  },
  inactiveCard: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FCFCFD',
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sourceIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceInfo: {
    flex: 1,
    gap: 6,
  },
  sourceName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sourceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceType: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  moreButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonActive: {
    backgroundColor: '#E5E7EB',
  },
  amountPanel: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 16,
  },
  amountHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  amountLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 5,
  },
  amountValue: {
    flexShrink: 1,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  currencyLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    gap: 13,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  detailValue: {
    flexShrink: 1,
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  actionMenu: {
    marginTop: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteMenuIcon: {
    backgroundColor: '#FEF2F2',
  },
  menuItemText: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteMenuText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F2F5',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  recordIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonText: {
    flex: 1,
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },
  inactiveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginTop: 14,
  },
  inactiveBadgeText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 55,
    gap: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 22,
    padding: 25,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 9,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginTop: 20,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionEmptyBox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 25,
    gap: 8,
  },
  sectionEmptyTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionEmptyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  inactiveSection: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inactiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 66,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  inactiveToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  inactiveToggleText: {
    flex: 1,
  },
  inactiveToggleTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveToggleSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  inactiveCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 7,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  inactiveCountText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  inactiveList: {
    marginTop: 13,
    gap: 15,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 13,
    marginBottom: 16,
  },
  errorContent: {
    flex: 1,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingTop: 9,
  },
  retryText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
});