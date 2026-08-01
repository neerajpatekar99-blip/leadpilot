import { NextResponse } from 'next/server';
import { getLeadById, saveMessage, getConversation, updateLead } from '@/lib/firestore/leads';
import { generateAIResponse } from '@/lib/groq';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

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
      return NextResponse.json({ error: 'agent handling' }, { status: 400 });
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

    // Hardcode an AgentProfile for testing
    const agentProfile = {
      id: 'agent1',
      name: 'Rahul',
      agencyName: 'LeadPilot Realty',
      phone: '',
      specializations: [],
      activeLocalities: []
    };

    // Generate AI response
    const { message: aiResponse, needsAgent, extractedInfo } = await generateAIResponse(
      lead, 
      history, 
      message, 
      agentProfile
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    return NextResponse.json({ response: aiResponse, needsAgent });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
