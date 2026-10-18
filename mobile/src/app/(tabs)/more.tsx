
import { useCallback, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/colors';

type MenuItemProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
};

export default function MoreScreen() {
  const isOpeningScreen = useRef(false);

  useFocusEffect(
    useCallback(() => {
      isOpeningScreen.current = false;
    }, []),
  );

  function openScreen(path: string) {
    if (isOpeningScreen.current) {
      return;
    }

    isOpeningScreen.current = true;
    router.push(path as any);
  }

  function MenuItem({
    title,
    subtitle,
    icon,
    path,
  }: MenuItemProps) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        style={({ pressed }) => [
          styles.menuItem,
          pressed && styles.menuItemPressed,
        ]}
        onPress={() => openScreen(path)}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={23}
            color={Colors.primary}
          />
        </View>

        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons
            name="chevron-forward"
            size={19}
            color={Colors.textSecondary}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >

      {/* Planning and organization */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionTitle}>PLAN & ORGANIZE</Text>
        </View>

        <View style={styles.menu}>
          <MenuItem
            title="Goals"
            subtitle="Set savings targets and track your progress"
            icon="flag-outline"
            path="/goals"
          />

          <MenuItem
            title="Manage Buckets"
            subtitle="Organize your money into meaningful buckets"
            icon="wallet-outline"
            path="/manage-buckets"
          />

          <MenuItem
            title="Manage Categories"
            subtitle="Create and organize expense categories"
            icon="pricetags-outline"
            path="/manage-categories"
          />
        </View>
      </View>

      {/* Income and money movement */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.sectionTitle}>MONEY ACTIVITY</Text>
        </View>

        <View style={styles.menu}>
          <MenuItem
            title="Money Sources"
            subtitle="Manage your salary, business, and other income sources"
            icon="cash-outline"
            path="/manage-money-sources"
          />

          <MenuItem
            title="Income History"
            subtitle="Review, edit, and delete recorded income"
            icon="receipt-outline"
            path="/income-history"
          />

          <MenuItem
            title="Transfer Between Buckets"
            subtitle="Move money between buckets and review transfers"
            icon="swap-horizontal-outline"
            path="/transfers"
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons
          name="shield-checkmark-outline"
          size={16}
          color={Colors.textSecondary}
        />
        <Text style={styles.footerText}>
          Your money, organized your way.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerText: {
    flex: 1,
    paddingTop: 1,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: Colors.primary,
    marginBottom: 5,
  },

  pageTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.7,
  },

  pageSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginTop: 5,
    maxWidth: 290,
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    gap: 9,
  },

  sectionMarker: {
    width: 4,
    height: 17,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: Colors.textSecondary,
  },

  menu: {
    gap: 11,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    paddingVertical: 15,
    paddingLeft: 14,
    paddingRight: 11,
    minHeight: 86,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },

  menuItemPressed: {
    opacity: 0.78,
    backgroundColor: Colors.primaryLight,
    transform: [{ scale: 0.99 }],
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuText: {
    flex: 1,
    marginLeft: 13,
    marginRight: 7,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 21,
  },

  menuSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 3,
  },

  arrowContainer: {
    width: 27,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingTop: 2,
    paddingBottom: 8,
  },

  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
