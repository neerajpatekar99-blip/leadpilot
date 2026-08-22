import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { AgentProfile } from '../types';

const SETTINGS_COLLECTION = 'settings';
const AGENT_DOC_ID = 'agent_profile';

const defaultAgentProfile: AgentProfile = {
  id: 'default_agent',
  name: 'Sachin Bhoir',
  agencyName: 'One Stop Property Solutions',
  phone: '+919876543210',
  specializations: ['Residential 1BHK/2BHK/3BHK', 'Luxury Villas', 'Commercial Offices', 'Pre-Launch Projects'],
  activeLocalities: ['Kharghar', 'Navi Mumbai', 'Panvel', 'Thane', 'Mumbai'],
  tone: 'friendly',
  languagePreference: 'hinglish',
  aiEnabled: true,
  customInstructions: `1. Only discuss real estate: properties, pricing, localities, site visits, buying, selling, renting.
2. Negotiate between asking price and floor price gradually without revealing the floor.
3. Keep every response strictly to ONE line. Never use dashes or hyphens.
4. Escalate with [NEEDS_AGENT] only when booking a confirmed visit slot, paperwork, or token payment.`,
  updatedAt: Date.now(),
};

let memoryAgentProfile: AgentProfile = { ...defaultAgentProfile };

export async function getAgentProfile(): Promise<AgentProfile> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(AGENT_DOC_ID).get();
      if (doc.exists) {
        const data = doc.data() as AgentProfile;
        return {
          ...defaultAgentProfile,
          ...data,
        };
      } else {
        await adminDb.collection(SETTINGS_COLLECTION).doc(AGENT_DOC_ID).set(defaultAgentProfile);
        return defaultAgentProfile;
      }
    } catch (error) {
      console.warn('[Firestore] Failed to fetch agent profile from Firebase, using memory store:', error);
      return memoryAgentProfile;
    }
  }

  return memoryAgentProfile;
}

export async function updateAgentProfile(updates: Partial<AgentProfile>): Promise<AgentProfile> {
  const current = await getAgentProfile();
  const updated: AgentProfile = {
    ...current,
    ...updates,
    updatedAt: Date.now(),
  };

  if (isFirebaseConfigured() && adminDb) {
    try {
      await adminDb.collection(SETTINGS_COLLECTION).doc(AGENT_DOC_ID).set(updated, { merge: true });
    } catch (error) {
      console.warn('[Firestore] Failed to update agent profile in Firebase:', error);
    }
  }

  memoryAgentProfile = updated;
  return updated;
}
