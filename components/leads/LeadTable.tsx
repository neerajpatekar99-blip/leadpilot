"use client";

import React from 'react';
import { Lead } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { MessageSquare, MessageCircle, Phone, Mail, User } from 'lucide-react';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  onViewChat: (lead: Lead) => void;
  onSendWhatsApp: (lead: Lead) => void;
}

export function LeadTable({ leads, loading, onViewChat, onSendWhatsApp }: LeadTableProps) {
  
  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'blue';
      case 'contacted': return 'yellow';
      case 'replied': return 'orange';
      case 'qualified': return 'green';
      case 'closed': return 'gray';
      default: return 'gray';
    }
  };

  const getConsentColor = (status: Lead['consentStatus']) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'opted_in': return 'green';
      case 'opted_out': return 'red';
      default: return 'gray';
    }
  };

  const getAiStatusColor = (status: Lead['aiStatus']) => {
    switch (status) {
      case 'ai_handling': return 'purple';
      case 'needs_agent': return 'red';
      case 'agent_took_over': return 'gray';
      default: return 'gray';
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-claude-muted">Loading leads...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-claude-border rounded-xl">
        <p className="text-claude-muted">No leads found. Add one to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {leads.map(lead => (
          <div key={lead.id} className={`bg-claude-card p-4 rounded-xl shadow-sm border ${lead.aiStatus === 'needs_agent' ? 'border-red-200 bg-red-50/30' : 'border-claude-border'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-claude-text flex items-center gap-2">
                  <User className="w-4 h-4 text-claude-muted" /> {lead.name}
                </h3>
                <p className="text-sm text-claude-muted flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4" /> {lead.phone}
                </p>
                {lead.email && (
                  <p className="text-sm text-claude-muted flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" /> {lead.email}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onViewChat(lead)}
                  className="p-2 text-claude-muted hover:text-claude-text bg-claude-bg rounded-full transition-colors"
                  title="View Chat"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onSendWhatsApp(lead)}
                  disabled={lead.consentStatus !== 'opted_in'}
                  className={`p-2 rounded-full transition-colors ${lead.consentStatus !== 'opted_in' ? 'text-gray-300 bg-gray-50 cursor-not-allowed' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                  title="Send WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-claude-border">
              <Badge color={getStatusColor(lead.status)}>{lead.status}</Badge>
              <Badge color={getConsentColor(lead.consentStatus)}>{lead.consentStatus.replace('_', ' ')}</Badge>
              <Badge color={getAiStatusColor(lead.aiStatus)} pulse={lead.aiStatus === 'needs_agent'}>
                {lead.aiStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="mt-3 text-xs text-claude-muted flex justify-between">
              <span className="capitalize">{lead.source.replace('_', ' ')}</span>
              <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-claude-border shadow-sm">
        <table className="min-w-full divide-y divide-claude-border">
          <thead className="bg-claude-bg">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Name / Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Intelligence</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">AI Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-claude-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-claude-card divide-y divide-claude-border">
            {leads.map(lead => (
              <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${lead.aiStatus === 'needs_agent' ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-claude-text">{lead.name}</div>
                  <div className="text-sm text-claude-muted mt-1">{lead.phone}</div>
                  {lead.email && <div className="text-xs text-gray-400 mt-0.5">{lead.email}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {lead.leadScore && lead.leadScore !== 'Unscored' && (
                    <div className="mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        lead.leadScore === 'Hot' ? 'bg-orange-950 text-orange-400 border border-orange-900' :
                        lead.leadScore === 'Warm' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                        'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {lead.leadScore}
                      </span>
                    </div>
                  )}
                  {lead.aiSummary ? (
                    <div className="text-xs text-claude-muted max-w-xs whitespace-normal line-clamp-2">
                      {lead.aiSummary}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic">No summary yet</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-y-1.5 flex flex-col items-start">
                  <Badge color={getStatusColor(lead.status)}>{lead.status}</Badge>
                  <Badge color={getConsentColor(lead.consentStatus)}>{lead.consentStatus.replace('_', ' ')}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge color={getAiStatusColor(lead.aiStatus)} pulse={lead.aiStatus === 'needs_agent'}>
                    {lead.aiStatus.replace(/_/g, ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-claude-muted">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => onViewChat(lead)}
                      className="text-claude-muted hover:text-claude-accent transition-colors inline-flex items-center"
                      title="View Chat"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onSendWhatsApp(lead)}
                      disabled={lead.consentStatus !== 'opted_in'}
                      className={`inline-flex items-center transition-colors ${lead.consentStatus !== 'opted_in' ? 'text-gray-300 cursor-not-allowed' : 'text-green-600 hover:text-green-800'}`}
                      title="Send WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
