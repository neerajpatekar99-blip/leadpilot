import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getLeadByPhone, createLead, saveMessage, getConversation, updateLead } from '../lib/firestore/leads';
import { generateAIResponse } from '../lib/groq';
import { getAgentProfile } from '../lib/firestore/agent';
import { findMatchingProperties } from '../lib/firestore/properties';
import { createTask } from '../lib/firestore/tasks';
import { createVisit } from '../lib/firestore/visits';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TARGET_PHONE = process.env.WHATSAPP_LINK_PHONE || '919870178204'; // Sachin Sir's number

async function startWhatsAppGateway() {
  console.log('\n======================================================');
  console.log('🤖 LEADPILOT AI - NATIVE WHATSAPP GATEWAY (BAILEYS)');
  console.log('======================================================\n');

  const { state, saveCreds } = await useMultiFileAuthState(path.resolve(__dirname, '../whatsapp_auth_info'));
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['LeadPilot AI', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  // If not already registered, generate a Pairing Code for Sachin Sir's phone!
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const cleanPhone = TARGET_PHONE.replace(/[^0-9]/g, '');
        console.log(`\n⏳ Requesting 8-Digit WhatsApp Pairing Code for +${cleanPhone}...`);
        const pairingCode = await sock.requestPairingCode(cleanPhone);
        
        console.log('\n======================================================');
        console.log(`🔑 YOUR 8-DIGIT WHATSAPP PAIRING CODE:  ${pairingCode}`);
        console.log('======================================================');
        console.log(`\n📲 INSTRUCTIONS FOR SACHIN SIR (+${cleanPhone}):`);
        console.log('1. Open WhatsApp on phone.');
        console.log('2. Tap Settings (or 3 dots) ➔ "Linked Devices"');
        console.log('3. Tap "Link a Device" ➔ "Link with phone number instead"');
        console.log(`4. Enter this 8-digit code: 👉  ${pairingCode}`);
        console.log('======================================================\n');
      } catch (err) {
        console.error('Error requesting pairing code:', err);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppGateway();
      }
    } else if (connection === 'open') {
      console.log('\n✅ WHATSAPP CONNECTED & LIVE! Sachin Sir is linked to LeadPilot AI! 🚀\n');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // Ignore messages sent by bot

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us')) continue; // Ignore group messages for now

      const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg.pushName || 'Inbound Lead';
      
      const messageText = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || 
                          '';

      if (!messageText.trim()) continue;

      console.log(`\n📩 Inbound WhatsApp from ${pushName} (+${rawPhone}): "${messageText}"`);

      try {
        // 1. Find or create lead in LeadPilot Firestore
        let lead = await getLeadByPhone(rawPhone);
        if (!lead) {
          lead = await createLead({
            name: pushName,
            phone: `+${rawPhone}`,
            source: 'whatsapp_inbound',
            status: 'new',
            aiStatus: 'ai_handling',
            consentStatus: 'opted_in',
          });
          console.log(`✨ Created new lead in LeadPilot CRM: ${lead.name} (${lead.phone})`);
        }

        if (lead.aiStatus === 'agent_took_over') {
          console.log(`⏸️ Agent took over for ${lead.name}. Skipping auto-reply.`);
          continue;
        }

        // 2. Fetch agent profile & killswitch
        const agentProfile = await getAgentProfile();
        if (agentProfile.aiEnabled === false) {
          console.log('🛑 Master AI Killswitch is active. Skipping auto-reply.');
          continue;
        }

        // 3. Save incoming message to Firestore history
        await saveMessage(lead.id, {
          leadId: lead.id,
          role: 'lead',
          content: messageText,
          timestamp: Date.now(),
        });

        // 4. Conversation history & Property matches
        const history = await getConversation(lead.id);
        let matchingProperties: any[] = [];
        if (lead.budget && (lead.locality || lead.propertyType)) {
          matchingProperties = await findMatchingProperties(
            lead.budget,
            lead.locality || null,
            lead.propertyType || null
          );
        }

        // 5. Generate AI Response via Groq
        console.log(`🧠 Generating AI response for ${pushName}...`);
        const { message: aiResponse, needsAgent, extractedInfo } = await generateAIResponse(
          lead,
          history,
          messageText,
          agentProfile,
          matchingProperties
        );

        // 6. Save AI reply to Firestore history
        await saveMessage(lead.id, {
          leadId: lead.id,
          role: 'ai',
          content: aiResponse,
          timestamp: Date.now(),
        });

        // 7. Send AI Reply over WhatsApp socket
        await sock.sendMessage(remoteJid, { text: aiResponse });
        console.log(`🤖 Sent AI reply to ${pushName}: "${aiResponse}"`);

        // 8. Update lead qualifications
        const updates: any = {};
        let shouldUpdate = false;
        if (needsAgent && lead.aiStatus !== 'needs_agent') {
          updates.aiStatus = 'needs_agent';
          updates.status = 'qualified';
          shouldUpdate = true;
        }
        if (extractedInfo.budget && !lead.budget) { updates.budget = extractedInfo.budget; shouldUpdate = true; }
        if (extractedInfo.locality && !lead.locality) { updates.locality = extractedInfo.locality; shouldUpdate = true; }
        if (extractedInfo.propertyType && !lead.propertyType) { updates.propertyType = extractedInfo.propertyType; shouldUpdate = true; }
        if (extractedInfo.aiSummary) { updates.aiSummary = extractedInfo.aiSummary; shouldUpdate = true; }
        if (extractedInfo.leadScore) { updates.leadScore = extractedInfo.leadScore; shouldUpdate = true; }

        if (shouldUpdate) {
          await updateLead(lead.id, updates);
        }

        // 9. Auto-create tasks / visits
        if (extractedInfo.actionItems && Array.isArray(extractedInfo.actionItems)) {
          for (const taskText of extractedInfo.actionItems) {
            await createTask({ leadId: lead.id, leadName: lead.name, task: taskText, status: 'Pending' });
          }
        }

        if (extractedInfo.siteVisits && Array.isArray(extractedInfo.siteVisits)) {
          for (const visitDateStr of extractedInfo.siteVisits) {
            let ts = Date.now() + 86400000;
            try {
              const p = new Date(visitDateStr).getTime();
              if (!isNaN(p)) ts = p;
            } catch(e) {}
            await createVisit({ leadId: lead.id, leadName: lead.name, scheduledAt: ts, status: 'Upcoming' });
          }
        }

      } catch (err) {
        console.error(`Error processing message from ${rawPhone}:`, err);
      }
    }
  });
}

startWhatsAppGateway().catch((err) => console.error('Fatal WhatsApp Gateway Error:', err));
