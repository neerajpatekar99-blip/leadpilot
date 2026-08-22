import Groq from 'groq-sdk';
import { Lead, Message, AgentProfile, Property } from './types';

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim() || '';
  return new Groq({ apiKey });
}

function parseJsonSafely(raw: string): any {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }
}

export async function generateAIResponse(
  lead: Lead, 
  conversationHistory: Message[], 
  newMessage: string, 
  agentProfile: AgentProfile,
  matchingProperties: Property[] = []
) {
  const agentName = agentProfile.name || 'Sachin Bhoir';
  const agencyName = agentProfile.agencyName || 'One Stop Property Solutions';

  const matchingText = matchingProperties.length > 0 
    ? `AVAILABLE MATCHING PROPERTIES:\n${matchingProperties.slice(0, 1).map(p => `- ${p.title} (${p.propertyType}) in ${p.locality}, Asking Price: ₹${p.priceMax.toLocaleString('en-IN')}, Floor Price: ₹${p.priceMin.toLocaleString('en-IN')}${p.amenities?.length ? `, Amenities: ${p.amenities.slice(0, 3).join(', ')}` : ''}`).join('\n')}`
    : 'No matching properties found in catalog for this inquiry yet.';

  const customInstructionsBlock = agentProfile.customInstructions?.trim() 
    ? `\n═══ AGENCY SPECIFIC DEAL RULES ═══\n${agentProfile.customInstructions.trim()}\n`
    : '';

  const systemPrompt = `You are a professional real estate assistant working for ${agentName} at ${agencyName} in India.

═══ SCOPE ═══
1. Only discuss real estate: properties, pricing, localities, site visits, buying, selling, renting.
2. If asked anything unrelated, redirect once, warmly: "I'm here to help with your property search. Let's find you the right home!"
3. If they persist off topic after one redirect, don't repeat the redirect. A short neutral line is enough: "Let me know whenever you'd like to talk properties."

═══ ALREADY KNOWN INFO FROM LEAD (NEVER RE-ASK FOR THESE) ═══
- Locality: ${lead.locality || 'Not provided yet'}
- Budget: ${lead.budget || 'Not provided yet'}
- Property Type: ${lead.propertyType || 'Not provided yet'}

═══ STRICT CONVERSATION PROGRESSION RULE ═══
- NEVER ask for information that is already provided above or stated in the chat.
- If Locality is known, ask for Budget or BHK.
- If Locality and Budget are known, ask about their possession timeline or offer a site visit!
- Always move the conversation forward toward scheduling a site visit with ${agentName}.
- Keep your reply strictly to ONE single line. Never repeat previous greetings.

${customInstructionsBlock}
═══ EXAMPLE REPLIES (match this exact style) ═══
Lead: "Hi, I'm looking for a flat"
You: "Hi, happy to help you find the right one. Which area are you looking at?"

Lead: "2BHK chahiye Kharghar mein, 60 lakh tak"
You: "Kharghar mein achhe options available hain. Aap kab tak shift karna chahenge?"

Lead: "Can you do 55 lakhs instead of 60?"
You: "I can work with you on that. Let me check what's possible and get back to you with the best price."

Lead: "That's still too high, give me your final price"
You: "I understand, but that's close to the best I can do on this one. It's well positioned for the price."

Lead: "Okay 57 works, when can I visit?"
You: "Great, let me get you a confirmed slot with ${agentName} right away."

Lead: "What's the weather today?"
You: "I'm here to help with your property search. Let's find you the right home!"

OUTPUT FORMAT:
You must output a JSON object containing:
- "message": string (Your exact one-line reply, never containing hyphens or dashes)
- "needsAgent": boolean (true ONLY when booking a confirmed visit slot, paperwork, token payment, or price agreed at/above floor)
- "budget": string or null
- "locality": string or null
- "propertyType": string or null
- "timeline": string or null
- "aiSummary": 1-2 sentence structured summary
- "leadScore": "Hot" | "Warm" | "Cold" | "Unscored"
- "actionItems": array of string tasks for the agent
- "siteVisits": array of ISO timestamp strings
`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-4).map(msg => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.role === 'ai' 
        ? (msg.content.trim().startsWith('{') ? msg.content : JSON.stringify({ message: msg.content }))
        : msg.content,
    })),
    { role: 'user', content: newMessage }
  ];

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'openai/gpt-oss-20b',
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
    } catch (primaryErr) {
      console.warn('Primary model error, trying standard completion...', primaryErr);
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'qwen/qwen3.6-27b',
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
    }

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = parseJsonSafely(responseContent);

    return {
      message: parsed.message || `Hi, happy to help you find the right property. Which area are you looking at?`,
      needsAgent: Boolean(parsed.needsAgent),
      extractedInfo: {
        budget: parsed.budget || null,
        locality: parsed.locality || null,
        propertyType: parsed.propertyType || null,
        timeline: parsed.timeline || null,
        aiSummary: parsed.aiSummary || null,
        leadScore: parsed.leadScore || 'Unscored',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        siteVisits: Array.isArray(parsed.siteVisits) ? parsed.siteVisits : [],
      }
    };
  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      message: `Hi, happy to help you find the right property. Which area are you looking at?`,
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
- "siteVisits": An array of ISO timestamp strings if the lead requested a site visit. Empty array if none.
`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Lead Name: ${lead.name}\nConversation History:\n${conversationHistory.map(m => m.role + ': ' + m.content).join('\n')}` }
  ];

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'groq/compound-mini',
        response_format: { type: 'json_object' },
      });
    } catch {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'qwen/qwen3.6-27b',
        response_format: { type: 'json_object' },
      });
    }

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    return parseJsonSafely(responseContent);
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
    `[ID: ${l.id}] Name: ${l.name}, Score: ${l.leadScore}, Summary: ${l.aiSummary}, Budget: ${l.budget}, Locality: ${l.locality}, Type: ${l.propertyType}`
  ).join('\n');

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `NEW PROPERTY:\n${propertyDescription}\n\nLEADS DATABASE:\n${leadsContext}`}
  ];

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'groq/compound-mini',
        response_format: { type: 'json_object' },
      });
    } catch {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'qwen/qwen3.6-27b',
        response_format: { type: 'json_object' },
      });
    }

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    const parsed = parseJsonSafely(responseContent);
    return parsed.matchedLeadIds || [];
  } catch (error) {
    console.error('Groq Matcher Error:', error);
    return [];
  }
}

