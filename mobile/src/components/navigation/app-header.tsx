
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

const screenTitles: Record<string, string> = {
  'add-expense': 'Add Expense',
  'add-income': 'Add Income',
  'add-money-source': 'Add Money Source',
  'add-bucket': 'Add Bucket',
  'add-category': 'Add Category',
  'allocation-plans': 'Allocation Plans',
  'add-allocation-plan': 'Add Allocation Plan',
  goals: 'Goals',
  'add-goal': 'Add Goal',
  menu: 'Menu',
  settings: 'Settings',
  profile: 'Profile',
  buckets: 'Buckets',
  history: 'History',
  expenses: 'Expenses',
  income: 'Income',
};

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const menuNavigationLocked = useRef(false);
  const homeNavigationLocked = useRef(false);

  const inTabsGroup = segments[0] === '(tabs)';
  const isHomeScreen =
    pathname === '/(tabs)' || pathname === '/(tabs)/index';

  const currentRoute = segments[segments.length - 1] ?? '';

  const title =
    screenTitles[currentRoute] ??
    currentRoute
      .split('-')
      .map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(' ');

  const showBrand = inTabsGroup;

  const handleOpenMenu = () => {
    if (pathname === '/menu' || menuNavigationLocked.current) {
      return;
    }

    menuNavigationLocked.current = true;
    router.push('/menu');

    requestAnimationFrame(() => {
      menuNavigationLocked.current = false;
    });
  };

  const handleGoHome = () => {
    if (isHomeScreen || homeNavigationLocked.current) {
      return;
    }

    homeNavigationLocked.current = true;
    router.replace('/(tabs)');

    requestAnimationFrame(() => {
      homeNavigationLocked.current = false;
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {showBrand ? (
          <Pressable
            style={styles.brand}
            onPress={handleGoHome}
            accessibilityRole="button"
            accessibilityLabel="Go to Birre home"
          >
            <View style={styles.logo}>
              <Ionicons name="wallet" size={21} color="#FFFFFF" />
            </View>

            <Text style={styles.brandText}>Birre</Text>
          </Pressable>
        ) : (
          <View style={styles.screenHeading}>
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={8}
            >
              <Text style={styles.backArrow}>‹</Text>
            </Pressable>

            <Text style={styles.screenTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.menuButton}
          onPress={handleOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Open app menu"
          hitSlop={8}
        >
          <Ionicons
            name="menu-outline"
            size={28}
            color={Colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },

  header: {
    height: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandText: {
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  screenHeading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },

  backButton: {
    width: 32,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backArrow: {
    color: Colors.text,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '400',
  },

  screenTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
