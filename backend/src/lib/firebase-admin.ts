
import {
  applicationDefault,
  getApp,
  getApps,
  initializeApp,
  cert,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: process.env.FIREBASE_SERVICE_ACCOUNT
          ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
          : applicationDefault(),
      });

export const firebaseAdminAuth = getAuth(firebaseApp);
