import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { AgentProfile } from '../types';

const SETTINGS_COLLECTION = 'settings';
const AGENT_DOC_ID = 'agent_profile';

const defaultAgentProfile: AgentProfile = {
  id: 'default_agent',
  name: 'Sachin Bhoir',
  agencyName: 'One Stop Property Solutions',
  phone: '+91 98701 78204',
  email: 'sachin@onestoppropertysolution.in',
  officeAddress: 'Shop No. 3, Tulsi Corner, Plot No. 87 88, Sector 21, Kamothe, Navi Mumbai – 410209',
  specializations: ['Residential 1BHK/2BHK/3BHK/4BHK', 'Villas', 'Plots/Land', 'Commercial Shops & Offices'],
  activeLocalities: ['Kharghar', 'Kamothe', 'Panvel', 'Ulwe', 'Navi Mumbai', 'Thane'],
  tone: 'friendly',
  languagePreference: 'hinglish',
  aiEnabled: true,
  customInstructions: `1. Only discuss real estate: properties, pricing, localities, site visits, buying, selling, renting.
2. Follow Sachin Sir's 6-step qualification flow naturally.
3. Keep every response strictly to ONE line without dashes.
4. When lead is fully qualified, requests direct contact, or wants a visit, provide Sachin Sir's office contact details.`,
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
