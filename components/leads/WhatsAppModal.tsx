"use client";
import React, { useState } from 'react';
import { Lead } from '@/lib/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface WhatsAppModalProps {
  lead: Lead;
  onClose: () => void;
}

export function WhatsAppModal({ lead, onClose }: WhatsAppModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/whatsapp/takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          phone: lead.phone,
          message,
        }),
      });

      if (res.ok) {
        alert('Message sent and AI paused for this lead.');
        onClose();
      } else {
        alert('Failed to send message.');
      }
    } catch (err) {
      console.error(err);
      alert('Error sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-claude-bg p-3 rounded-lg text-sm text-claude-text border border-claude-border">
        Sending to: <span className="font-semibold">{lead.name}</span> ({lead.phone})
      </div>
      <div>
        <label className="block text-sm font-medium text-claude-muted mb-1">Message</label>
        <textarea 
          rows={4}
          className="mt-1 block w-full rounded-lg border border-claude-border bg-claude-card p-3 text-claude-text shadow-sm focus:border-claude-accent focus:outline-none focus:ring-1 focus:ring-claude-accent sm:text-sm transition-colors"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message here..."
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button 
          onClick={onClose}
          disabled={sending}
          className="px-4 py-2 border border-claude-border shadow-sm text-sm font-medium rounded-lg text-claude-text bg-claude-card hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors inline-flex items-center"
        >
          {sending ? <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" /> : null}
          {sending ? 'Sending...' : 'Send WhatsApp'}
        </button>
      </div>
    </div>
  );
}
