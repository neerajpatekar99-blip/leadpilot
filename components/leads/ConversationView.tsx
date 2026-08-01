"use client";
import React, { useEffect, useState } from 'react';
import { Lead, Message } from '@/lib/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export function ConversationView({ lead }: { lead: Lead }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching messages
    setTimeout(() => {
      setMessages([
        {
          id: '1',
          leadId: lead.id,
          role: 'ai',
          content: 'Hello! I noticed you were interested in properties in Whitefield.',
          timestamp: Date.now() - 3600000,
        },
        {
          id: '2',
          leadId: lead.id,
          role: 'lead',
          content: 'Yes, looking for a 3BHK under 1.5Cr.',
          timestamp: Date.now() - 3500000,
        }
      ]);
      setLoading(false);
    }, 500);
  }, [lead.id]);

  if (loading) {
    return      <div className="flex justify-center items-center py-12 text-claude-muted"><ArrowPathIcon className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-96 bg-claude-bg rounded-xl p-4 overflow-y-auto space-y-4 border border-claude-border">
      {messages.length === 0 ? (
        <div className="text-center text-claude-muted m-auto">No messages yet.</div>
      ) : (
        messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`max-w-[75%] p-3 shadow-sm text-sm ${
              msg.role === 'lead' 
                ? 'bg-blue-50 text-blue-900 self-end rounded-2xl rounded-tr-sm border border-blue-100' 
                : msg.role === 'ai'
                  ? 'bg-claude-card text-claude-text self-start rounded-2xl rounded-tl-sm border border-claude-border'
                  : 'bg-green-50 text-green-900 self-start rounded-2xl rounded-tl-sm border border-green-100'
            }`}
          >
            <div className="font-medium text-xs mb-1 capitalize opacity-70">
              {msg.role === 'lead' ? lead.name : msg.role === 'ai' ? 'AI Assistant' : 'Agent'}
            </div>
            <div className="leading-relaxed">{msg.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
