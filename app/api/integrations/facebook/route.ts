import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createLead, getLeadByPhone } from '@/lib/firestore/leads';
import { sendFirstMessage } from '@/lib/firstMessage';
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
    const signature = request.headers.get('x-hub-signature-256');
    const secret = process.env.FACEBOOK_APP_SECRET;

    if (!secret || !signature) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    const rawBody = await request.text();
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

    const sigBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);

    if (sigBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(sigBuffer, digestBuffer)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const body = JSON.parse(rawBody);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const leadData = value?.lead_data || value; 
    
    const phone = leadData?.phone || leadData?.phone_number || '';
    const name = leadData?.name || leadData?.full_name || 'Facebook Lead';
    const email = leadData?.email || '';

    if (phone) {
      const existing = await getLeadByPhone(phone);
      if (!existing) {
        const lead = await createLead({
          name,
          phone,
          email,
          source: 'facebook_ads',
          consentStatus: 'opted_in',
        });

        const agentProfile = await getAgentProfile();

        // Fire and forget
        sendFirstMessage(lead, agentProfile).catch(console.error);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Facebook Webhook Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
