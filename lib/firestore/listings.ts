import { adminDb } from '../firebase-admin';
import { Listing } from '../types';

const LISTINGS_COLLECTION = 'listings';

export async function createListing(data: Partial<Listing>): Promise<Listing> {
  const newRef = adminDb.collection(LISTINGS_COLLECTION).doc();
  const listing: Listing = {
    ...data,
    id: newRef.id,
    createdAt: Date.now(),
    status: data.status || 'Active',
  } as Listing;
  
  await newRef.set(listing);
  return listing;
}

export async function getListings(): Promise<Listing[]> {
  const snapshot = await adminDb.collection(LISTINGS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  
  return snapshot.docs.map(doc => doc.data() as Listing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const doc = await adminDb.collection(LISTINGS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Listing;
}

export async function updateListing(id: string, updates: Partial<Listing>): Promise<void> {
  await adminDb.collection(LISTINGS_COLLECTION).doc(id).update(updates);
}

export async function deleteListing(id: string): Promise<void> {
  await adminDb.collection(LISTINGS_COLLECTION).doc(id).delete();
}
