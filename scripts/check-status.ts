import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();

async function check() {
  console.log('--- Checking Agent Profile ---');
  const profileDoc = await db.collection('settings').doc('agent_profile').get();
  if (profileDoc.exists) {
    console.log('Agent Profile in Firestore:', JSON.stringify(profileDoc.data(), null, 2));
  } else {
    console.log('No agent_profile document in Firestore.');
  }

  console.log('\n--- Checking Leads in Firestore ---');
  const leadsSnap = await db.collection('leads').get();
  leadsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Lead ID: ${doc.id}, Name: ${data.name}, Phone: ${data.phone}, aiStatus: ${data.aiStatus}`);
  });

  // Ensure aiEnabled is true in agent_profile
  await db.collection('settings').doc('agent_profile').set({
    aiEnabled: true,
  }, { merge: true });

  // Reset any leads that had agent_took_over back to ai_handling so AI can reply
  for (const doc of leadsSnap.docs) {
    await doc.ref.update({
      aiStatus: 'ai_handling',
    });
  }

  console.log('\n✅ Successfully set aiEnabled=true and reset all leads to ai_handling!');
  process.exit(0);
}

check().catch(console.error);
