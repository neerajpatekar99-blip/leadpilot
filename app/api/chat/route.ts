import { NextResponse } from 'next/server';
import { getLeadById, saveMessage, getConversation, updateLead } from '@/lib/firestore/leads';
import { generateAIResponse } from '@/lib/groq';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { createTask } from '@/lib/firestore/tasks';
import { createVisit } from '@/lib/firestore/visits';
import { findMatchingProperties } from '@/lib/firestore/properties';
import { getAgentProfile } from '@/lib/firestore/agent';

export async function POST(request: Request) {
  try {
    const { leadId, message } = await request.json();
    
    if (!leadId || !message) {
      return NextResponse.json({ error: 'Missing leadId or message' }, { status: 400 });
    }

    const lead = await getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.aiStatus === 'agent_took_over') {
      return NextResponse.json({ error: 'agent handling', stopped: true }, { status: 400 });
    }

    // Fetch dynamic agent profile & check Master AI Killswitch
    const agentProfile = await getAgentProfile();
    if (agentProfile.aiEnabled === false) {
      return NextResponse.json({ 
        error: 'AI operations are currently stopped by agent in manual mode.', 
        stopped: true 
      }, { status: 403 });
    }

    // Fetch conversation history BEFORE adding the new message
    const history = await getConversation(leadId);

    // Save lead message
    await saveMessage(leadId, {
      leadId,
      role: 'lead',
      content: message,
      timestamp: Date.now(),
    });

    // Find matching properties if we have enough lead context
    let matchingProperties: any[] = [];
    if (lead.budget && (lead.locality || lead.propertyType)) {
      matchingProperties = await findMatchingProperties(
        lead.budget, 
        lead.locality || null, 
        lead.propertyType || null
      );
    }

    // Generate AI response
    const { message: aiResponse, needsAgent, extractedInfo } = await generateAIResponse(
      lead, 
      history, 
      message, 
      agentProfile,
      matchingProperties
    );

    // Save AI message
    await saveMessage(leadId, {
      leadId,
      role: 'ai',
      content: aiResponse,
      timestamp: Date.now(),
    });

    // Send WhatsApp (Only if opted in, though inbound webhooks usually imply opt-in)
    if (lead.consentStatus === 'opted_in') {
      await sendWhatsAppMessage(lead.phone, aiResponse);
    }

    // Update lead fields based on extraction or qualification
    const updates: any = {};
    let shouldUpdateLead = false;

    if (needsAgent && lead.aiStatus !== 'needs_agent') {
      updates.aiStatus = 'needs_agent';
      updates.status = 'qualified';
      shouldUpdateLead = true;
    }
    
    if (extractedInfo.budget && !lead.budget) { 
      updates.budget = extractedInfo.budget; 
      shouldUpdateLead = true; 
    }
    if (extractedInfo.locality && !lead.locality) { 
      updates.locality = extractedInfo.locality; 
      shouldUpdateLead = true; 
    }
    if (extractedInfo.propertyType && !lead.propertyType) { 
      updates.propertyType = extractedInfo.propertyType; 
      shouldUpdateLead = true; 
    }
    
    if (extractedInfo.timeline && !lead.notes?.includes('Timeline:')) {
      updates.notes = (lead.notes ? lead.notes + '\n' : '') + 'Timeline: ' + extractedInfo.timeline;
      shouldUpdateLead = true;
    }

    if (extractedInfo.aiSummary && extractedInfo.aiSummary !== lead.aiSummary) {
      updates.aiSummary = extractedInfo.aiSummary;
      shouldUpdateLead = true;
    }
    if (extractedInfo.leadScore && extractedInfo.leadScore !== lead.leadScore) {
      updates.leadScore = extractedInfo.leadScore;
      shouldUpdateLead = true;
    }

    if (shouldUpdateLead) {
      await updateLead(leadId, updates);
    }

    // Create action items if found
    if (extractedInfo.actionItems && Array.isArray(extractedInfo.actionItems)) {
      for (const taskText of extractedInfo.actionItems) {
        await createTask({
          leadId: lead.id,
          leadName: lead.name,
          task: taskText,
          status: 'Pending'
        });
      }
    }

    // Create site visits if found
    if (extractedInfo.siteVisits && Array.isArray(extractedInfo.siteVisits)) {
      for (const visitDateStr of extractedInfo.siteVisits) {
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
    
    let topMatchImages: string[] = [];
    if (matchingProperties.length > 0 && matchingProperties[0].imageUrls?.length > 0) {
      topMatchImages = matchingProperties[0].imageUrls;
    }

    return NextResponse.json({ 
      response: aiResponse, 
      needsAgent,
      topMatchImages: topMatchImages.length > 0 ? topMatchImages : undefined
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
