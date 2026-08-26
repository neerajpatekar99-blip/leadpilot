import Groq from 'groq-sdk';
import { Lead, AgentProfile } from './types';
import { sendWhatsAppMessage } from './whatsapp';
import { saveMessage, updateLead } from './firestore/leads';

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim() || '';
  return new Groq({ apiKey });
}

export async function sendFirstMessage(lead: Lead, agentProfile: AgentProfile): Promise<{ success: boolean; reason?: string }> {
  if (lead.consentStatus !== 'opted_in') {
    return { success: false, reason: 'No consent provided' };
  }

  const agentName = agentProfile.name || 'Sales Advisor';
  const agencyName = agentProfile.agencyName || 'Real Estate Advisors';

  const systemPrompt = `You are a professional real estate assistant working for ${agentName} at ${agencyName} in India.
Your goal is to write a warm, single-line opening WhatsApp greeting in friendly HINGLISH to a new lead named ${lead.name || 'there'}.

RULES:
1. ALWAYS speak in warm, professional HINGLISH (Hindi written in English alphabet).
2. Keep the reply strictly to ONE line.
3. Never use dashes (hyphens or em dashes). Use commas or full stops instead.
4. Ask a single question about what locality/area or BHK configuration they are looking for.
5. At most one emoji.
6. Do not include any tags, just the single-line message text itself.

EXAMPLE:
"Hi ${lead.name || ''} ji, ${agencyName} se baat kar raha hoon. Aap kaunse area me property search kar rahe hain?"`;

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }],
        model: 'openai/gpt-oss-20b',
      });
    } catch {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }],
        model: 'qwen/qwen3.6-27b',
      });
    }

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
