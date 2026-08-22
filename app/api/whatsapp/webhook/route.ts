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

    let phone: string | null = null;
    let text: string | null = null;
    let senderName: string = 'Inbound Lead';

    // 1. Check Standard Meta Cloud API payload
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        phone = message.from;
        text = message.text?.body;
        const contact = value.contacts?.[0];
        senderName = contact?.profile?.name || phone;
      }
    } 
    // 2. Check AiSensy / BSP payload format
    else if (body.from || body.phone || body.data?.from || body.message || body.data?.message) {
      phone = body.from || body.phone || body.data?.from || body.data?.phone;
      text = typeof body.message === 'string' ? body.message : (body.message?.text || body.data?.message || body.data?.text);
      senderName = body.name || body.data?.name || body.userName || phone;
    }

    if (phone && text) {
      let lead = await getLeadByPhone(phone);
      
      if (!lead) {
        lead = await createLead({
          name: senderName,
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
        
        await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, message: text }),
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
