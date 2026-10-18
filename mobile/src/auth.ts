
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  deleteUser,
  getAdditionalUserInfo,
  type UserCredential,
} from 'firebase/auth';

import { auth } from './firebase';
import { apiRequest } from './api';

type AuthIntent = 'signin' | 'signup';

type AccountStatus = {
  exists: boolean;
};

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

async function checkAccountStatus(): Promise<AccountStatus> {
  return (await apiRequest('/users/account-status', {
    method: 'GET',
  })) as AccountStatus;
}

/**
 * Signs in with Google and verifies the Birre account.
 *
 * Sign in:
 *   Requires an existing Birre profile.
 *
 * Sign up:
 *   Creates a Birre profile explicitly through the backend.
 */
export async function signInWithGoogle(
  intent: AuthIntent,
): Promise<UserCredential> {
  let firebaseSignInSucceeded = false;

  try {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    // Allow the user to choose the intended Google account.
    try {
      await GoogleSignin.signOut();
    } catch {
      // There may be no cached Google session.
    }

    const response = await GoogleSignin.signIn();

    if (response.type !== 'success') {
      throw new Error('Google sign-in was cancelled.');
    }

    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }

    const credential = GoogleAuthProvider.credential(idToken);

    const result = await signInWithCredential(auth, credential);
    firebaseSignInSucceeded = true;

    // True only if Firebase created this identity during this sign-in.
    const isNewFirebaseUser =
      getAdditionalUserInfo(result)?.isNewUser ?? false;

    // Check Birre only after Firebase authentication succeeds.
    const status = await checkAccountStatus();

    if (intent === 'signin' && !status.exists) {
      // Delete only a Firebase identity newly created by this attempt.
      // Do not delete an existing Firebase account.
      if (isNewFirebaseUser) {
        try {
          await deleteUser(result.user);
          firebaseSignInSucceeded = false;
        } catch (deleteError) {
          console.error(
            'Could not remove the newly created Firebase user:',
            getErrorMessage(deleteError),
          );
          // The outer catch will still sign the user out.
        }
      }

      throw new Error(
        'No Birre account exists for this Google account. Please choose Sign Up first.',
      );
    }

    if (intent === 'signup' && status.exists) {
      throw new Error(
        'A Birre account already exists for this Google account. Please choose Sign In.',
      );
    }

    if (intent === 'signup') {
      await apiRequest('/users/signup', {
        method: 'POST',
      });
    } else {
      // Verify the existing profile without creating a missing one.
      await apiRequest('/users/me', {
        method: 'GET',
      });
    }

    return result;
  } catch (error) {
    // Sign out after failed verification or signup.
    // Signing out does not delete existing Firebase accounts.
    if (firebaseSignInSucceeded) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error(
          'Failed to sign out after authentication error:',
          getErrorMessage(signOutError),
        );
      }
    }

    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.IN_PROGRESS:
          throw new Error('Google sign-in is already in progress.');

        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error(
            'Google Play Services is not available on this device.',
          );

        default:
          throw error;
      }
    }

    throw error;
  }
}
