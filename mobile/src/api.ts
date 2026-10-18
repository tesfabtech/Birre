
import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

import { auth } from './firebase';

const API_BASE_URL = 'http://192.168.8.214:3000';

export type ApiErrorResponse = {
  code?: string;
  message?: string;
  category?: {
    id: string;
    name: string;
    deletedAt?: string | null;
  };
};

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  data?: ApiErrorResponse;

  constructor(
    status: number,
    data: ApiErrorResponse,
    fallbackMessage: string,
  ) {
    super(data.message || fallbackMessage);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = data.code;
    this.data = data;
  }
}

/**
 * Returns the authenticated Firebase user.
 *
 * If Firebase is still restoring the session, wait for its initial
 * authentication state instead of immediately failing the API request.
 */
async function getAuthenticatedUser(): Promise<User> {
  const currentUser = auth.currentUser;

  if (currentUser) {
    return currentUser;
  }

  return new Promise<User>((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    let settled = false;

    const cleanup = () => {
      unsubscribe?.();
    };

    unsubscribe = onAuthStateChanged(
      auth,
      user => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();

        if (user) {
          resolve(user);
        } else {
          reject(
            new Error('You must be signed in to make this request.'),
          );
        }
      },
      error => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      },
    );
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const user = await getAuthenticatedUser();

  // Retrieve a fresh token when needed, preserving the existing
  // Firebase Bearer-token authentication used by the backend.
  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    let errorData: ApiErrorResponse = {};

    try {
      errorData = JSON.parse(responseText) as ApiErrorResponse;
    } catch {
      errorData = { message: responseText };
    }

    throw new ApiRequestError(
      response.status,
      errorData,
      `API request failed (${response.status}).`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
