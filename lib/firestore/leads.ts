import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { Lead, Message } from '../types';

const LEADS_COLLECTION = 'leads';

const initialSeedLeads: Lead[] = [
  {
    id: 'lead-1',
    name: 'Ananya Deshmukh',
    phone: '+919820112233',
    email: 'ananya.d@gmail.com',
    source: 'facebook_ads',
    consentStatus: 'opted_in',
    status: 'site_visit',
    aiStatus: 'needs_agent',
    createdAt: Date.now() - 3600000 * 4,
    lastContactedAt: Date.now() - 1800000,
    aiSummary: 'Looking for 3BHK in Whitefield around 1.5 - 1.8 Cr. Ready for site visit this Sunday.',
    leadScore: 'Hot',
    budget: '1.5 - 1.8 Cr',
    locality: 'Whitefield',
    propertyType: '3BHK',
  },
  {
    id: 'lead-2',
    name: 'Vikram Malhotra',
    phone: '+919845098765',
    email: 'vikram.m@outlook.com',
    source: 'whatsapp_inbound',
    consentStatus: 'opted_in',
    status: 'contacted',
    aiStatus: 'ai_handling',
    createdAt: Date.now() - 3600000 * 12,
    lastContactedAt: Date.now() - 3600000 * 2,
    aiSummary: 'Inquired about 2BHK near Sarjapur under 1 Cr for investment purpose.',
    leadScore: 'Warm',
    budget: '80 Lac - 1 Cr',
    locality: 'Sarjapur Road',
    propertyType: '2BHK',
  },
  {
    id: 'lead-3',
    name: 'Rohan Mehta',
    phone: '+919900112233',
    email: 'rohan.mehta@corp.in',
    source: '99acres',
    consentStatus: 'opted_in',
    status: 'negotiation',
    aiStatus: 'needs_agent',
    createdAt: Date.now() - 86400000 * 2,
    lastContactedAt: Date.now() - 3600000 * 5,
    aiSummary: 'High net worth client looking for 4BHK sea-view apartment in Bandra West.',
    leadScore: 'Hot',
    budget: '5 - 6.5 Cr',
    locality: 'Bandra West',
    propertyType: '4BHK',
  }
];

const memoryLeads: Lead[] = [...initialSeedLeads];
const memoryMessages: Record<string, Message[]> = {
  'lead-1': [
    {
      id: 'msg-1',
      leadId: 'lead-1',
      role: 'lead',
      content: 'Hi, I saw your ad for 3BHK flats in Whitefield. What is the starting price?',
      timestamp: Date.now() - 3600000 * 4,
    },
    {
      id: 'msg-2',
      leadId: 'lead-1',
      role: 'ai',
      content: 'Hi Ananya! Thanks for reaching out. We have prime 3BHK options in Prestige Lakeside Habitat (Whitefield) starting around ₹1.45 Cr with lake views and full luxury amenities. What is your approximate budget and timeline for moving in?',
      timestamp: Date.now() - 3600000 * 4 + 10000,
    },
    {
      id: 'msg-3',
      leadId: 'lead-1',
      role: 'lead',
      content: 'My budget is around 1.5 to 1.8 Cr. Can we schedule a site visit this Sunday morning?',
      timestamp: Date.now() - 1800000,
    },
    {
      id: 'msg-4',
      leadId: 'lead-1',
      role: 'ai',
      content: 'Absolutely, Sunday morning works perfectly! I will have Rahul connect with you to confirm the exact 11:00 AM slot. Looking forward to showing you the property!',
      timestamp: Date.now() - 1790000,
    }
  ]
};

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  const newId = `lead-${Date.now()}`;
  const lead: Lead = {
    id: newId,
    name: data.name || 'New Lead',
    phone: data.phone || '',
    email: data.email || '',
    source: data.source || 'manual',
    createdAt: Date.now(),
    consentStatus: data.consentStatus || 'pending',
    aiStatus: data.aiStatus || 'ai_handling',
    status: data.status || 'new',
    leadScore: data.leadScore || 'Unscored',
    ...data,
  } as Lead;
  
  if (isFirebaseConfigured() && adminDb) {
    try {
      const docRef = adminDb.collection(LEADS_COLLECTION).doc(lead.id);
      await docRef.set(lead);
      return lead;
    } catch (error) {
      console.warn('[Firestore] Failed to create lead in Firebase, using memory store:', error);
    }
  }

  memoryLeads.unshift(lead);
  return lead;
}

export async function getLeads(): Promise<Lead[]> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      let snapshot;
      try {
        snapshot = await adminDb.collection(LEADS_COLLECTION)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();
      } catch {
        snapshot = await adminDb.collection(LEADS_COLLECTION).limit(100).get();
      }
      
      return snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as Lead))
        .filter((lead: Lead) => !lead.deletedAt)
        .sort((a: Lead, b: Lead) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.warn('[Firestore] Failed to get leads from Firebase:', error);
      return [];
    }
  }

  return memoryLeads.filter(lead => !lead.deletedAt);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      const doc = await adminDb.collection(LEADS_COLLECTION).doc(id).get();
      if (doc.exists) return doc.data() as Lead;
    } catch (error) {
      console.warn('[Firestore] Failed to get lead by id from Firebase:', error);
    }
  }

  return memoryLeads.find(l => l.id === id) || null;
}

export async function getLeadByPhone(phone: string): Promise<Lead | null> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      const snapshot = await adminDb.collection(LEADS_COLLECTION)
        .where('phone', '==', phone)
        .limit(1)
        .get();
        
      if (!snapshot.empty) return snapshot.docs[0].data() as Lead;
    } catch (error) {
      console.warn('[Firestore] Failed to get lead by phone from Firebase:', error);
    }
  }

  return memoryLeads.find(l => l.phone === phone) || null;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(LEADS_COLLECTION).doc(id).update(updates);
      return;
    } catch (error) {
      console.warn('[Firestore] Failed to update lead in Firebase:', error);
    }
  }

  const idx = memoryLeads.findIndex(l => l.id === id);
  if (idx !== -1) {
    memoryLeads[idx] = { ...memoryLeads[idx], ...updates };
  }
}

export async function deleteLead(id: string): Promise<void> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(LEADS_COLLECTION).doc(id).update({
        deletedAt: Date.now()
      });
      return;
    } catch (error) {
      console.warn('[Firestore] Failed to delete lead in Firebase:', error);
    }
  }

  const idx = memoryLeads.findIndex(l => l.id === id);
  if (idx !== -1) {
    memoryLeads[idx].deletedAt = Date.now();
  }
}

export async function getConversation(leadId: string): Promise<Message[]> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      const snapshot = await adminDb.collection(LEADS_COLLECTION).doc(leadId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .get();
        
      if (!snapshot.empty) {
        return snapshot.docs.map((doc: any) => doc.data() as Message);
      }
    } catch (error) {
      console.warn('[Firestore] Failed to get conversation from Firebase:', error);
    }
  }

  return memoryMessages[leadId] || [];
}

export async function saveMessage(leadId: string, message: Omit<Message, 'id'>): Promise<Message> {
  const fullMessage: Message = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  if (isFirebaseConfigured() && adminDb) {
    try {
      const msgRef = adminDb.collection(LEADS_COLLECTION).doc(leadId).collection('messages').doc(fullMessage.id);
      await msgRef.set(fullMessage);
      return fullMessage;
    } catch (error) {
      console.warn('[Firestore] Failed to save message in Firebase:', error);
    }
  }

  if (!memoryMessages[leadId]) {
    memoryMessages[leadId] = [];
  }
  memoryMessages[leadId].push(fullMessage);
  return fullMessage;
}
