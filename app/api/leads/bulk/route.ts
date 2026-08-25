import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { saveMessage, getLeadById } from '@/lib/firestore/leads';

export async function POST(req: Request) {
  try {
    const { leadIds, message } = await req.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !message) {
      return NextResponse.json({ success: false, error: 'Missing leadIds or message' }, { status: 400 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const leadId of leadIds) {
      try {
        const lead = await getLeadById(leadId);
        if (lead && lead.phone && lead.consentStatus === 'opted_in') {
          // Replace personalization tokens across all occurrences
          const personalizedMessage = message
            .replaceAll('{name}', lead.name || 'there')
            .replaceAll('{locality}', lead.locality || '')
            .replaceAll('{budget}', lead.budget || '')
            .replaceAll('{propertyType}', lead.propertyType || lead.configuration || '');
          
          await sendWhatsAppMessage(lead.phone, personalizedMessage);
          
          // Save to conversation history
          await saveMessage(leadId, {
            leadId,
            role: 'agent',
            content: personalizedMessage,
            timestamp: Date.now()
          });
          
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(`Failed to send to ${leadId}:`, err);
        failCount++;
      }
    }

    return NextResponse.json({ success: true, successCount, failCount });
  } catch (error: unknown) {
    console.error('Error in bulk messaging:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
