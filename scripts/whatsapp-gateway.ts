import fs from 'fs';
import http from 'http';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import * as dotenv from 'dotenv';
import * as path from 'path';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import { getLeadByPhone, createLead, saveMessage, getConversation, updateLead } from '../lib/firestore/leads';
import { generateAIResponse } from '../lib/groq';
import { getAgentProfile, isNumberExcluded } from '../lib/firestore/agent';
import { findMatchingProperties } from '../lib/firestore/properties';
import { createTask } from '../lib/firestore/tasks';
import { createVisit } from '../lib/firestore/visits';
import { AgentProfile, Message, Lead } from '../lib/types';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { adminDb, isFirebaseConfigured } from '../lib/firebase-admin';

const AUTH_DIR = path.resolve(__dirname, '../whatsapp_auth_info');

async function writeStatus(statusData: any) {
  try {
    const payload = { ...statusData, updatedAt: Date.now() };
    const statusFile = path.resolve(AUTH_DIR, 'status.json');
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(statusFile, JSON.stringify(payload, null, 2));

    if (isFirebaseConfigured() && adminDb) {
      await adminDb.collection('system').doc('whatsapp_session').set(payload, { merge: true });
    }
  } catch (err) {
    console.warn('[Session Sync Warning]:', (err as any)?.message || err);
  }
}

// Health check server only if running purely standalone and port is specified
const isStandalone = process.env.STANDALONE_GATEWAY === 'true';
if (isStandalone) {
  const GATEWAY_PORT = process.env.GATEWAY_PORT || 3008;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('LeadPilot WhatsApp Gateway is Live 24/7!\n');
  });
  server.on('error', (err: any) => {
    console.warn(`[HTTP Server Notice] Port ${GATEWAY_PORT} occupied (${err.code}), running socket in background.`);
  });
  try {
    server.listen(GATEWAY_PORT, () => {
      console.log(`🌐 Healthcheck HTTP server listening on port ${GATEWAY_PORT}`);
    });
  } catch {}
}

const TARGET_PHONE = process.env.WHATSAPP_LINK_PHONE || '';


