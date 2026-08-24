import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { Lead, Message } from '../types';

const LEADS_COLLECTION = 'leads';

const initialSeedLeads: Lead[] = [];

const memoryLeads: Lead[] = [];
const memoryMessages: Record<string, Message[]> = {};

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
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  const last10 = digitsOnly.slice(-10);
  const possiblePhones = Array.from(new Set([
    phone,
    digitsOnly,
    `+${digitsOnly}`,
    last10,
    `+91${last10}`,
    `91${last10}`
  ])).filter(Boolean);

  if (isFirebaseConfigured() && adminDb) {
    try {
      for (const p of possiblePhones) {
        const snapshot = await adminDb.collection(LEADS_COLLECTION)
          .where('phone', '==', p)
          .limit(1)
          .get();
          
        if (!snapshot.empty) return snapshot.docs[0].data() as Lead;
      }
    } catch (error) {
      console.warn('[Firestore] Failed to get lead by phone from Firebase:', error);
    }
  }

  return memoryLeads.find(l => {
    const lDigits = (l.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return lDigits && lDigits === last10;
  }) || null;
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
