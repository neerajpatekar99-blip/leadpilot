"use client";
import React from 'react';
import useSWR from 'swr';
import { Lead, Message } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { ArrowPathIcon, UserIcon, MapPinIcon, BanknotesIcon, ClockIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => data.data);

export function ConversationView({ lead }: { lead: Lead }) {
  const { data: messages, error, mutate } = useSWR<Message[]>(
    lead?.id ? `/api/chat?leadId=${lead.id}` : null, 
    fetcher, 
    { refreshInterval: 3000, fallbackData: [] }
  );

  const loading = !messages && !error;

  return (
    <div className="space-y-4">
      {/* Sachin Sir's Qualification Profile Card */}
      <div className="bg-claude-bg p-4 rounded-xl border border-claude-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-claude-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-claude-text">{lead.name}</span>
            <span className="text-xs text-claude-muted font-mono">{lead.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            {lead.leadScore && (
              <Badge color={lead.leadScore === 'Hot' ? 'red' : lead.leadScore === 'Warm' ? 'yellow' : 'gray'}>
                {lead.leadScore} Intent
              </Badge>
            )}
            {lead.intent && (
              <Badge color="blue">
                {lead.intent.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        {/* Questionnaire Extracted Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-claude-card p-2 rounded-lg border border-claude-border">
            <div className="text-claude-muted flex items-center gap-1 mb-0.5">
              <MapPinIcon className="w-3.5 h-3.5" /> Locality
            </div>
            <div className="font-medium text-claude-text truncate">{lead.locality || 'Not specified'}</div>
          </div>

          <div className="bg-claude-card p-2 rounded-lg border border-claude-border">
            <div className="text-claude-muted flex items-center gap-1 mb-0.5">
              <BanknotesIcon className="w-3.5 h-3.5" /> Budget
            </div>
            <div className="font-medium text-claude-text truncate">{lead.budget || 'Not specified'}</div>
          </div>

          <div className="bg-claude-card p-2 rounded-lg border border-claude-border">
            <div className="text-claude-muted flex items-center gap-1 mb-0.5">
              <UserIcon className="w-3.5 h-3.5" /> Type / Config
            </div>
            <div className="font-medium text-claude-text truncate">{lead.propertyType || lead.configuration || 'Not specified'}</div>
          </div>

          <div className="bg-claude-card p-2 rounded-lg border border-claude-border">
            <div className="text-claude-muted flex items-center gap-1 mb-0.5">
              <ClockIcon className="w-3.5 h-3.5" /> Timeline
            </div>
            <div className="font-medium text-claude-text truncate capitalize">{lead.timeline || 'Exploring'}</div>
          </div>

          <div className="bg-claude-card p-2 rounded-lg border border-claude-border">
            <div className="text-claude-muted flex items-center gap-1 mb-0.5">
              <CheckBadgeIcon className="w-3.5 h-3.5" /> Home Loan
            </div>
            <div className="font-medium text-claude-text truncate capitalize">{lead.loanStatus ? lead.loanStatus.replace('_', ' ') : 'Not stated'}</div>
          </div>

          <div className="bg-claude-card p-2 rounded-lg border border-claude-border">
            <div className="text-claude-muted flex items-center gap-1 mb-0.5">
              <UserIcon className="w-3.5 h-3.5" /> Decision Maker
            </div>
            <div className="font-medium text-claude-text truncate capitalize">{lead.isDecisionMaker || 'Unknown'}</div>
          </div>
        </div>

        {lead.aiSummary && (
          <div className="text-xs bg-claude-card/70 p-2.5 rounded-lg border border-claude-border text-claude-text">
            <span className="font-semibold text-claude-accent">AI Summary: </span>
            {lead.aiSummary}
          </div>
        )}
      </div>

      {/* Live Conversation Stream */}
      <div className="flex flex-col h-80 bg-claude-bg rounded-xl p-4 overflow-y-auto space-y-3 border border-claude-border">
        {loading ? (
          <div className="flex justify-center items-center py-12 text-claude-muted">
            <ArrowPathIcon className="w-6 h-6 animate-spin" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center text-claude-muted m-auto text-sm">
            No WhatsApp messages recorded yet.
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`max-w-[80%] p-3 shadow-sm text-sm ${
                msg.role === 'lead' 
                  ? 'bg-blue-600/15 text-blue-200 self-end rounded-2xl rounded-tr-sm border border-blue-500/30' 
                  : msg.role === 'ai'
                    ? 'bg-claude-card text-claude-text self-start rounded-2xl rounded-tl-sm border border-claude-border'
                    : 'bg-emerald-600/15 text-emerald-200 self-start rounded-2xl rounded-tl-sm border border-emerald-500/30'
              }`}
            >
              <div className="flex justify-between items-center gap-4 font-medium text-xs mb-1 opacity-70">
                <span>{msg.role === 'lead' ? lead.name : msg.role === 'ai' ? 'LeadPilot AI' : 'Agent (Manual)'}</span>
                <span className="text-[10px] font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
