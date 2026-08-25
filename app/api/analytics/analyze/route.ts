import { NextResponse } from 'next/server';
import { getLeadById, getConversation, updateLead } from '@/lib/firestore/leads';
import { getAgentProfile } from '@/lib/firestore/agent';
import { generateLeadIntelligence } from '@/lib/groq';
import { createTask } from '@/lib/firestore/tasks';
import { createVisit } from '@/lib/firestore/visits';

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
    const agentProfile = await getAgentProfile();
    
    // Call Groq to summarize and score the lead based on conversation
    const intelligence = await generateLeadIntelligence(lead, conversation, agentProfile?.name);

    // Update the lead in Firestore
    await updateLead(leadId, {
      aiSummary: intelligence.aiSummary || '',
      leadScore: intelligence.leadScore || 'Unscored',
      budget: intelligence.budget || undefined,
      locality: intelligence.locality || undefined,
      propertyType: intelligence.propertyType || undefined,
    });

    // Create action items if found
    if (intelligence.actionItems && Array.isArray(intelligence.actionItems)) {
      for (const taskText of intelligence.actionItems) {
        await createTask({
          leadId: lead.id,
          leadName: lead.name,
          task: taskText,
          status: 'Pending'
        });
      }
    }

    // Create site visits if found
    if (intelligence.siteVisits && Array.isArray(intelligence.siteVisits)) {
      for (const visitDateStr of intelligence.siteVisits) {
        let timestamp = Date.now() + 86400000; // default to tomorrow
        try {
          const parsed = new Date(visitDateStr).getTime();
          if (!isNaN(parsed)) timestamp = parsed;
        } catch(e) {}
        
        await createVisit({
          leadId: lead.id,
          leadName: lead.name,
          scheduledAt: timestamp,
          status: 'Upcoming'
        });
      }
    }

    return NextResponse.json({ success: true, intelligence });
  } catch (error: unknown) {
    console.error('Error analyzing lead:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
