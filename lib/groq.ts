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

  const systemPrompt = `You are a professional, warm real estate qualification AI assistant working for ${agentName} at ${agencyName} in India.

═══ PROPERTY ENQUIRY QUALIFICATION FLOW (Sachin Sir's Standard) ═══
Qualify the buyer naturally one single question at a time across the dialogue:
1. Basic Intent & Property Type:
   - Intent: Buy, Rent, Sell, or Invest
   - Type: Apartment/Flat (1BHK, 2BHK, 3BHK, 4+BHK), Villa, Plot/Land, Commercial/Office/Shop
2. Location & Area:
   - Preferred localities (e.g. Kharghar, Panvel, Ulwe, Navi Mumbai, Thane) or specific developers/projects
3. Property Specifications:
   - Furnishing (Furnished/Semi-Furnished), Parking, Balcony, Near Metro, Sea View, etc.
4. Budget & Home Loan:
   - Approximate Budget in INR (e.g., ₹50L, ₹85L, ₹1.5 Cr)
   - Home Loan planned (Yes / No / Pre-approved / Self-funded)
5. Timeline & Site Visit:
   - When planning to buy/shift (Immediate / within 1 month / 1-3 months / Exploring)
   - Offer a confirmed Site Visit with ${agentName}
6. Decision Maker & Representation:
   - Primary decision maker vs Joint family decision
   - Already working with another broker

═══ ALREADY KNOWN LEAD PROFILE (DO NOT RE-ASK FOR THESE) ═══
- Intent: ${lead.intent || 'Unknown'}
- Locality: ${lead.locality || 'Not provided yet'}
- Property Type / Configuration: ${lead.propertyType || lead.configuration || 'Not provided yet'}
- Budget: ${lead.budget || 'Not provided yet'}
- Loan Status: ${lead.loanStatus || 'Unknown'}
- Timeline: ${lead.timeline || 'Unknown'}

═══ STRICT RULES ═══
1. NEVER ask a question for information that is already provided above or in recent messages.
2. Progress the conversation forward naturally toward booking a site visit with ${agentName}.
3. Keep standard conversation replies to ONE single line.
4. When the lead is qualified, requests direct contact, or books a visit, share ${agentName}'s office details:
   "📞 Phone: 9870178204 | 📱 WhatsApp: +91 98701 78204 | 📧 Email: sachin@onestoppropertysolution.in | 📍 Office: Shop No. 3, Tulsi Corner, Plot No. 87-88, Sector 21, Kamothe, Navi Mumbai 410209"
5. Never use dashes (hyphens or em dashes). Use commas or full stops instead.
6. Match the lead's language automatically: Hinglish if Hinglish, Hindi if Hindi, English if English.
7. Acknowledge what they said warmly before asking the next qualification step.
8. Only discuss real estate.

${matchingText}
${customInstructionsBlock}

═══ OUTPUT FORMAT ═══
You must output a JSON object containing:
- "message": string (Your exact one-line reply without dashes)
- "needsAgent": boolean (true ONLY when lead wants to book a site visit, token payment, or paperwork)
- "intent": "buy" | "rent" | "sell" | "invest" | null
- "locality": string or null
- "propertyType": string or null
- "configuration": string or null (e.g., "2BHK", "3BHK")
- "specs": string or null (e.g., "Furnished, Parking, Near Metro")
- "budget": string or null (e.g., "75 Lakhs", "1.5 Cr")
- "loanStatus": "needs_loan" | "pre_approved" | "self_funded" | "not_decided" | null
- "timeline": string or null (e.g., "immediate", "1 month", "1-3 months", "exploring")
- "isDecisionMaker": "yes" | "no" | "joint" | null
- "hasOtherBroker": "yes" | "no" | null
- "leadScore": "Hot" | "Warm" | "Cold" | "Unscored"
- "aiSummary": 1-2 sentence overview of the buyer's requirement and readiness
- "actionItems": array of string tasks for the broker (e.g., ["Schedule site visit for Saturday", "Send brochure of 2BHK in Kharghar"])
- "siteVisits": array of ISO timestamp strings if a visit was requested
`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-8).map(msg => ({
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
      message: parsed.message || `Hi, happy to help you find the right property. Which area and budget are you looking at?`,
      needsAgent: Boolean(parsed.needsAgent),
      extractedInfo: {
        intent: parsed.intent || null,
        locality: parsed.locality || null,
        propertyType: parsed.propertyType || null,
        configuration: parsed.configuration || null,
        specs: parsed.specs || null,
        budget: parsed.budget || null,
        loanStatus: parsed.loanStatus || null,
        timeline: parsed.timeline || null,
        isDecisionMaker: parsed.isDecisionMaker || null,
        hasOtherBroker: parsed.hasOtherBroker || null,
        aiSummary: parsed.aiSummary || null,
        leadScore: parsed.leadScore || 'Unscored',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        siteVisits: Array.isArray(parsed.siteVisits) ? parsed.siteVisits : [],
      }
    };
  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      message: `Hi, happy to help you find the right property. Which area and budget are you looking at?`,
      needsAgent: false,
      extractedInfo: {}
    };
  }
}

