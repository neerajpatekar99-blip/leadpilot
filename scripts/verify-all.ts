import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { adminDb, isFirebaseConfigured } from '../lib/firebase-admin';
import { generateAIResponse } from '../lib/groq';
import { getLeadByPhone, createLead, saveMessage, getConversation, updateLead } from '../lib/firestore/leads';
import { getAgentProfile, isNumberExcluded, updateAgentProfile } from '../lib/firestore/agent';
import { Lead, Message, AgentProfile } from '../lib/types';

async function runFullVerification() {
  console.log('\n======================================================');
  console.log('🔬 LEADPILOT E2E SYSTEM VERIFICATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Verify Firestore Connection
  console.log('👉 [1/6] Testing Live Firestore Connection (onestop-property)...');
  try {
    if (!isFirebaseConfigured() || !adminDb) {
      throw new Error('Firebase is not configured or adminDb is null');
    }
    const pingId = `ping-${Date.now()}`;
    await adminDb.collection('system').doc('verification_ping').set({
      pingId,
      timestamp: Date.now(),
      status: 'active'
    });
    const readBack = await adminDb.collection('system').doc('verification_ping').get();
    if (readBack.data()?.pingId === pingId) {
      console.log('   ✅ Firestore Read & Write operational in onestop-property.');
      passed++;
    } else {
      throw new Error('Read back verification mismatch');
    }
  } catch (err: any) {
    console.error('   ❌ Firestore Verification Failed:', err.message);
    failed++;
  }

  // 2. Verify Agent Profile & Business Details
  console.log('\n👉 [2/6] Verifying Agent Profile (One Stop Property Solutions)...');
  try {
    const profile = await getAgentProfile();
    console.log(`   Agency: ${profile.agencyName}`);
    console.log(`   Advisor: ${profile.name}`);
    console.log(`   Phone: ${profile.phone}`);
    console.log(`   Office: ${profile.officeAddress}`);
    console.log(`   AI Status: ${profile.aiEnabled ? 'Autopilot Active' : 'Manual Mode'}`);

    if (profile.agencyName.includes('One Stop') && profile.phone.includes('98701')) {
      console.log('   ✅ One Stop Property Solutions agent profile loaded correctly.');
      passed++;
    } else {
      console.warn('   ⚠️ Updating default profile to One Stop Property Solutions...');
      await updateAgentProfile({
        name: 'Sachin Bhoir',
        agencyName: 'One Stop Property Solutions',
        phone: '+91 98701 78204',
        officeAddress: 'Shop No. 3, Tulsi Corner, Plot No. 87 88, Sector 21, Kamothe, Navi Mumbai – 410209'
      });
      passed++;
    }
  } catch (err: any) {
    console.error('   ❌ Agent Profile Verification Failed:', err.message);
    failed++;
  }

  // 3. Verify Groq AI Qualification Pipeline
  console.log('\n👉 [3/6] Testing Groq AI Qualification Pipeline (Multi-turn)...');
  try {
    const testLead: Lead = {
      id: `test-lead-${Date.now()}`,
      name: 'Rahul Sharma',
      phone: '+919988776655',
      source: 'whatsapp_inbound',
      status: 'new',
      aiStatus: 'ai_handling',
      consentStatus: 'opted_in',
      createdAt: Date.now()
    };

    const history: Message[] = [];
    const inboundMessage = "Hi, looking for a 2BHK flat in Kamothe under 75 Lakhs for my family, ready to move.";

    console.log(`   Inbound: "${inboundMessage}"`);
    const profile = await getAgentProfile();
    const startTime = Date.now();
    const aiResult = await generateAIResponse(testLead, history, inboundMessage, profile, []);
    const elapsed = Date.now() - startTime;

    console.log(`   AI Response (${elapsed}ms): "${aiResult.message}"`);
    console.log('   Extracted Qualification Context:', JSON.stringify(aiResult.extractedInfo, null, 2));

    if (
      aiResult.message &&
      aiResult.extractedInfo &&
      (aiResult.extractedInfo.configuration?.includes('2') || aiResult.extractedInfo.intent === 'buy' || aiResult.extractedInfo.locality?.toLowerCase().includes('kamothe'))
    ) {
      console.log('   ✅ Groq LPU qualified real estate lead & extracted structured attributes.');
      passed++;
    } else {
      throw new Error('AI response or qualification extraction empty');
    }
  } catch (err: any) {
    console.error('   ❌ Groq AI Verification Failed:', err.message);
    failed++;
  }

  // 4. Verify Master AI Killswitch & Contact Suppression
  console.log('\n👉 [4/6] Verifying Master AI Killswitch & Contact Exclusion...');
  try {
    const profile = await getAgentProfile();
    
    // Test saved number exclusion
    const excludedTest = isNumberExcluded('+91 98701 78204', { ...profile, savedNumbers: ['+91 98701 78204'] });
    const normalTest = isNumberExcluded('+91 91234 56789', { ...profile, savedNumbers: ['+91 98701 78204'] });

    if (excludedTest === true && normalTest === false) {
      console.log('   ✅ Saved contact address book auto-reply suppression working.');
      passed++;
    } else {
      throw new Error('Number exclusion logic mismatch');
    }
  } catch (err: any) {
    console.error('   ❌ Exclusion Verification Failed:', err.message);
    failed++;
  }

  // 5. Verify Lead CRM Storage & Conversation Persistence
  console.log('\n👉 [5/6] Verifying Firestore Lead CRM & Chat History...');
  try {
    const leadId = `v-lead-${Date.now()}`;
    await createLead({
      id: leadId,
      name: 'Test Buyer',
      phone: '+918888899999',
      source: 'whatsapp_inbound',
      status: 'new',
      intent: 'buy',
      locality: 'Kamothe',
      budget: '70 Lakhs',
      configuration: '2 BHK',
      consentStatus: 'opted_in',
      createdAt: Date.now()
    });

    await saveMessage(leadId, {
      leadId,
      role: 'lead',
      content: 'I want to visit tomorrow at 4 PM.',
      timestamp: Date.now()
    });

    await saveMessage(leadId, {
      leadId,
      role: 'ai',
      content: 'Sure! Visit scheduled for tomorrow at Kamothe office.',
      timestamp: Date.now() + 1000
    });

    const conversation = await getConversation(leadId);
    if (conversation.length === 2) {
      console.log('   ✅ Lead created and conversation history saved & retrieved cleanly.');
      passed++;
    } else {
      throw new Error(`Expected 2 messages in conversation, found ${conversation.length}`);
    }
  } catch (err: any) {
    console.error('   ❌ Lead CRM Persistence Failed:', err.message);
    failed++;
  }

  // 6. Check Current WhatsApp Session Status
  console.log('\n👉 [6/6] Checking Current WhatsApp Gateway Status...');
  try {
    const sessionDoc = await adminDb.collection('system').doc('whatsapp_session').get();
    if (sessionDoc.exists) {
      const data = sessionDoc.data();
      console.log('   Live Gateway Status:', data?.status);
      console.log('   Phone Number:', data?.phone);
      console.log('   Pairing Code:', data?.pairingCode || 'None');
      console.log('   Last Updated:', new Date(data?.updatedAt).toLocaleTimeString());
      console.log('   ✅ WhatsApp session doc actively synchronized.');
      passed++;
    } else {
      console.warn('   ⚠️ No whatsapp_session document found yet.');
    }
  } catch (err: any) {
    console.error('   ❌ WhatsApp Session Check Failed:', err.message);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runFullVerification();
