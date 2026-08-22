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

export interface Property {
  id: string;
  title: string;
  propertyType: '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'villa' | 'plot' | 'office' | 'shop';
  locality: string;
  priceMin: number;
  priceMax: number;
  areaSqft: number;
  amenities: string[];
  imageUrls: string[];
  brochureUrl?: string;
  status: 'available' | 'sold' | 'on_hold';
  description: string;
  builderName?: string;
  possessionDate?: string;
  furnishing?: 'unfurnished' | 'semi_furnished' | 'fully_furnished';
  createdAt: number;
  updatedAt?: number;
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
  customInstructions?: string;
  tone?: 'friendly' | 'professional' | 'luxury' | 'casual' | 'custom';
  languagePreference?: 'hinglish' | 'english' | 'hindi' | 'auto';
  aiEnabled?: boolean;
  updatedAt?: number;
}