export async function generateLeadIntelligence(lead: Lead, conversationHistory: Message[]) {
  const systemPrompt = `You are an expert real estate CRM intelligence agent for Sachin Bhoir.
Analyze the entire conversation history with a lead and extract a structured profile following Sachin Sir's qualification questionnaire.

OUTPUT FORMAT:
Output a JSON object containing:
- "aiSummary": 1-2 sentence summary of what the lead wants, budget, and readiness.
- "leadScore": Must be exactly one of: "Hot", "Warm", "Cold", or "Unscored". (Hot = ready to buy/visit immediately, Warm = exploring/responsive, Cold = unresponsive/vague).
- "intent": "buy" | "rent" | "sell" | "invest" | null
- "budget": Extracted budget (e.g., "75 Lakhs", "1.5 Cr") or null
- "locality": Extracted location preference or null
- "propertyType": Extracted property type (e.g., "2BHK Apartment", "Commercial Shop") or null
- "configuration": Extracted BHK/configuration or null
- "specs": Specific amenities / requirements or null
- "loanStatus": "needs_loan" | "pre_approved" | "self_funded" | "not_decided" | null
- "timeline": Extracted timeline (e.g. "immediate", "1-3 months") or null
- "isDecisionMaker": "yes" | "no" | "joint" | null
- "hasOtherBroker": "yes" | "no" | null
- "actionItems": Array of string tasks the agent needs to do (e.g. ["Call lead to confirm visit", "Send Kharghar 2BHK brochures"])
- "siteVisits": Array of ISO timestamp strings if a site visit was requested
`;

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Lead Name: ${lead.name}\nPhone: ${lead.phone}\nConversation History:\n${conversationHistory.map(m => m.role + ': ' + m.content).join('\n')}` }
  ];

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages,
        model: 'openai/gpt-oss-20b',
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
  const systemPrompt = `You are a smart real estate property matcher for Sachin Bhoir.
Given a Property Description and a list of Leads with their requirements, determine which leads are a good match.

OUTPUT FORMAT:
Output a JSON object with "matchedLeadIds": array of string lead IDs.
`;

  const leadsContext = leads.map(l => 
    `[ID: ${l.id}] Name: ${l.name}, Intent: ${l.intent || 'buy'}, Score: ${l.leadScore}, Summary: ${l.aiSummary}, Budget: ${l.budget}, Locality: ${l.locality}, Type: ${l.propertyType || l.configuration}`
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
        model: 'openai/gpt-oss-20b',
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
Given a raw text snippet (WhatsApp broadcast, builder email, or brochure text), extract structured property attributes.

OUTPUT FORMAT:
Output JSON with:
- "title": string (e.g. "Godrej Highlands 2BHK")
- "propertyType": string (must be strictly one of: "1BHK", "2BHK", "3BHK", "4BHK", "villa", "plot", "office", "shop")
- "locality": string (e.g. "Kharghar, Navi Mumbai" or "Panvel")
- "priceMin": number (in INR, e.g. 7500000)
- "priceMax": number (in INR, e.g. 8000000)
- "areaSqft": number (in sq ft, e.g. 950)
- "amenities": array of strings (e.g. ["Clubhouse", "Swimming Pool", "Gym", "Car Parking"])
- "description": string (appealing 2-3 sentence overview)
- "builderName": string or null
- "possessionDate": string or null (e.g. "Ready to Move" or "Dec 2026")
- "furnishing": "unfurnished" | "semi_furnished" | "fully_furnished" | null
`;

  try {
    let chatCompletion;
    try {
      chatCompletion = await getGroqClient().chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText }
        ],
        model: 'openai/gpt-oss-20b',
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
