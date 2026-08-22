import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

export function isFirebaseConfigured(): boolean {
  return Boolean(projectId && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY'));
}

let adminDb: Firestore | any = null;
let adminStorage: Storage | any = null;

if (isFirebaseConfigured()) {
  try {
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
    adminDb = getFirestore();
    adminStorage = getStorage();
  } catch (error) {
    console.warn('[Firebase Admin] Warning: Failed to initialize Firebase Admin SDK. Using mock fallback.', error);
    adminDb = null;
    adminStorage = null;
  }
} else {
  if (process.env.NODE_ENV === 'development') {
    console.info('[Firebase Admin] Credentials not configured. Running in high-performance local simulated mode.');
  }
}

export { adminDb, adminStorage };


