import Groq from 'groq-sdk';
import { Lead, Message, AgentProfile } from './types';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

export async function generateAIResponse(
  lead: Lead, 
  conversationHistory: Message[], 
  newMessage: string, 
  agentProfile: AgentProfile
) {
  const systemPrompt = `You are a real estate assistant working for ${agentProfile.name} at ${agentProfile.agencyName} in India.

SCOPE RULES:
1. ONLY discuss real estate topics: properties, pricing, localities, site visits, buying/selling/renting process, and related questions.
2. If asked about anything unrelated to real estate, politely redirect: "I am here to help with your property search, let us focus on finding you the right home!"
3. Never answer off-topic questions even if asked repeatedly.

QUALIFICATION:
4. Warmly greet and qualify leads: understand budget, locality, property type, timeline.
5. When the lead shows strong buying intent (clear budget mentioned, wants a site visit, price negotiation), you need to flag that an agent is needed.

TONE (sound human, not robotic):
6. Write like a busy, friendly real estate agent texting on their phone, not a formal bot.
7. Use natural contractions and casual acknowledgements (Sure thing, Got it, Let me check).
8. Vary sentence length, keep responses to 2-3 sentences max.
9. Use at most one emoji per message, only when natural.
10. Respond in the same language/style the lead uses (Hindi, English, or Hinglish).

HONESTY:
11. If directly and sincerely asked whether you are an AI or a bot, say: "I am an AI assistant helping ${agentProfile.name} respond quickly, happy to connect you with them directly anytime!" Do not deny being AI.
12. Never make up property details you do not actually know.

OUTPUT FORMAT:
You must output a JSON object containing the following keys:
- "message": Your response to the lead (string)
- "needsAgent": boolean (true if the lead shows strong buying intent, otherwise false)
- "budget": Extracted budget if mentioned in the conversation, otherwise null
- "locality": Extracted locality if mentioned, otherwise null
- "propertyType": Extracted property type if mentioned, otherwise null
- "timeline": Extracted timeline if mentioned, otherwise null
- "aiSummary": A 1-2 sentence summary of exactly what the lead wants (budget, locality, type).
- "leadScore": Must be exactly one of: "Hot", "Warm", "Cold", or "Unscored". (Hot = ready to buy/visit, Warm = responsive/exploring, Cold = unresponsive).
- "actionItems": Array of strings of tasks for the agent (e.g. ["Call tomorrow", "Send brochure"]). Empty array if none.
- "siteVisits": Array of ISO timestamps if the lead requested a site visit. Empty array if none.
`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.content,
    })),
    { role: 'user', content: newMessage }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);

    return {
      message: parsed.message || "Sorry, I'm having trouble connecting right now.",
      needsAgent: parsed.needsAgent || false,
      extractedInfo: {
        budget: parsed.budget || null,
        locality: parsed.locality || null,
        propertyType: parsed.propertyType || null,
        timeline: parsed.timeline || null,
        aiSummary: parsed.aiSummary || null,
        leadScore: parsed.leadScore || 'Unscored',
        actionItems: parsed.actionItems || [],
        siteVisits: parsed.siteVisits || [],
      }
    };
  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      message: "Sorry, I'm having trouble connecting right now.",
      needsAgent: false,
      extractedInfo: {}
    };
  }
}

export async function generateLeadIntelligence(lead: Lead, conversationHistory: Message[]) {
  const systemPrompt = `You are an expert real estate CRM intelligence agent.
Your job is to analyze the entire conversation history with a lead and extract a structured profile.

OUTPUT FORMAT:
You must output a JSON object containing:
- "aiSummary": A 1-2 sentence summary of exactly what the lead is looking for and their current intent.
- "leadScore": Must be exactly one of: "Hot", "Warm", "Cold", or "Unscored". (Hot = ready to buy/visit, Warm = exploring/responsive, Cold = unresponsive/just browsing).
- "budget": Extracted budget (e.g., "1.5Cr - 2Cr") or null.
- "locality": Extracted location preference or null.
- "propertyType": Extracted property type (e.g., "3BHK Apartment") or null.
- "actionItems": An array of strings representing explicit tasks the agent needs to do for this lead based on the conversation (e.g. ["Call the lead tomorrow", "Send floor plans"]). Return an empty array if none.
- "siteVisits": An array of ISO timestamp strings (or readable date strings if ISO is impossible) if the lead requested a site visit. Empty array if none.
`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: \`Lead Name: \${lead.name}\nConversation History:\n\${conversationHistory.map(m => m.role + ': ' + m.content).join('\\n')}\` }
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    return JSON.parse(responseContent);
  } catch (error) {
    console.error('Groq Analysis Error:', error);
    return { aiSummary: '', leadScore: 'Unscored', budget: null, locality: null, propertyType: null, actionItems: [], siteVisits: [] };
  }
}

export async function matchPropertyWithLeads(propertyDescription: string, leads: Lead[]) {
  const systemPrompt = `You are a smart real estate property matcher.
You will be given a New Property Description and a list of Leads with their known requirements.
Your job is to determine which leads are a good match for this property.

OUTPUT FORMAT:
You must output a JSON object containing a single key "matchedLeadIds" which is an array of strings (the Lead IDs that match).
Only include leads whose budget, locality, and propertyType (if known) align reasonably well with the property.
`;

  const leadsContext = leads.map(l => 
    \`[ID: \${l.id}] Name: \${l.name}, Score: \${l.leadScore}, Summary: \${l.aiSummary}, Budget: \${l.budget}, Locality: \${l.locality}, Type: \${l.propertyType}\`
  ).join('\\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: \`NEW PROPERTY:\n\${propertyDescription}\n\nLEADS DATABASE:\n\${leadsContext}\`}
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);
    return parsed.matchedLeadIds || [];
  } catch (error) {
    console.error('Groq Matcher Error:', error);
    return [];
  }
}
