
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiRequest } from '@/api';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function MenuScreen() {
  const { logout } = useAuth();

  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const insets = useSafeAreaInsets();
  const isBusy = loggingOut || deletingAccount;

  const handleLogout = () => {
    if (isBusy) return;

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          if (isBusy) return;

          setLoggingOut(true);

          try {
            await logout();
            // The root navigator redirects to /login.
          } catch (error) {
            Alert.alert(
              'Logout failed',
              error instanceof Error
                ? error.message
                : 'Please try again.',
            );
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    if (isBusy) return;

    Alert.alert(
      'Delete your Birre account?',
      'This will permanently delete your account and your associated financial data, including expenses, income, transfers, budgets, and goals. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm permanent deletion',
              'Are you absolutely sure? Your Birre account and its financial data will be permanently deleted.',
              [
                {
                  text: 'Keep my account',
                  style: 'cancel',
                },
                {
                  text: 'Delete permanently',
                  style: 'destructive',
                  onPress: confirmDeleteAccount,
                },
              ],
            );
          },
        },
      ],
    );
  };

  const confirmDeleteAccount = async () => {
    if (isBusy) return;

    setDeletingAccount(true);

    try {
      // Delete the account and associated data on the backend.
      await apiRequest('/users/me', {
        method: 'DELETE',
      });

      // Sign out locally after the backend confirms deletion.
      await logout();

      // The root navigator redirects to /login.
    } catch (error) {
      Alert.alert(
        'Account deletion failed',
        error instanceof Error
          ? error.message
          : 'We could not delete your account. Please try again.',
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.menuItems}>
      

        {/* Log out */}
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
            isBusy && styles.disabled,
          ]}
          onPress={handleLogout}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          {loggingOut ? (
            <ActivityIndicator color={Colors.danger} />
          ) : (
            <Ionicons
              name="log-out-outline"
              size={22}
              color={Colors.danger}
            />
          )}

          <Text style={styles.logoutText}>
            {loggingOut ? 'Logging out...' : 'Log out'}
          </Text>
        </Pressable>

          {/* Delete account */}
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
            isBusy && styles.disabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Delete account permanently"
        >
          {deletingAccount ? (
            <ActivityIndicator color={Colors.danger} />
          ) : (
            <Ionicons
              name="trash-outline"
              size={22}
              color={Colors.danger}
            />
          )}

          <Text style={styles.deleteText}>
            {deletingAccount
              ? 'Deleting account...'
              : 'Delete account'}
          </Text>
        </Pressable>
        
        {/* Language */}
        <View style={styles.languageRow}>
          <View style={styles.languageLeft}>
            <Ionicons
              name="language-outline"
              size={22}
              color={Colors.text}
            />
            <Text style={styles.languageText}>Language</Text>
          </View>

          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>

<View style={styles.languageRow}>
  <View style={styles.languageLeft}>
    <Ionicons
      name="bar-chart-outline"
      size={22}
      color={Colors.text}
    />
    <Text style={styles.languageText}>Financial Reports</Text>
  </View>

  <Text style={styles.comingSoon}>Coming soon</Text>
</View>

      </View>
   

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={styles.versionText}>Version: 1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  menuItems: {
    gap: 12,
  },

  deleteButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
  },

  logoutButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.6,
  },

  deleteText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },

  logoutText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },

  languageRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
  },

  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  languageText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  comingSoon: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },

  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  versionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
});
