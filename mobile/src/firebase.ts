import { initializeApp } from 'firebase/app';
// @ts-expect-error - exists at runtime but missing from public type definitions
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDPCjD5c4OLFs9YcV3xhuKc_F7kPmoppKM',
  authDomain: 'birre-7c7a1.firebaseapp.com',
  projectId: 'birre-7c7a1',
  storageBucket: 'birre-7c7a1.firebasestorage.app',
  messagingSenderId: '980546579933',
  appId: '1:980546579933:web:c043d87cfc71f352411a34',
};

const app = initializeApp(firebaseConfig);

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  // If already initialized (e.g., during Fast Refresh), get the existing instance
  const { getAuth } = require('firebase/auth');
  authInstance = getAuth(app);
}

export const auth = authInstance;