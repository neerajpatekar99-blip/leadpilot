import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { Property } from '../types';

const PROPERTIES_COLLECTION = 'properties';

const initialSeedProperties: Property[] = [
  {
    id: 'prop-1',
    title: 'Prestige Lakeside Habitat 3BHK',
    propertyType: '3BHK',
    locality: 'Whitefield, Bangalore',
    priceMin: 14500000,
    priceMax: 17500000,
    areaSqft: 1850,
    amenities: ['Clubhouse', 'Olympic Pool', 'Tennis Court', '24/7 Security', 'Power Backup'],
    imageUrls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'available',
    description: 'Spacious high-floor 3BHK overlooking Varthur lake with Italian marble flooring and modular kitchen.',
    builderName: 'Prestige Group',
    possessionDate: 'Ready to Move',
    furnishing: 'semi_furnished',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'prop-2',
    title: 'Godrej Palm Retreat 2BHK',
    propertyType: '2BHK',
    locality: 'Sarjapur Road, Bangalore',
    priceMin: 8500000,
    priceMax: 9800000,
    areaSqft: 1200,
    amenities: ['Resort Style Living', 'Gym', 'Jogging Track', 'Kids Play Area'],
    imageUrls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'available',
    description: 'Modern 2BHK in prime IT corridor with 80% open greens and excellent rental yield.',
    builderName: 'Godrej Properties',
    possessionDate: 'Dec 2026',
    furnishing: 'unfurnished',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'prop-3',
    title: 'Lodha Sea View Luxury 4BHK',
    propertyType: '4BHK',
    locality: 'Bandra West, Mumbai',
    priceMin: 55000000,
    priceMax: 65000000,
    areaSqft: 3200,
    amenities: ['Private Elevator', 'Sea View Deck', 'Infinity Pool', 'Concierge Service', '3 Car Parking'],
    imageUrls: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80'
    ],
    status: 'available',
    description: 'Ultra-luxurious sea-facing residence with bespoke interiors and panoramic Arabian Sea views.',
    builderName: 'Lodha Group',
    possessionDate: 'Ready to Move',
    furnishing: 'fully_furnished',
    createdAt: Date.now() - 86400000,
  }
];

const memoryProperties: Property[] = [...initialSeedProperties];

export async function createProperty(data: Omit<Property, 'id' | 'createdAt'>): Promise<Property> {
  const newProperty: Property = {
    ...data,
    id: `prop-${Date.now()}`,
    createdAt: Date.now(),
    status: data.status || 'available',
  };

  if (isFirebaseConfigured() && adminDb) {
    try {
      const docRef = adminDb.collection(PROPERTIES_COLLECTION).doc(newProperty.id);
      await docRef.set(newProperty);
      return newProperty;
    } catch (error) {
      console.warn('[Firestore] Failed to create property in Firebase, falling back to memory store:', error);
    }
  }

  memoryProperties.unshift(newProperty);
  return newProperty;
}

export async function getProperties(filters?: { status?: string }): Promise<Property[]> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      let snapshot;
      try {
        let query: any = adminDb.collection(PROPERTIES_COLLECTION);
        if (filters?.status) {
          query = query.where('status', '==', filters.status);
        }
        query = query.orderBy('createdAt', 'desc').limit(100);
        snapshot = await query.get();
      } catch {
        let query: any = adminDb.collection(PROPERTIES_COLLECTION);
        if (filters?.status) {
          query = query.where('status', '==', filters.status);
        }
        snapshot = await query.limit(100).get();
      }

      return snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as Property))
        .sort((a: Property, b: Property) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.warn('[Firestore] Failed to get properties from Firebase:', error);
      return [];
    }
  }

  let filtered = [...memoryProperties];
  if (filters?.status) {
    filtered = filtered.filter(p => p.status === filters.status);
  }
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      const doc = await adminDb.collection(PROPERTIES_COLLECTION).doc(id).get();
      if (doc.exists) {
        return doc.data() as Property;
      }
    } catch (error) {
      console.warn('[Firestore] Failed to get property by id from Firebase:', error);
    }
  }

  return memoryProperties.find(p => p.id === id);
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
  const property = await getPropertyById(id);
  if (!property) return null;

  const updated: Property = {
    ...property,
    ...updates,
    updatedAt: Date.now(),
  };

  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(PROPERTIES_COLLECTION).doc(id).set(updated, { merge: true });
    } catch (error) {
      console.warn('[Firestore] Failed to update property in Firebase:', error);
    }
  }

  const idx = memoryProperties.findIndex(p => p.id === id);
  if (idx !== -1) {
    memoryProperties[idx] = updated;
  }
  return updated;
}

