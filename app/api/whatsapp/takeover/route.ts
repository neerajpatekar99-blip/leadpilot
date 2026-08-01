import { NextResponse } from 'next/server';
import { updateLead, saveMessage } from '@/lib/firestore/leads';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const { leadId, phone, message } = await request.json();

    if (!leadId || !phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await updateLead(leadId, {
      aiStatus: 'agent_took_over',
    });

    await saveMessage(leadId, {
      leadId,
      role: 'agent',
      content: message,
      timestamp: Date.now(),
    });

    const success = await sendWhatsAppMessage(phone, message);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 });
    }
  } catch (error) {
    console.error('Takeover Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
