"use client";

import React, { useState } from 'react';
import { Lead } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export function LeadForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'manual',
    notes: '',
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload: Partial<Lead> = {
      ...formData,
      // @ts-expect-error
      source: formData.source,
      consentStatus: consentChecked ? 'opted_in' : 'pending',
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create lead');
      }

      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "mt-1 block w-full rounded-md border border-claude-border bg-claude-card px-3 py-2 text-claude-text shadow-sm focus:border-claude-accent focus:outline-none focus:ring-1 focus:ring-claude-accent sm:text-sm transition-colors";
  const labelClasses = "block text-sm font-medium text-claude-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</div>}
      
      <div>
        <label className={labelClasses}>Full Name *</label>
        <input
          required
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Phone Number *</label>
        <input
          required
          type="tel"
          placeholder="e.g. +91 9876543210"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Email Address</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className={inputClasses}
        />
      </div>

      <div>
        <label className={labelClasses}>Source</label>
        <select
          value={formData.source}
          onChange={(e) => setFormData({...formData, source: e.target.value})}
          className={inputClasses}
        >
          <option value="manual">Manual Entry</option>
          <option value="99acres">99acres</option>
          <option value="magicbricks">MagicBricks</option>
          <option value="facebook_ads">Facebook Ads</option>
        </select>
      </div>

      <div>
        <label className={labelClasses}>Notes</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className={inputClasses}
        />
      </div>

      <div className="flex items-start">
        <div className="flex h-5 items-center">
          <input
            id="consent"
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="h-4 w-4 rounded border-claude-border text-claude-accent focus:ring-claude-accent"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="consent" className="font-medium text-claude-text">WhatsApp Consent</label>
          <p className="text-claude-muted">Customer has agreed to receive WhatsApp messages.</p>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-claude-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#C86445] focus:outline-none focus:ring-2 focus:ring-claude-accent focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {loading ? 'Saving...' : 'Save Lead'}
        </button>
      </div>
    </form>
  );
}
