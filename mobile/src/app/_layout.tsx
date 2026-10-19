import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../context/AuthContext';
import AppHeader from '@/components/navigation/app-header';
import { Colors } from '@/constants/colors';

const birreLogo = require('../../assets/logo.png');

function BirreLoadingScreen() {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    spinAnimation.start();

    return () => {
      spinAnimation.stop();
    };
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.logoContainer}>
        {/* Circular loading ring */}
        <Animated.View
          style={[
            styles.loadingRing,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={styles.loadingRingHighlight} />
        </Animated.View>

        {/* Birre logo */}
        <View style={styles.logoBackground}>
          <Image
            source={birreLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

function RootNavigator() {
  const {
    user,
    initializing,
    profileInitializing,
    profileExists,
  } = useAuth();

  const segments = useSegments();
  const router = useRouter();

  const isLoginScreen = segments[0] === 'login';

  useEffect(() => {
    // Wait until authentication and profile verification finish.
    if (initializing || profileInitializing) return;

    const hasValidBirreAccount = !!user && profileExists;

    if (!hasValidBirreAccount && !isLoginScreen) {
      router.replace('/login');
      return;
    }

    if (hasValidBirreAccount && isLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [
    user,
    initializing,
    profileInitializing,
    profileExists,
    isLoginScreen,
    router,
  ]);

  // Keep protected screens hidden during authentication,
  // profile verification, and redirects.
  const redirecting =
    !initializing &&
    !profileInitializing &&
    ((!user || !profileExists) && !isLoginScreen ||
      (user && profileExists && isLoginScreen));

  if (initializing || profileInitializing || redirecting) {
    return <BirreLoadingScreen />;
  }

  // Users without a confirmed Birre profile may only access login.
  if ((!user || !profileExists) && !isLoginScreen) {
    return null;
  }

  const showHeader =
    !!user && profileExists && !isLoginScreen;

  return (
    <View style={styles.container}>
      {showHeader && <AppHeader />}

      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />

          <Stack.Screen
            name="add-expense"
            options={{ presentation: 'card' }}
          />

          <Stack.Screen name="login" />
          <Stack.Screen name="menu" />
        </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: '#E5F3EB',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.primary,
  },
  loadingRingHighlight: {
    position: 'absolute',
    top: -4,
    left: 52,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  logoBackground: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 72,
    height: 72,
  },
});