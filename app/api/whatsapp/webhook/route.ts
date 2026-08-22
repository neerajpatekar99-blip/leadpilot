import { NextResponse } from 'next/server';
import { getLeadByPhone, createLead, saveMessage } from '@/lib/firestore/leads';
import { getAgentProfile } from '@/lib/firestore/agent';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object' }, { status: 404 });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      const message = messages[0];
      const phone = message.from; // WhatsApp returns number with country code
      const text = message.text?.body;

      if (text) {
        let lead = await getLeadByPhone(phone);
        
        if (!lead) {
          const contact = value.contacts?.[0];
          const name = contact?.profile?.name || phone;
          
          lead = await createLead({
            name,
            phone,
            source: 'whatsapp_inbound',
            consentStatus: 'opted_in',
          });
        }

        // Fetch Agent Profile to check Master AI Killswitch
        const agentProfile = await getAgentProfile();
        const isAiPausedGlobally = agentProfile.aiEnabled === false;

        if (isAiPausedGlobally || lead.aiStatus === 'agent_took_over') {
          // Master AI is Stopped or Agent Took Over: Record message only, do NOT auto-reply
          await saveMessage(lead.id, {
            leadId: lead.id,
            role: 'lead',
            content: text,
            timestamp: Date.now(),
          });
        } else {
          // Forward to our chat API internally
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          
          // Use absolute URL to call our own API
          await fetch(`${baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: lead.id, message: text }),
          });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
