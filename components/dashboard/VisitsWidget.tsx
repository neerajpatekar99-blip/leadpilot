"use client";

import React from 'react';
import useSWR from 'swr';
import { SiteVisit } from '@/lib/types';
import { CalendarIcon, MapPinIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => data.data);

export function VisitsWidget() {
  const { data: visitsRaw, error, mutate } = useSWR<SiteVisit[]>('/api/visits', fetcher, { fallbackData: [], refreshInterval: 5000 });
  const visits = visitsRaw || [];
  const loading = !visitsRaw && !error;

  const handleComplete = async (id: string) => {
    try {
      mutate(visits.map(v => v.id === id ? { ...v, status: 'Completed' } : v), false);
      await fetch('/api/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Completed' })
      });
      mutate();
    } catch (err) {
      console.error(err);
      mutate();
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-claude-muted">Loading visits...</div>;
  }

  const upcomingVisits = visits.filter(v => v.status === 'Upcoming');

  return (
    <div className="bg-claude-card border border-claude-border rounded-xl shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-claude-border flex justify-between items-center">
        <h3 className="font-semibold text-claude-text flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-500" /> 
          Upcoming Visits
        </h3>
        <Badge color="blue">{upcomingVisits.length}</Badge>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto max-h-[300px]">
        {upcomingVisits.length === 0 ? (
          <p className="text-sm text-claude-muted text-center py-6">No site visits scheduled.</p>
        ) : (
          <div className="space-y-4">
            {upcomingVisits.map(visit => (
              <div key={visit.id} className="border border-claude-border rounded-lg p-3 hover:bg-claude-bg transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-sm text-claude-text">{visit.leadName}</div>
                  <button 
                    onClick={() => handleComplete(visit.id)}
                    className="text-claude-muted hover:text-green-500 transition-colors"
                    title="Mark as completed"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-claude-muted space-y-1">
                  <div className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {new Date(visit.scheduledAt).toLocaleString()}</div>
                  {visit.propertyTitle && <div className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> {visit.propertyTitle}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
