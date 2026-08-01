export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: 'facebook_ads' | 'manual' | 'csv_import' | '99acres' | 'magicbricks' | 'whatsapp_inbound';
  consentStatus: 'pending' | 'opted_in' | 'opted_out';
  status: 'new' | 'contacted' | 'site_visit' | 'negotiation' | 'closed';
  aiStatus: 'ai_handling' | 'needs_agent' | 'agent_took_over';
  createdAt: number;
  lastContactedAt?: number;
  notes?: string;
  // CRM AI Fields
  aiSummary?: string;
  leadScore?: 'Hot' | 'Warm' | 'Cold' | 'Unscored';
  budget?: string;
  locality?: string;
  propertyType?: string;
  deletedAt?: number;
}

export interface Message {
  id: string;
  leadId: string;
  role: 'ai' | 'lead' | 'agent';
  content: string;
  timestamp: number;
}

export interface AgentProfile {
  id: string;
  name: string;
  agencyName: string;
  phone: string;
  specializations: string[];
  activeLocalities: string[];
}
