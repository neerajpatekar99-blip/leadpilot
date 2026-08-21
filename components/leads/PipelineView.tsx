"use client";
import React from 'react';
import { Lead } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ChatBubbleOvalLeftIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface PipelineViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onWhatsAppClick: (lead: Lead) => void;
}

export function PipelineView({ leads, onSelectLead, onWhatsAppClick }: PipelineViewProps) {
  const stages = [
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'site_visit', label: 'Site Visit' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'closed', label: 'Closed' }
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageLeads = leads.filter(l => l.status === stage.id);
        
        return (
          <div key={stage.id} className="min-w-[300px] w-[300px] bg-claude-bg border border-claude-border rounded-xl flex flex-col max-h-[75vh]">
            <div className="p-4 border-b border-claude-border flex justify-between items-center bg-claude-card rounded-t-xl sticky top-0 z-10">
              <h3 className="font-semibold text-claude-text">{stage.label}</h3>
              <span className="bg-gray-800 text-xs text-white px-2 py-1 rounded-full">{stageLeads.length}</span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {stageLeads.map(lead => (
                <div 
                  key={lead.id} 
                  className={`bg-claude-card p-4 rounded-xl shadow-sm border ${lead.aiStatus === 'needs_agent' ? 'border-red-900 bg-red-950/20' : 'border-claude-border'} cursor-pointer hover:border-claude-accent transition-colors`}
                  onClick={() => onSelectLead(lead)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm text-claude-text capitalize">{lead.name}</h4>
                    {lead.leadScore && lead.leadScore !== 'Unscored' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        lead.leadScore === 'Hot' ? 'bg-orange-950 text-orange-400 border border-orange-900' :
                        lead.leadScore === 'Warm' ? 'bg-yellow-950 text-yellow-400 border border-yellow-900' :
                        'bg-gray-800 text-gray-400 border border-gray-700'
                      }`}>
                        {lead.leadScore}
                      </span>
                    )}
                  </div>
                  
                  {lead.aiSummary && (
                    <p className="text-xs text-claude-muted mb-3 line-clamp-2 leading-relaxed">
                      {lead.aiSummary}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {lead.budget && <span className="text-[10px] bg-claude-bg border border-claude-border text-claude-muted px-1.5 py-0.5 rounded">{lead.budget}</span>}
                    {lead.locality && <span className="text-[10px] bg-claude-bg border border-claude-border text-claude-muted px-1.5 py-0.5 rounded">{lead.locality}</span>}
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-3 border-t border-claude-border/50">
                    <Badge color={
                      lead.aiStatus === 'ai_handling' ? 'purple' : 
                      lead.aiStatus === 'needs_agent' ? 'red' : 'blue'
                    }>
                      {lead.aiStatus.replace('_', ' ')}
                    </Badge>
                    <div className="flex space-x-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelectLead(lead); }}
                        className="p-1.5 text-claude-muted hover:text-claude-accent hover:bg-claude-bg rounded-md transition-colors"
                        title="View Details"
                      >
                        <InformationCircleIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onWhatsAppClick(lead); }}
                        className="p-1.5 text-green-500 hover:bg-green-950 rounded-md transition-colors"
                        title="WhatsApp"
                      >
                        <ChatBubbleOvalLeftIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {stageLeads.length === 0 && (
                <div className="text-center p-6 text-sm text-claude-muted border border-dashed border-claude-border rounded-xl">
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
