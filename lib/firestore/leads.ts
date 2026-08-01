import { adminDb } from '../firebase-admin';
import { Lead, Message } from '../types';

const LEADS_COLLECTION = 'leads';

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  const newLeadRef = adminDb.collection(LEADS_COLLECTION).doc();
  const lead: Lead = {
    ...data,
    id: newLeadRef.id,
    createdAt: Date.now(),
    consentStatus: data.consentStatus || 'pending',
    aiStatus: data.aiStatus || 'ai_handling',
    status: data.status || 'new',
    leadScore: data.leadScore || 'Unscored',
  } as Lead;
  
  await newLeadRef.set(lead);
  return lead;
}

export async function getLeads(): Promise<Lead[]> {
  const snapshot = await adminDb.collection(LEADS_COLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  
  return snapshot.docs
    .map(doc => doc.data() as Lead)
    .filter(lead => !lead.deletedAt);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const doc = await adminDb.collection(LEADS_COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return doc.data() as Lead;
}

export async function getLeadByPhone(phone: string): Promise<Lead | null> {
  const snapshot = await adminDb.collection(LEADS_COLLECTION)
    .where('phone', '==', phone)
    .limit(1)
    .get();
    
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as Lead;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  await adminDb.collection(LEADS_COLLECTION).doc(id).update(updates);
}

export async function deleteLead(id: string): Promise<void> {
  await adminDb.collection(LEADS_COLLECTION).doc(id).update({
    deletedAt: Date.now()
  });
}

export async function getConversation(leadId: string): Promise<Message[]> {
  const snapshot = await adminDb.collection(LEADS_COLLECTION).doc(leadId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .get();
    
  return snapshot.docs.map(doc => doc.data() as Message);
}

export async function saveMessage(leadId: string, message: Omit<Message, 'id'>): Promise<Message> {
  const msgRef = adminDb.collection(LEADS_COLLECTION).doc(leadId).collection('messages').doc();
  const fullMessage = { ...message, id: msgRef.id };
  await msgRef.set(fullMessage);
  return fullMessage;
}
