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

export interface Listing {
  id: string;
  title: string;
  price: string;
  type: string;
  locality: string;
  mediaUrls?: string[];
  status: 'Active' | 'Sold' | 'Draft';
  createdAt: number;
}

export interface SiteVisit {
  id: string;
  leadId: string;
  leadName: string;
  propertyId?: string;
  propertyTitle?: string;
  scheduledAt: number;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: number;
}

export interface ActionItem {
  id: string;
  leadId: string;
  leadName: string;
  task: string;
  dueDate?: number;
  status: 'Pending' | 'Completed';
  createdAt: number;
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
