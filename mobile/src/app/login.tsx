
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { signInWithGoogle } from '../auth';
import { useAuth } from '../context/AuthContext';
import { Colors } from '@/constants/colors';

type AuthMode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isBusy, setIsBusy] = useState(false);

  const {
    refreshProfile,
    setAuthFlowInProgress,
  } = useAuth();

  const handleGoogleAuth = async () => {
    if (isBusy) return;

    setIsBusy(true);
    setAuthFlowInProgress(true);

    try {
      await signInWithGoogle(mode);

      // Verify the Birre profile before allowing navigation
      // to protected screens.
      const profileExists = await refreshProfile();

      if (!profileExists) {
        throw new Error(
          'Your Birre account could not be verified. Please try again.',
        );
      }

      // RootNavigator will now redirect to the dashboard
      // after the authentication flow finishes.
    } catch (error) {
      console.error(
        'Google authentication failed:',
        error instanceof Error ? error.message : error,
      );

      Alert.alert(
        mode === 'signup' ? 'Sign Up Failed' : 'Sign In Failed',
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setAuthFlowInProgress(false);
      setIsBusy(false);
    }
  };

  const isSignUp = mode === 'signup';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome to Birre</Text>

          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Create your account and start managing your money.'
              : 'Sign in to continue managing your money.'}
          </Text>

          <View style={styles.modeContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: !isSignUp,
                disabled: isBusy,
              }}
              style={[
                styles.modeButton,
                !isSignUp && styles.modeButtonActive,
              ]}
              onPress={() => setMode('signin')}
              disabled={isBusy}
            >
              <Text
                style={[
                  styles.modeText,
                  !isSignUp && styles.modeTextActive,
                ]}
              >
                Sign In
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: isSignUp,
                disabled: isBusy,
              }}
              style={[
                styles.modeButton,
                isSignUp && styles.modeButtonActive,
              ]}
              onPress={() => setMode('signup')}
              disabled={isBusy}
            >
              <Text
                style={[
                  styles.modeText,
                  isSignUp && styles.modeTextActive,
                ]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isBusy }}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
              isBusy && styles.buttonDisabled,
            ]}
            onPress={handleGoogleAuth}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <FontAwesome
                  name="google"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.googleButtonText}>
                  {isSignUp
                    ? 'Sign Up with Google'
                    : 'Sign In with Google'}
                </Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            {isSignUp
              ? 'Already have a Birre account? Switch to Sign In.'
              : 'New to Birre? Switch to Sign Up.'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    maxWidth: 300,
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  modeContainer: {
    width: '100%',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 18,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 9,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  googleButton: {
    width: '100%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  googleButtonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    marginTop: 20,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
