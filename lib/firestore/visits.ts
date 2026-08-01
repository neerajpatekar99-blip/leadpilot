import { adminDb } from '../firebase-admin';
import { SiteVisit } from '../types';

const VISITS_COLLECTION = 'visits';

export async function createVisit(data: Partial<SiteVisit>): Promise<SiteVisit> {
  const newRef = adminDb.collection(VISITS_COLLECTION).doc();
  const visit: SiteVisit = {
    ...data,
    id: newRef.id,
    createdAt: Date.now(),
    status: data.status || 'Upcoming',
  } as SiteVisit;
  
  await newRef.set(visit);
  return visit;
}

export async function getVisits(): Promise<SiteVisit[]> {
  const snapshot = await adminDb.collection(VISITS_COLLECTION)
    .orderBy('scheduledAt', 'asc')
    .get();
  
  return snapshot.docs.map(doc => doc.data() as SiteVisit);
}

export async function updateVisit(id: string, updates: Partial<SiteVisit>): Promise<void> {
  await adminDb.collection(VISITS_COLLECTION).doc(id).update(updates);
}

export async function deleteVisit(id: string): Promise<void> {
  await adminDb.collection(VISITS_COLLECTION).doc(id).delete();
}
