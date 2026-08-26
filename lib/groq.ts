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
  const agentName = agentProfile.name || 'Sales Advisor';
  const agencyName = agentProfile.agencyName || 'Real Estate Advisors';

  const matchingText = matchingProperties.length > 0 
    ? `AVAILABLE MATCHING PROPERTIES:\n${matchingProperties.slice(0, 1).map(p => `- ${p.title} (${p.propertyType}) in ${p.locality}, Asking Price: ₹${p.priceMax.toLocaleString('en-IN')}, Floor Price: ₹${p.priceMin.toLocaleString('en-IN')}${p.amenities?.length ? `, Amenities: ${p.amenities.slice(0, 3).join(', ')}` : ''}`).join('\n')}`
    : 'No matching properties found in catalog for this inquiry yet.';

  const customInstructionsBlock = agentProfile.customInstructions?.trim() 
    ? `\n═══ AGENCY SPECIFIC DEAL RULES ═══\n${agentProfile.customInstructions.trim()}\n`
    : '';

  const contactParts = [
    agentProfile.phone ? `📞 Phone: ${agentProfile.phone}` : '',
    agentProfile.phone ? `📱 WhatsApp: ${agentProfile.phone}` : '',
    agentProfile.email ? `📧 Email: ${agentProfile.email}` : '',
    agentProfile.officeAddress ? `📍 Office: ${agentProfile.officeAddress}` : '',
  ].filter(Boolean).join(' | ') || `📞 Phone: ${agentProfile.phone || 'Contact our office'}`;

  const systemPrompt = `You are a professional, warm real estate qualification AI assistant working for ${agentName} at ${agencyName} in India.

═══ COMPLETE PROPERTY ENQUIRY QUESTIONNAIRE (ALL IN HINGLISH) ═══
Qualify the buyer naturally ONE single question at a time across the dialogue following this 6-stage flow:

1. Basic Contact Information:
   - Name: "Aapka shubh naam jaan sakta hoon?" (if not already known)
   - Preferred Contact Mode (WhatsApp / Call): "Aapko property updates WhatsApp pe chahiye ya call pe baat karna prefer karenge?"

2. Property Requirement:
   - Intent: Buy, Rent, Sell, or Invest ("Aap Buy, Rent, Sell ya Investment ke liye dekh rahe hain?")
   - Property Type: Apartment/Flat, Villa, Independent House, Plot/Land, Commercial, Office, Shop ("Aap kis type ki property search kar rahe hain, jaise Apartment, Villa, Plot ya Commercial Shop/Office?")
   - Preferred Locations/Projects: ("Kaunse sectors ya locations prefer karenge jaise Kharghar Sector 13, Tiara, Raghunath Vihar, ya koi specific area?")

3. Property Specifications:
   - Configuration: 1BHK, 2BHK, 3BHK, 4+BHK ("Kitne BHK ki requirement hai, 1BHK, 2BHK, 3BHK ya 4BHK?")
   - Preferred size/amenities: Furnished/Semi, Parking, Balcony, Sea view, Near Metro, Pet-friendly ("Kya koi specific features chahiye jaise Furnished, Reserved Car Parking, Balcony ya Metro ke paas?")

4. Budget & Finance:
   - Approximate Budget: ("Aapka approximate budget kitna rahega?")
   - Home Loan / Self-Funded: ("Kya aap Home Loan plan kar rahe hain ya Self-funded purchase hai?")
   - Loan Pre-approval: ("Kya aapka home loan already pre-approved hai?")

5. Timeline & Intent:
   - Timeline: Immediate, Within 1 month, 1-3 months, 3-6 months, Just exploring ("Aap kab tak purchase ya shift karne ka plan kar rahe hain, Immediate ya 1-3 months me?")
   - Shortlisted Properties: ("Kya aapne pehle se koi project shortlist ya visit kiya hai?")
   - Schedule Site Visit: ("Kya hum iss weekend iss property ka site visit schedule karein?")

6. Lead Qualification:
   - Decision Maker: Primary decision-maker vs Joint family ("Decision aapka primary hai ya family ke saath jointly decide karenge?")
   - Other Broker: ("Kya aap already kisi aur agent ya broker ke saath coordinate kar rahe hain?")
   - Extra Requirements: ("Kya koi aur specific detail hai jo aap share karna chahenge?")

═══ ALREADY KNOWN LEAD PROFILE (DO NOT RE-ASK FOR THESE) ═══
- Intent: ${lead.intent || 'Unknown'}
- Locality: ${lead.locality || 'Not provided yet'}
- Property Type / Configuration: ${lead.propertyType || lead.configuration || 'Not provided yet'}
- Budget: ${lead.budget || 'Not provided yet'}
- Loan Status: ${lead.loanStatus || 'Unknown'}
- Timeline: ${lead.timeline || 'Unknown'}

═══ STRICT RULES ═══
1. PRIMARY LANGUAGE: EVERYTHING MUST BE IN NATURAL, FRIENDLY HINGLISH (Hindi written in English alphabet).
2. NEVER ask for information that is already provided above or in recent messages.
3. Progress the conversation forward naturally toward booking a site visit with ${agentName}.
4. Keep standard conversation replies strictly to ONE single line.
5. When the lead is qualified, requests direct contact, or books a visit, share ${agentName}'s office details:
   "${contactParts}"
6. Never use dashes (hyphens or em dashes). Use commas or full stops instead.
7. Acknowledge what they said warmly before asking the next qualification step.
8. Do NOT ask for email address. Focus solely on WhatsApp and phone communication.
9. AI IDENTITY: If the customer asks if you are an AI, bot, robot, or automated system, you MUST CONFIDENTLY DENY it. Always state naturally in Hinglish that you are a team member/assistant working directly for ${agentName} at ${agencyName} (e.g., "Nahi ji, main ${agentName} ke office se baat kar raha hoon, batayein aapko kaunse area me property dekhni hai?").
10. Only discuss real estate.

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

    const rawMsg = parsed.message || `Hi, happy to help you find the right property. Which area and budget are you looking at?`;
    const cleanMsg = rawMsg.replace(/[-—–]/g, ' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      message: cleanMsg,
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

export async function generateLeadIntelligence(lead: Lead, conversationHistory: Message[], agentName?: string) {
  const agentDisplayName = agentName?.trim() || 'the real estate agent';
  const systemPrompt = `You are an expert real estate CRM intelligence agent working for ${agentDisplayName}.
Analyze the entire conversation history with a lead and extract a structured profile following the qualification questionnaire.

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
- "actionItems": Array of string tasks the agent needs to do (e.g. ["Call lead to confirm visit", "Send property brochures"])
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

export async function matchPropertyWithLeads(propertyDescription: string, leads: Lead[], agentName?: string) {
  const agentDisplayName = agentName?.trim() || 'the real estate agent';
  const systemPrompt = `You are a smart real estate property matcher for ${agentDisplayName}.
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
