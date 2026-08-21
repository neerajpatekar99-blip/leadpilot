import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { SiteVisit } from '../types';

const VISITS_COLLECTION = 'visits';

const initialSeedVisits: SiteVisit[] = [
  {
    id: 'visit-1',
    leadId: 'lead-1',
    leadName: 'Ananya Deshmukh',
    propertyId: 'prop-1',
    propertyTitle: 'Prestige Lakeside Habitat 3BHK',
    scheduledAt: Date.now() + 86400000 * 2, // Sunday
    status: 'Upcoming',
    notes: 'Requested high floor unit facing the clubhouse.',
    createdAt: Date.now() - 3600000,
  }
];

let memoryVisits: SiteVisit[] = [...initialSeedVisits];

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
      const snapshot = await adminDb.collection(VISITS_COLLECTION)
        .orderBy('scheduledAt', 'asc')
        .limit(50)
        .get();
      
      if (!snapshot.empty) {
        return snapshot.docs.map((doc: any) => doc.data() as SiteVisit);
      }
    } catch (error) {
      console.warn('[Firestore] Failed to get visits from Firebase, using memory store:', error);
    }
  }

  return memoryVisits;
}

export async function updateVisit(id: string, updates: Partial<SiteVisit>): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(VISITS_COLLECTION).doc(id).update(updates);
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
