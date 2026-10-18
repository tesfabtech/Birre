
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';

import { auth } from '../firebase';
import { apiRequest } from '../api';

type AccountStatus = {
  exists: boolean;
};

type AuthContextType = {
  user: User | null;
  initializing: boolean;
  profileInitializing: boolean;
  profileExists: boolean;
  profileError: string | null;
  authFlowInProgress: boolean;
  setAuthFlowInProgress: (inProgress: boolean) => void;
  refreshProfile: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  initializing: true,
  profileInitializing: false,
  profileExists: false,
  profileError: null,
  authFlowInProgress: false,
  setAuthFlowInProgress: () => {},
  refreshProfile: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileInitializing, setProfileInitializing] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authFlowInProgress, setAuthFlowInProgressState] = useState(false);

  const authFlowRef = useRef(false);
  const requestIdRef = useRef(0);

  const setAuthFlowInProgress = useCallback((inProgress: boolean) => {
    authFlowRef.current = inProgress;
    setAuthFlowInProgressState(inProgress);

    if (inProgress) {
      // Invalidate any profile checks started before this auth flow.
      requestIdRef.current += 1;
      setProfileExists(false);
      setProfileError(null);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    const requestId = ++requestIdRef.current;

    if (!firebaseUser) {
      setUser(null);
      setProfileExists(false);
      setProfileInitializing(false);
      setProfileError(null);
      return false;
    }

    setUser(firebaseUser);
    setProfileInitializing(true);
    setProfileError(null);

    try {
      const status = (await apiRequest('/users/account-status', {
        method: 'GET',
      })) as AccountStatus;

      if (requestId !== requestIdRef.current) return false;

      if (!status.exists) {
        setProfileExists(false);
        return false;
      }

      await apiRequest('/users/me', { method: 'GET' });

      if (requestId !== requestIdRef.current) return false;

      setProfileExists(true);
      setProfileError(null);
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) return false;

      console.error('Failed to refresh Birre profile:', error);

      setProfileExists(false);
      setProfileError(
        error instanceof Error
          ? error.message
          : 'Failed to check your Birre account.',
      );

      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        setProfileInitializing(false);
        setInitializing(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (!active) return;

      const requestId = ++requestIdRef.current;

      setUser(firebaseUser);
      setProfileError(null);

      if (!firebaseUser) {
        setProfileExists(false);
        setProfileInitializing(false);
        setInitializing(false);
        return;
      }

      // The login screen owns verification while an explicit
      // sign-in or sign-up operation is running.
      if (authFlowRef.current) {
        setProfileExists(false);
        setProfileInitializing(false);
        setInitializing(false);
        return;
      }

      setProfileExists(false);
      setProfileInitializing(true);

      try {
        const status = (await apiRequest('/users/account-status', {
          method: 'GET',
        })) as AccountStatus;

        if (!active || requestId !== requestIdRef.current) return;

        if (!status.exists) {
          setProfileExists(false);
          return;
        }

        await apiRequest('/users/me', { method: 'GET' });

        if (!active || requestId !== requestIdRef.current) return;

        setProfileExists(true);
        setProfileError(null);
      } catch (error) {
        if (!active || requestId !== requestIdRef.current) return;

        console.error('Failed to initialize Birre profile:', error);

        setProfileExists(false);
        setProfileError(
          error instanceof Error
            ? error.message
            : 'Failed to initialize your Birre profile.',
        );
      } finally {
        if (active && requestId === requestIdRef.current) {
          setProfileInitializing(false);
          setInitializing(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    requestIdRef.current += 1;
    await signOut(auth);
    setUser(null);
    setProfileExists(false);
    setProfileError(null);
    setProfileInitializing(false);
    setAuthFlowInProgress(false);
  }, [setAuthFlowInProgress]);

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        profileInitializing,
        profileExists,
        profileError,
        authFlowInProgress,
        setAuthFlowInProgress,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
