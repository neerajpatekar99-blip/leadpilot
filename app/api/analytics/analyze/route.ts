import { NextResponse } from 'next/server';
import { getLeadById, getConversation, updateLead } from '@/lib/firestore/leads';
import { generateLeadIntelligence } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 });
    }

    const lead = await getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const conversation = await getConversation(leadId);
    
    // Call Groq to summarize and score the lead based on conversation
    const intelligence = await generateLeadIntelligence(lead, conversation);

    // Update the lead in Firestore
    await updateLead(leadId, {
      aiSummary: intelligence.aiSummary || '',
      leadScore: intelligence.leadScore || 'Unscored',
      budget: intelligence.budget || undefined,
      locality: intelligence.locality || undefined,
      propertyType: intelligence.propertyType || undefined,
    });

    return NextResponse.json({ success: true, intelligence });
  } catch (error: unknown) {
    console.error('Error analyzing lead:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
