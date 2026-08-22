import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import QRCode from 'qrcode';
import { getLeadByPhone, createLead, saveMessage, getConversation, updateLead } from '../lib/firestore/leads';
import { generateAIResponse } from '../lib/groq';
import { getAgentProfile } from '../lib/firestore/agent';
import { findMatchingProperties } from '../lib/firestore/properties';
import { createTask } from '../lib/firestore/tasks';
import { createVisit } from '../lib/firestore/visits';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TARGET_PHONE = process.env.WHATSAPP_LINK_PHONE || '919870178204'; // Sachin Sir's number
const AUTH_DIR = path.resolve(__dirname, '../whatsapp_auth_info');

async function startWhatsAppGateway() {
  console.log('\n======================================================');
  console.log('🤖 LEADPILOT AI - NATIVE WHATSAPP GATEWAY (BAILEYS)');
  console.log('======================================================\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    defaultQueryTimeoutMs: 60000,
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  // If not already registered, generate a Pairing Code
  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const cleanPhone = TARGET_PHONE.replace(/[^0-9]/g, '');
        console.log(`\n⏳ Generating live WhatsApp Pairing Code for +${cleanPhone}...`);
        const pairingCode = await sock.requestPairingCode(cleanPhone);
        
        console.log('\n======================================================');
        console.log(`🔑 LIVE WHATSAPP PAIRING CODE:  ${pairingCode}`);
        console.log('======================================================');
        console.log(`\n📲 INSTRUCTIONS FOR SACHIN SIR (+${cleanPhone}):`);
        console.log('1. Open WhatsApp on phone.');
        console.log('2. Tap Settings (or 3 dots) ➔ "Linked Devices"');
        console.log('3. Tap "Link a Device" ➔ "Link with phone number instead"');
        console.log(`4. Enter this code: 👉  ${pairingCode}`);
        console.log('======================================================\n');
      } catch (err) {
        console.error('Error requesting pairing code:', err);
      }
    }, 2000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrPath = path.resolve(__dirname, '../public/whatsapp-qr.png');
        await QRCode.toFile(qrPath, qr, { width: 400, margin: 2 });
        console.log(`📸 High-res QR code image saved to: ${qrPath}`);
      } catch (e) {}
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed (status ${statusCode}), reconnecting:`, shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startWhatsAppGateway(), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n======================================================');
      console.log('✅ WHATSAPP CONNECTED & LIVE! Sachin Sir is linked! 🚀');
      console.log('======================================================\n');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue; // Ignore messages sent by bot

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us')) continue; // Ignore group messages

      const rawPhone = remoteJid.replace('@s.whatsapp.net', '');
      const pushName = msg.pushName || 'Inbound Lead';
      
      const messageText = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || 
                          '';

      if (!messageText.trim()) continue;

      console.log(`\n📩 Inbound WhatsApp from ${pushName} (+${rawPhone}): "${messageText}"`);

      // 1. Send "Typing..." presence immediately for realistic human interaction
      sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

      try {
        // 2. Find or create lead in parallel
        const [leadRes, agentProfile] = await Promise.all([
          getLeadByPhone(rawPhone),
          getAgentProfile()
        ]);

        let lead = leadRes;
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
          sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
          continue;
        }

        if (agentProfile.aiEnabled === false) {
          console.log('🛑 Master AI Killswitch is active. Skipping auto-reply.');
          sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
          continue;
        }

        // 3. Conversation history & Property matches in parallel
        const [history, matchingProperties] = await Promise.all([
          getConversation(lead.id),
          (lead.budget && (lead.locality || lead.propertyType))
            ? findMatchingProperties(lead.budget, lead.locality || null, lead.propertyType || null)
            : Promise.resolve([])
        ]);

        // Save incoming message in background
        saveMessage(lead.id, {
          leadId: lead.id,
          role: 'lead',
          content: messageText,
          timestamp: Date.now(),
        }).catch(() => {});

        // 4. Generate AI Response via Groq (Llama 3.3 70B - Lightning Fast)
        console.log(`🧠 Generating AI response for ${pushName}...`);
        const { message: aiResponse, needsAgent, extractedInfo } = await generateAIResponse(
          lead,
          history,
          messageText,
          agentProfile,
          matchingProperties
        );

        // 5. Send AI Reply over WhatsApp IMMEDIATELY
        await sock.sendMessage(remoteJid, { text: aiResponse });
        sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
        console.log(`🤖 Sent AI reply to ${pushName}: "${aiResponse}"`);

        // 6. Save AI reply & background CRM updates asynchronously
        saveMessage(lead.id, {
          leadId: lead.id,
          role: 'ai',
          content: aiResponse,
          timestamp: Date.now(),
        }).catch(() => {});

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
          updateLead(lead.id, updates).catch(() => {});
        }

        if (extractedInfo.actionItems && Array.isArray(extractedInfo.actionItems)) {
          for (const taskText of extractedInfo.actionItems) {
            createTask({ leadId: lead.id, leadName: lead.name, task: taskText, status: 'Pending' }).catch(() => {});
          }
        }

        if (extractedInfo.siteVisits && Array.isArray(extractedInfo.siteVisits)) {
          for (const visitDateStr of extractedInfo.siteVisits) {
            let ts = Date.now() + 86400000;
            try {
              const p = new Date(visitDateStr).getTime();
              if (!isNaN(p)) ts = p;
            } catch(e) {}
            createVisit({ leadId: lead.id, leadName: lead.name, scheduledAt: ts, status: 'Upcoming' }).catch(() => {});
          }
        }

      } catch (err) {
        console.error(`Error processing message from ${rawPhone}:`, err);
      }
    }
  });
}

startWhatsAppGateway().catch((err) => console.error('Fatal WhatsApp Gateway Error:', err));
