"use client";
import React, { useState } from 'react';
import useSWR from 'swr';
import { Lead, Message } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowPathIcon, 
  UserIcon, 
  MapPinIcon, 
  BanknotesIcon, 
  ClockIcon, 
  CheckBadgeIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => data.data);

export function ConversationView({ lead, onLeadUpdated }: { lead: Lead; onLeadUpdated?: () => void }) {
  const { data: messages, error, mutate } = useSWR<Message[]>(
    lead?.id ? `/api/chat?leadId=${lead.id}` : null, 
    fetcher, 
    { refreshInterval: 3000, fallbackData: [] }
  );

  const [manualMessage, setManualMessage] = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [localAiStatus, setLocalAiStatus] = useState(lead.aiStatus);

  const isMuted = localAiStatus === 'agent_took_over' || lead.doNotReply;
  const loading = !messages && !error;

  const handleToggleMute = async () => {
    setTogglingAi(true);
    const newStatus = isMuted ? 'ai_handling' : 'agent_took_over';
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          aiStatus: newStatus,
          doNotReply: !isMuted,
        })
      });
      setLocalAiStatus(newStatus);
      if (onLeadUpdated) onLeadUpdated();
    } catch (err) {
      console.error('Failed to toggle AI status:', err);
    } finally {
      setTogglingAi(false);
    }
  };

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMessage.trim() || sendingManual) return;

    setSendingManual(true);
    try {
      const res = await fetch('/api/whatsapp/takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          message: manualMessage.trim(),
        })
      });

      if (res.ok) {
        setManualMessage('');
        setLocalAiStatus('agent_took_over');
        mutate();
        if (onLeadUpdated) onLeadUpdated();
      }
    } catch (err) {
      console.error('Failed to send manual message:', err);
    } finally {
      setSendingManual(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Qualification Profile Card */}
      <div className="bg-claude-bg p-4 rounded-xl border border-claude-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-claude-border pb-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-claude-text">{lead.name}</span>
            <span className="text-xs text-claude-muted font-mono">{lead.phone}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 1-Click Saved Number / AI Auto-Reply Mute Toggle */}
            <button
              onClick={handleToggleMute}
              disabled={togglingAi}
              title={isMuted ? "Click to resume AI auto-replies" : "Click to mark as saved/personal number and mute AI auto-replies"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                isMuted 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? (
                <>
                  <SpeakerXMarkIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>🔇 Saved (AI Muted)</span>
                </>
              ) : (
                <>
                  <SpeakerWaveIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🤖 AI Handling</span>
                </>
              )}
            </button>

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
      <div className="flex flex-col h-72 bg-claude-bg rounded-xl p-4 overflow-y-auto space-y-3 border border-claude-border">
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

      {/* Manual Agent Reply Composer */}
      <form onSubmit={handleSendManual} className="flex gap-2">
        <input 
          type="text"
          value={manualMessage}
          onChange={e => setManualMessage(e.target.value)}
          placeholder={isMuted ? "Type a manual reply (AI is muted for this contact)..." : "Reply manually as Agent (switches to human takeover)..."}
          className="flex-1 bg-claude-card border border-claude-border rounded-xl px-3.5 py-2.5 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent"
        />
        <button
          type="submit"
          disabled={!manualMessage.trim() || sendingManual}
          className="bg-claude-accent hover:bg-claude-accent/90 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
        >
          {sendingManual ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <PaperAirplaneIcon className="w-3.5 h-3.5" />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
