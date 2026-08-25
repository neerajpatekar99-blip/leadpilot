import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { SiteVisit } from '../types';

const VISITS_COLLECTION = 'visits';

const initialSeedVisits: SiteVisit[] = [];

let memoryVisits: SiteVisit[] = [];

export async function createVisit(data: Partial<SiteVisit>): Promise<SiteVisit> {
  const visit: SiteVisit = {
    id: `visit-${Date.now()}`,
    leadId: data.leadId || '',
    leadName: data.leadName || 'Lead',
    propertyId: data.propertyId,
    propertyTitle: data.propertyTitle,
    scheduledAt: data.scheduledAt || Date.now() + 86400000,
    status: data.status || 'Upcoming',
    notes: data.notes,
    createdAt: Date.now(),
    ...data,
  } as SiteVisit;

  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(VISITS_COLLECTION).doc(visit.id).set(visit);
      return visit;
    } catch (error) {
      console.warn('[Firestore] Failed to create visit in Firebase, using memory store:', error);
    }
  }

  memoryVisits.unshift(visit);
  return visit;
}

export async function getVisits(): Promise<SiteVisit[]> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      let snapshot;
      try {
        snapshot = await adminDb.collection(VISITS_COLLECTION)
          .orderBy('scheduledAt', 'asc')
          .limit(50)
          .get();
      } catch {
        snapshot = await adminDb.collection(VISITS_COLLECTION).limit(50).get();
      }
      
      return snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as SiteVisit))
        .sort((a: SiteVisit, b: SiteVisit) => {
          const timeA = a.scheduledAt || (a.createdAt ? a.createdAt : 0);
          const timeB = b.scheduledAt || (b.createdAt ? b.createdAt : 0);
          return timeA - timeB;
        });
    } catch (error) {
      console.warn('[Firestore] Failed to get visits from Firebase:', error);
      return [];
    }
  }

  return memoryVisits;
}

export async function updateVisit(id: string, updates: Partial<SiteVisit>): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(VISITS_COLLECTION).doc(id).set(updates, { merge: true });
      return;
    } catch (error) {
      console.warn('[Firestore] Failed to update visit in Firebase:', error);
    }
  }

  const idx = memoryVisits.findIndex(v => v.id === id);
  if (idx !== -1) {
    memoryVisits[idx] = { ...memoryVisits[idx], ...updates };
  }
}

export async function deleteVisit(id: string): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(VISITS_COLLECTION).doc(id).delete();
      return;
    } catch (error) {
      console.warn('[Firestore] Failed to delete visit in Firebase:', error);
    }
  }

  memoryVisits = memoryVisits.filter(v => v.id !== id);
}
