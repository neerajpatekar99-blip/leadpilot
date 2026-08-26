import { adminDb, isFirebaseConfigured } from '../firebase-admin';
import { AgentProfile } from '../types';

const SETTINGS_COLLECTION = 'settings';
const AGENT_DOC_ID = 'agent_profile';

const defaultAgentProfile: AgentProfile = {
  id: 'default_agent',
  name: 'Real Estate Advisor',
  agencyName: 'Ragnor Real Estate',
  phone: '+91 88797 57407',
  email: 'contact@ragnorrealestate.com',
  officeAddress: 'Shop No. 114, First Floor, Tiara Shopping Complex, opposite Raghunath Vihar, Block G, Sector 13, Kharghar, Navi Mumbai, Panvel, Maharashtra 410210',
  specializations: ['Residential 1BHK/2BHK/3BHK/4BHK', 'Villas', 'Plots/Land', 'Commercial Shops & Offices'],
  activeLocalities: ['Kharghar', 'Navi Mumbai', 'Panvel', 'Roadpali', 'Ulwe', 'Taloja', 'Kamothe'],
  tone: 'friendly',
  languagePreference: 'hinglish',
  aiEnabled: true,
  savedNumbers: [],
  customInstructions: `1. Only discuss real estate: properties, pricing, localities, site visits, buying, selling, renting in Kharghar and Navi Mumbai.
2. Follow the standard 6-step qualification flow naturally in warm Hinglish.
3. Keep every response strictly to ONE line without dashes.
4. If customer asks if you are an AI or bot, politely deny it and state you are an assistant working directly for the advisor.
5. When lead is fully qualified, requests direct contact, or wants a visit, provide office contact details: Shop No. 114, First Floor, Tiara Shopping Complex, Sector 13, Kharghar, Navi Mumbai, Phone: +91 88797 57407.`,
  updatedAt: Date.now(),
};

let memoryAgentProfile: AgentProfile = { ...defaultAgentProfile };

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  return digitsOnly.slice(-10);
}

export function isNumberExcluded(phone: string, profile?: AgentProfile | null, lead?: any): boolean {
  if (lead?.doNotReply === true || lead?.aiStatus === 'agent_took_over') {
    return true;
  }
  if (!phone || !profile?.savedNumbers?.length) {
    return false;
  }
  const target10 = normalizePhoneNumber(phone);
  if (!target10) return false;

  return profile.savedNumbers.some(saved => {
    const saved10 = normalizePhoneNumber(saved);
    return Boolean(saved10 && saved10 === target10);
  });
}

export async function getAgentProfile(): Promise<AgentProfile> {
  if (isFirebaseConfigured() && adminDb) {
    try {
      const doc = await adminDb.collection(SETTINGS_COLLECTION).doc(AGENT_DOC_ID).get();
      if (doc.exists) {
        const data = doc.data() as AgentProfile;
        return {
          ...defaultAgentProfile,
          ...data,
          savedNumbers: Array.isArray(data.savedNumbers) ? data.savedNumbers : [],
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
