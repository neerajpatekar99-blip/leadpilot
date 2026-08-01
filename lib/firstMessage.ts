import Groq from 'groq-sdk';
import { Lead, AgentProfile } from './types';
import { sendWhatsAppMessage } from './whatsapp';
import { saveMessage, updateLead } from './firestore/leads';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export async function sendFirstMessage(lead: Lead, agentProfile: AgentProfile): Promise<{ success: boolean; reason?: string }> {
  if (lead.consentStatus !== 'opted_in') {
    return { success: false, reason: 'No consent provided' };
  }

  const systemPrompt = `You are a real estate assistant working for ${agentProfile.name} at ${agentProfile.agencyName} in India.
Your goal is to write a warm, short opening WhatsApp message to a new lead named ${lead.name || 'there'}.

RULES:
1. Write in Hinglish (a natural mix of Hindi and English).
2. Keep it under 2 sentences.
3. Be friendly and polite, not salesy.
4. Ask a simple open-ended question about what kind of property they are looking for (e.g., budget or locality).
5. Do not use more than one emoji.
6. Do not include any tags, just the message text itself.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.3-70b-versatile',
    });

    const aiMessage = chatCompletion.choices[0]?.message?.content?.trim();

    if (!aiMessage) {
      throw new Error('Failed to generate AI message');
    }

    const success = await sendWhatsAppMessage(lead.phone, aiMessage);

    if (success) {
      await saveMessage(lead.id, {
        leadId: lead.id,
        role: 'ai',
        content: aiMessage,
        timestamp: Date.now(),
      });

      await updateLead(lead.id, {
        status: 'contacted',
        lastContactedAt: Date.now(),
      });

      return { success: true };
    } else {
      return { success: false, reason: 'WhatsApp API failed' };
    }
  } catch (error) {
    console.error('Error generating/sending first message:', error);
    return { success: false, reason: 'Internal error' };
  }
}