// In-Memory High Speed Caches (0ms retrieval)
const recentMessagesCache = new Map<string, Message[]>();
const leadsCache = new Map<string, Lead>();
let cachedAgentProfile: AgentProfile = {
  id: 'default_agent',
  name: 'Real Estate Advisor',
  agencyName: 'Prime Property Solutions',
  phone: '+919876543210',
  specializations: ['Residential 1BHK/2BHK/3BHK', 'Commercial', 'Plots'],
  activeLocalities: ['City Center', 'Metro Corridor', 'Suburbs'],
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

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    connectTimeoutMs: 300000, // 5 minutes connection timeout
    keepAliveIntervalMs: 10000, // 10 seconds keepalive heartbeat to prevent 408 timeouts
    defaultQueryTimeoutMs: 300000,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      return undefined;
    },
  });

  sock.ev.on('creds.update', saveCreds);

  let latestPairingCode = '';
  // If not already registered, generate a Pairing Code with retry loop
  let pairingCodeRequested = false;
  const requestPairing = async (retryCount = 0) => {
    if (pairingCodeRequested || sock.authState.creds.registered) return;
    try {
      const cleanPhone = TARGET_PHONE.replace(/[^0-9]/g, '');
      console.log(`\n⏳ Requesting live WhatsApp Pairing Code for +${cleanPhone}...`);
      const pairingCode = await sock.requestPairingCode(cleanPhone);
      pairingCodeRequested = true;
      latestPairingCode = pairingCode;
      
      writeStatus({ status: 'pairing_ready', pairingCode, phone: cleanPhone });

      console.log('\n======================================================');
      console.log(`🔑 LIVE WHATSAPP PAIRING CODE:  ${pairingCode}`);
      console.log('📱 Or open your Render URL: /qr to scan or view code live!');
      console.log('⏰ Valid for 3-5 minutes. Enter this code on your phone.');
      console.log('======================================================\n');
    } catch (err: any) {
      if (retryCount < 5 && !sock.authState.creds.registered) {
        console.log(`⏳ Socket initializing, retrying pairing code in 5s (attempt ${retryCount + 1}/5)...`);
        setTimeout(() => requestPairing(retryCount + 1), 5000);
      } else {
        console.error('Error requesting pairing code:', err?.message || err);
      }
    }
  };

  const usePairingCodeOnly = process.env.USE_PAIRING_CODE === 'true';
  if (!sock.authState.creds.registered && TARGET_PHONE && usePairingCodeOnly) {
    setTimeout(() => requestPairing(), 3000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📷 LIVE QR CODE GENERATED & SYNCED TO DASHBOARD! 🚀');
      try {
        qrcodeTerminal.generate(qr, { small: true });
      } catch (e) {}
      
      await writeStatus({ 
        status: 'qr_ready', 
        qr, 
        pairingCode: latestPairingCode,
        updatedAt: Date.now() 
      });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`Connection closed (status ${statusCode}), loggedOut: ${isLoggedOut}`);
      await writeStatus({ status: 'closed', statusCode, isLoggedOut });
      
      if (isLoggedOut || statusCode === 401) {
        console.log('🧹 Clearing stale session keys to generate fresh clean pairing code...');
        try {
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
        } catch (e) {}
      }

      console.log('🔄 Reconnecting in 10 seconds...');
      setTimeout(() => startWhatsAppGateway(), 10000);
    } else if (connection === 'open') {
      await writeStatus({ status: 'open', message: 'WhatsApp Connected Live' });
      console.log('\n======================================================');
      console.log('✅ WHATSAPP CONNECTED & LIVE! Gateway is linked! 🚀');
      console.log('======================================================\n');
    }
  });

  // In-Memory address book cache to track all saved phone contacts
  const phonebookContacts = new Set<string>();

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      if (c.id) {
        const clean = c.id.replace(/[^0-9]/g, '').slice(-10);
        if (clean) phonebookContacts.add(clean);
      }
    }
    if (phonebookContacts.size > 0) {
      console.log(`📱 Synced ${phonebookContacts.size} saved phone contacts from address book (Excluded from AI auto-reply).`);
    }
  });

  sock.ev.on('contacts.update', (contacts) => {
    for (const c of contacts) {
      if (c.id) {
        const clean = c.id.replace(/[^0-9]/g, '').slice(-10);
        if (clean) phonebookContacts.add(clean);
      }
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

      // 1. Check if number is in saved phone address book or explicitly excluded
      const clean10 = rawPhone.replace(/[^0-9]/g, '').slice(-10);
      const isSavedPhonebook = Boolean(clean10 && phonebookContacts.has(clean10));
      const isExplicitlyExcluded = isNumberExcluded(rawPhone, cachedAgentProfile, null);

      if (isSavedPhonebook || isExplicitlyExcluded) {
        console.log(`🔇 SAVED CONTACT (+${rawPhone} / ${pushName}). Recorded in history but AI auto-reply skipped.`);
        continue;
      }

      // Mark message as read (blue tick)
      sock.readMessages([msg.key]).catch(() => {});

      // Send "Typing..." presence immediately for natural feel
      sock.sendPresenceUpdate('composing', remoteJid).catch(() => {});

      const startTime = Date.now();

      try {
        // 2. Fast In-Memory Lead retrieval
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

        // Save incoming lead message to conversation history
        const leadMsg: Message = { id: `m-${Date.now()}-1`, leadId: lead.id, role: 'lead', content: messageText, timestamp: Date.now() };
        saveMessage(lead.id, leadMsg).catch(() => {});

        // 3. Check Master AI Killswitch and Individual Lead Takeover
        if (cachedAgentProfile.aiEnabled === false) {
          console.log(`🛑 Master AI Killswitch is active (Manual Mode). Recorded message from ${pushName} but skipped auto-reply.`);
          sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
          continue;
        }

        if (lead.doNotReply === true || lead.aiStatus === 'agent_took_over') {
          console.log(`👤 Manual Agent Takeover active for (+${rawPhone}). Skipped AI auto-reply.`);
          sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
          continue;
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

        // Send AI Reply over WhatsApp Socket with automatic fallback
        let sendSuccess = false;
        try {
          await sock.sendMessage(targetJid, { text: aiResponse });
          sendSuccess = true;
        } catch (sendErr) {
          console.warn(`Direct send to ${targetJid} failed, trying alternative target ${remoteJid}...`);
          try {
            await sock.sendMessage(remoteJid, { text: aiResponse });
            sendSuccess = true;
          } catch (fallbackErr) {
            console.error(`❌ Error sending message to ${remoteJid}:`, (fallbackErr as any)?.message || fallbackErr);
          }
        }
        sock.sendPresenceUpdate('paused', remoteJid).catch(() => {});
        
        const duration = Date.now() - startTime;
        if (sendSuccess) {
          console.log(`⚡ Sent AI reply to ${pushName} (${targetJid}) in ${duration}ms: "${aiResponse}"`);
        }

        // 6. Update in-memory message history
        const aiMsg: Message = { id: `m-${Date.now()}-2`, leadId: lead.id, role: 'ai', content: aiResponse, timestamp: Date.now() };
        history.push(leadMsg, aiMsg);
        if (history.length > 10) history = history.slice(-10);
        recentMessagesCache.set(rawPhone, history);

        // 7. Non-blocking background Firestore sync
        setTimeout(async () => {
          try {
            saveMessage(lead.id, aiMsg).catch(() => {});

            const updates: any = {};
            let shouldUpdate = false;
            if (needsAgent && lead.aiStatus !== 'needs_agent') {
              updates.aiStatus = 'needs_agent';
              updates.status = 'qualified';
              lead.aiStatus = 'needs_agent';
              shouldUpdate = true;
            }
            if (extractedInfo.intent && lead.intent !== extractedInfo.intent) { updates.intent = extractedInfo.intent; lead.intent = extractedInfo.intent; shouldUpdate = true; }
            if (extractedInfo.budget && lead.budget !== extractedInfo.budget) { updates.budget = extractedInfo.budget; lead.budget = extractedInfo.budget; shouldUpdate = true; }
            if (extractedInfo.locality && lead.locality !== extractedInfo.locality) { updates.locality = extractedInfo.locality; lead.locality = extractedInfo.locality; shouldUpdate = true; }
            if (extractedInfo.propertyType && lead.propertyType !== extractedInfo.propertyType) { updates.propertyType = extractedInfo.propertyType; lead.propertyType = extractedInfo.propertyType; shouldUpdate = true; }
            if (extractedInfo.configuration && lead.configuration !== extractedInfo.configuration) { updates.configuration = extractedInfo.configuration; lead.configuration = extractedInfo.configuration; shouldUpdate = true; }
            if (extractedInfo.specs && lead.specs !== extractedInfo.specs) { updates.specs = extractedInfo.specs; lead.specs = extractedInfo.specs; shouldUpdate = true; }
            if (extractedInfo.loanStatus && lead.loanStatus !== extractedInfo.loanStatus) { updates.loanStatus = extractedInfo.loanStatus; lead.loanStatus = extractedInfo.loanStatus; shouldUpdate = true; }
            if (extractedInfo.timeline && lead.timeline !== extractedInfo.timeline) { updates.timeline = extractedInfo.timeline; lead.timeline = extractedInfo.timeline; shouldUpdate = true; }
            if (extractedInfo.isDecisionMaker && lead.isDecisionMaker !== extractedInfo.isDecisionMaker) { updates.isDecisionMaker = extractedInfo.isDecisionMaker; lead.isDecisionMaker = extractedInfo.isDecisionMaker; shouldUpdate = true; }
            if (extractedInfo.hasOtherBroker && lead.hasOtherBroker !== extractedInfo.hasOtherBroker) { updates.hasOtherBroker = extractedInfo.hasOtherBroker; lead.hasOtherBroker = extractedInfo.hasOtherBroker; shouldUpdate = true; }
            if (extractedInfo.aiSummary && extractedInfo.aiSummary !== lead.aiSummary) { updates.aiSummary = extractedInfo.aiSummary; lead.aiSummary = extractedInfo.aiSummary; shouldUpdate = true; }
            if (extractedInfo.leadScore && extractedInfo.leadScore !== lead.leadScore) { updates.leadScore = extractedInfo.leadScore; lead.leadScore = extractedInfo.leadScore; shouldUpdate = true; }

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
        try {
          await sock.sendMessage(remoteJid, { 
            text: "Got it! Which locality and budget range are you looking at so I can share the best available options?" 
          });
        } catch(e) {}
      }
    }
  });
}

startWhatsAppGateway().catch((err) => console.error('Fatal WhatsApp Gateway Error:', err));