export async function deleteProperty(id: string): Promise<boolean> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(PROPERTIES_COLLECTION).doc(id).update({
        status: 'sold',
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.warn('[Firestore] Failed to soft-delete property in Firebase:', error);
    }
  }

  const index = memoryProperties.findIndex(p => p.id === id);
  if (index === -1) return false;
  memoryProperties[index].status = 'sold';
  return true;
}

export function parseBudget(budgetStr: string): { min: number, max: number } {
  if (!budgetStr) return { min: 0, max: Infinity };
  
  const text = budgetStr.toLowerCase().replace(/,/g, '');
  let multiplier = 1;
  if (text.includes('cr') || text.includes('crore')) {
    multiplier = 10000000;
  } else if (text.includes('lac') || text.includes('lakh') || text.includes('lak')) {
    multiplier = 100000;
  } else if (text.includes('k') || text.includes('thousand')) {
    multiplier = 1000;
  }

  const numbers = text.match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return { min: 0, max: Infinity };

  if (numbers.length === 1) {
    const val = parseFloat(numbers[0]) * multiplier;
    return { min: val * 0.8, max: val * 1.2 }; // +/- 20% range
  } else {
    let min = parseFloat(numbers[0]) * multiplier;
    let max = parseFloat(numbers[1]) * multiplier;
    if (min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    return { min, max };
  }
}

let cachedAvailableProperties: Property[] = [];
let lastPropsCacheTime = 0;

export async function findMatchingProperties(
  budgetStr: string | null, 
  locality: string | null, 
  propertyType: string | null
): Promise<Property[]> {
  const now = Date.now();
  if (now - lastPropsCacheTime > 60000 || cachedAvailableProperties.length === 0) {
    cachedAvailableProperties = await getProperties({ status: 'available' });
    lastPropsCacheTime = now;
  }
  const allProperties = cachedAvailableProperties;
  const budgetRange = budgetStr ? parseBudget(budgetStr) : { min: 0, max: Infinity };
  
  const matches = allProperties.filter(p => {
    let matchesType = true;
    if (propertyType && propertyType.toLowerCase() !== 'any') {
      const normalizedType = propertyType.toLowerCase().replace(/[\s\-_]/g, '');
      const propType = p.propertyType.toLowerCase().replace(/[\s\-_]/g, '');
      matchesType = propType.includes(normalizedType) || normalizedType.includes(propType);
    }

    let matchesLocality = true;
    if (locality && locality.toLowerCase() !== 'any') {
      const loc = locality.toLowerCase();
      const propLoc = p.locality.toLowerCase();
      matchesLocality = propLoc.includes(loc) || loc.includes(propLoc);
    }

    // Overlapping price range
    const overlapsPrice = p.priceMin <= budgetRange.max && p.priceMax >= budgetRange.min;

    return matchesType && matchesLocality && overlapsPrice;
  });

  // Sort by price proximity (closest to budget range midpoint)
  matches.sort((a, b) => {
    const targetMid = (budgetRange.min + (budgetRange.max === Infinity ? budgetRange.min : budgetRange.max)) / 2;
    const aMid = (a.priceMin + a.priceMax) / 2;
    const bMid = (b.priceMin + b.priceMax) / 2;
    return Math.abs(aMid - targetMid) - Math.abs(bMid - targetMid);
  });

  return matches.slice(0, 3);
}