export async function parsePropertyFromText(rawText: string): Promise<Partial<Property>> {
  const systemPrompt = `You are a real estate catalog extraction AI.
Given a raw text snippet (such as a WhatsApp property broadcast, builder email, or broker listing message), extract structured property attributes.

OUTPUT FORMAT:
Output JSON with:
- "title": string (catchy, descriptive name e.g. "Prestige Lakeside 3BHK")
- "propertyType": string (must be strictly one of: "1BHK", "2BHK", "3BHK", "4BHK", "villa", "plot", "office", "shop")
- "locality": string (e.g. "Whitefield, Bangalore" or "Kharghar, Navi Mumbai")
- "priceMin": number (in Indian Rupees INR, e.g. 1.5 Cr = 15000000)
- "priceMax": number (in Indian Rupees INR)
- "areaSqft": number (in square feet, e.g. 1850)
- "amenities": array of strings (e.g. ["Pool", "Gym", "Clubhouse"])
- "description": string (clean, appealing 2-3 sentence overview)
- "builderName": string or null
- "possessionDate": string or null (e.g. "Ready to Move" or "Dec 2026")
- "furnishing": "unfurnished" | "semi_furnished" | "fully_furnished" | null

If price is given as a single number (e.g. 1.2 Cr), set priceMin to 1.2 Cr (12000000) and priceMax to 1.2 Cr or slightly higher (e.g. 12500000).
`;

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText }
        ],
        model: 'groq/compound-mini',
        response_format: { type: 'json_object' },
      });
    } catch {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText }
        ],
        model: 'qwen/qwen3.6-27b',
        response_format: { type: 'json_object' },
      });
    }

    const responseContent = chatCompletion.choices[0]?.message?.content || '{}';
    return parseJsonSafely(responseContent);
  } catch (error) {
    console.error('Groq Property Parse Error:', error);
    throw new Error('Failed to parse property with AI');
  }
}
