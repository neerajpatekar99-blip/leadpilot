import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as dotenv from 'dotenv';
import * as path from 'path';
import QRCode from 'qrcode';
import { getLeadByPhone, createLead, saveMessage, getConversation, updateLead } from '../lib/firestore/leads';
import { generateAIResponse } from '../lib/groq';
import { getAgentProfile } from '../lib/firestore/agent';
import { findMatchingProperties } from '../lib/firestore/properties';
import { createTask } from '../lib/firestore/tasks';
import { createVisit } from '../lib/firestore/visits';
import { AgentProfile, Message, Lead } from '../lib/types';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const TARGET_PHONE = process.env.WHATSAPP_LINK_PHONE || '919870178204'; // Sachin Sir's number
const AUTH_DIR = path.resolve(__dirname, '../whatsapp_auth_info');

// In-Memory High Speed Caches (0ms retrieval)
const recentMessagesCache = new Map<string, Message[]>();
const leadsCache = new Map<string, Lead>();
let cachedAgentProfile: AgentProfile = {
  id: 'default_agent',
  name: 'Sachin Bhoir',
  agencyName: 'One Stop Property Solutions',
  phone: '+919876543210',
  specializations: ['Residential 1BHK/2BHK/3BHK', 'Commercial', 'Plots'],
  activeLocalities: ['Kharghar', 'Navi Mumbai', 'Panvel', 'Thane'],
  tone: 'friendly',
  languagePreference: 'hinglish',
  customInstructions: '1. Only discuss real estate: properties, pricing, localities, site visits, buying, selling, renting.\n2. Keep responses to ONE line without dashes.\n3. Escalate only for confirmed site visit booking or token payments.',
  aiEnabled: true,
  updatedAt: Date.now(),
};

// Periodic background profile refresher
async function refreshProfileCache() {
  try {
    const p = await getAgentProfile();
    if (p) cachedAgentProfile = p;
  } catch {}
}
setInterval(refreshProfileCache, 30000);
refreshProfileCache();

async function startWhatsAppGateway() {
  console.log('\n======================================================');
  console.log('⚡ LEADPILOT AI - ULTRA HIGH SPEED WHATSAPP GATEWAY');
  console.log('======================================================\n');

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['LeadPilot CRM', 'Chrome', '120.0.0'],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    defaultQueryTimeoutMs: 60000,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      return undefined;
    },
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
    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

      // Extract message text across all WhatsApp message wrappers
      const m = msg.message;
      const messageText = (
        m.conversation ||
        m.extendedTextMessage?.text ||
        m.ephemeralMessage?.message?.extendedTextMessage?.text ||
        m.ephemeralMessage?.message?.conversation ||
        m.viewOnceMessage?.message?.extendedTextMessage?.text ||
        m.viewOnceMessage?.message?.conversation ||
        m.viewOnceMessageV2?.message?.extendedTextMessage?.text ||
        m.viewOnceMessageV2?.message?.conversation ||
        m.imageMessage?.caption ||
        m.videoMessage?.caption ||
        ''
      ).trim();

      if (!messageText) continue;

      // Only ignore outgoing messages if they are not to ourselves for testing
      if (msg.key.fromMe) continue;

      const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      const pushName = msg.pushName || 'Buyer';

      console.log(`\n📩 Inbound WhatsApp from ${pushName} (+${rawPhone}): "${messageText}"`);

      // 1. Send "Typing..." presence immediately for natural feel
      sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

      const startTime = Date.now();

      try {
        // 2. Check Master AI Killswitch in memory
        if (cachedAgentProfile.aiEnabled === false) {
          console.log('🛑 Master AI Killswitch is active. Skipping auto-reply.');
          sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
          continue;
        }

        // 3. Fast In-Memory Lead & History retrieval (0ms)
        let lead = leadsCache.get(rawPhone);
        if (!lead) {
          lead = {
            id: `lead-${Date.now()}`,
            name: pushName,
            phone: `+${rawPhone}`,
            source: 'whatsapp_inbound',
            status: 'new',
            aiStatus: 'ai_handling',
            consentStatus: 'opted_in',
            createdAt: Date.now(),
          };
          leadsCache.set(rawPhone, lead);
          createLead(lead).then(created => {
            if (created) leadsCache.set(rawPhone, created);
          }).catch(() => {});
        }

        let history = recentMessagesCache.get(rawPhone) || [];

        // 4. Generate AI Response via Groq (Llama 3.1 8B Instant - ~200ms)
        const { message: aiResponse, needsAgent, extractedInfo } = await generateAIResponse(
          lead,
          history,
          messageText,
          cachedAgentProfile,
          []
        );

        // 5. Determine target JID (resolve LID to phone number if available)
        const participantJid = msg.key.participant;
        let targetJid = remoteJid;
        if (remoteJid.endsWith('@lid') && participantJid && participantJid.endsWith('@s.whatsapp.net')) {
          targetJid = participantJid;
        }

        // Send AI Reply over WhatsApp Socket
        try {
          await sock.sendMessage(targetJid, { text: aiResponse });
        } catch (sendErr) {
          console.warn(`Direct send to ${targetJid} failed, trying alternative target...`);
          if (targetJid !== remoteJid) {
            await sock.sendMessage(remoteJid, { text: aiResponse });
          } else {
            throw sendErr;
          }
        }
        sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
        
        const duration = Date.now() - startTime;
        console.log(`⚡ Sent AI reply to ${pushName} (${targetJid}) in ${duration}ms: "${aiResponse}"`);

        // 6. Update in-memory message history
        const leadMsg: Message = { id: `m-${Date.now()}-1`, leadId: lead.id, role: 'lead', content: messageText, timestamp: Date.now() };
        const aiMsg: Message = { id: `m-${Date.now()}-2`, leadId: lead.id, role: 'ai', content: aiResponse, timestamp: Date.now() };
        history.push(leadMsg, aiMsg);
        if (history.length > 10) history = history.slice(-10);
        recentMessagesCache.set(rawPhone, history);

        // 7. Non-blocking background Firestore sync
        setTimeout(async () => {
          try {
            saveMessage(lead.id, leadMsg).catch(() => {});
            saveMessage(lead.id, aiMsg).catch(() => {});

            const updates: any = {};
            let shouldUpdate = false;
            if (needsAgent && lead.aiStatus !== 'needs_agent') {
              updates.aiStatus = 'needs_agent';
              updates.status = 'qualified';
              lead.aiStatus = 'needs_agent';
              shouldUpdate = true;
            }
            if (extractedInfo.budget && !lead.budget) { updates.budget = extractedInfo.budget; lead.budget = extractedInfo.budget; shouldUpdate = true; }
            if (extractedInfo.locality && !lead.locality) { updates.locality = extractedInfo.locality; lead.locality = extractedInfo.locality; shouldUpdate = true; }
            if (extractedInfo.propertyType && !lead.propertyType) { updates.propertyType = extractedInfo.propertyType; lead.propertyType = extractedInfo.propertyType; shouldUpdate = true; }
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
          } catch (e) {}
        }, 10);

      } catch (err) {
        console.error(`Error processing message from ${rawPhone}:`, err);
      }
    }
  });
}

startWhatsAppGateway().catch((err) => console.error('Fatal WhatsApp Gateway Error:', err));
