import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

function getFirebaseCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

  return { projectId, clientEmail, privateKey };
}

export function isFirebaseConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = getFirebaseCredentials();
  return Boolean(projectId && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY'));
}

let _adminDb: Firestore | null = null;
let _adminStorage: Storage | null = null;

export function getAdminDb(): Firestore | null {
  if (_adminDb) return _adminDb;

  if (isFirebaseConfigured()) {
    try {
      const { projectId, clientEmail, privateKey } = getFirebaseCredentials();
      if (!getApps().length) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket: `${projectId}.appspot.com`,
        });
      }
      _adminDb = getFirestore();
      _adminStorage = getStorage();
      return _adminDb;
    } catch (error) {
      console.warn('[Firebase Admin] Warning: Failed to initialize Firebase Admin SDK. Using mock fallback.', error);
      return null;
    }
  }
  return null;
}

export function getAdminStorage(): Storage | null {
  if (_adminStorage) return _adminStorage;
  getAdminDb();
  return _adminStorage;
}

// Proxy exports for backward compatibility
export const adminDb = new Proxy({}, {
  get(_target, prop) {
    const db = getAdminDb();
    if (!db) return undefined;
    const val = (db as any)[prop];
    return typeof val === 'function' ? val.bind(db) : val;
  }
}) as Firestore;

export const adminStorage = new Proxy({}, {
  get(_target, prop) {
    const storage = getAdminStorage();
    if (!storage) return undefined;
    const val = (storage as any)[prop];
    return typeof val === 'function' ? val.bind(storage) : val;
  }
}) as Storage;
