import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { firebaseAdminAuth } from '../lib/firebase-admin.js';

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: DecodedIdToken;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({
      message: 'Authentication required.',
    });
    return;
  }

  const idToken = authorization.slice('Bearer '.length).trim();

  if (!idToken) {
    res.status(401).json({
      message: 'Authentication token is missing.',
    });
    return;
  }

  try {
    req.firebaseUser = await firebaseAdminAuth.verifyIdToken(idToken);
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);

    res.status(401).json({
      message: 'Invalid or expired authentication token.',
    });
  }
}