"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { LeadTable } from '@/components/leads/LeadTable';
import { PipelineView } from '@/components/leads/PipelineView';
import { LeadForm } from '@/components/leads/LeadForm';
import { WhatsAppModal } from '@/components/leads/WhatsAppModal';
import { ConversationView } from '@/components/leads/ConversationView';
import { SettingsModal } from '@/components/leads/SettingsModal';
import { Modal } from '@/components/ui/Modal';
import { Lead } from '@/lib/types';
import { Plus, Settings, Search, Users, AlertCircle, CheckCircle2, LayoutGrid, List, Sparkles, Loader2, X } from 'lucide-react';

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [selectedLeadForChat, setSelectedLeadForChat] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('pipeline');

  // Smart Property Matcher
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchedLeadIds, setMatchedLeadIds] = useState<string[] | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/leads');
        const data = await res.json();
        if (data.success) {
          const sortedLeads = (data.data as Lead[]).sort((a, b) => {
            if (a.aiStatus === 'needs_agent' && b.aiStatus !== 'needs_agent') return -1;
            if (b.aiStatus === 'needs_agent' && a.aiStatus !== 'needs_agent') return 1;
            return b.createdAt - a.createdAt; 
          });
          setLeads(sortedLeads);
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, [refreshTrigger]);

  const handleLeadAdded = () => {
    setIsAddLeadModalOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePropertyMatch = async () => {
    if (!propertySearchQuery.trim()) {
      setMatchedLeadIds(null);
      return;
    }
    setIsMatching(true);
    try {
      const res = await fetch('/api/analytics/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyDescription: propertySearchQuery })
      });
      const data = await res.json();
      if (data.success) {
        setMatchedLeadIds((data.matchedLeads as Lead[]).map(l => l.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  const clearPropertyMatch = () => {
    setPropertySearchQuery('');
    setMatchedLeadIds(null);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (matchedLeadIds !== null && !matchedLeadIds.includes(lead.id)) {
        return false;
      }
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            lead.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchQuery, statusFilter, matchedLeadIds]);

  const analytics = useMemo(() => {
    const total = leads.length;
    const needsAttention = leads.filter(l => l.aiStatus === 'needs_agent').length;
    const qualified = leads.filter(l => l.status === 'site_visit' || l.status === 'negotiation').length;
    return { total, needsAttention, qualified };
  }, [leads]);

  return (
    <div className="min-h-screen bg-claude-bg text-claude-text p-4 md:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold font-serif">LeadPilot CRM</h1>
          
          <div className="flex w-full md:w-auto items-center gap-3">
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 bg-claude-card border border-claude-border text-claude-muted hover:text-claude-text rounded-lg shadow-sm transition-colors"
              title="Settings & Integrations"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsAddLeadModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-claude-accent text-white rounded-lg hover:bg-[#C86445] shadow-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-claude-card p-5 rounded-xl border border-claude-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-claude-muted">Total Leads</p>
              <p className="text-2xl font-bold font-serif">{analytics.total}</p>
            </div>
          </div>
          <div className="bg-claude-card p-5 rounded-xl border border-claude-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-full"><AlertCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-claude-muted">Needs Attention</p>
              <p className="text-2xl font-bold font-serif text-red-500">{analytics.needsAttention}</p>
            </div>
          </div>
          <div className="bg-claude-card p-5 rounded-xl border border-claude-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-full"><CheckCircle2 className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-claude-muted">Active Deals</p>
              <p className="text-2xl font-bold font-serif text-green-500">{analytics.qualified}</p>
            </div>
          </div>
        </div>

        {/* Smart Property Matcher */}
        <div className="bg-gradient-to-r from-claude-card to-[#1a1513] border border-claude-accent/30 p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[200px]">
            <div className="p-2 bg-claude-accent/20 text-claude-accent rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Smart Matcher</h3>
              <p className="text-xs text-claude-muted">Find matching leads</p>
            </div>
          </div>
          <div className="flex-1 flex w-full gap-2 relative">
            <input 
              type="text"
              placeholder="e.g. 3BHK in Whitefield around 1.5Cr"
              value={propertySearchQuery}
              onChange={e => setPropertySearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePropertyMatch()}
              className="w-full bg-claude-bg border border-claude-border rounded-lg px-4 py-2.5 text-sm focus:border-claude-accent focus:outline-none transition-colors"
            />
            {matchedLeadIds !== null && (
              <button 
                onClick={clearPropertyMatch}
                className="absolute right-28 top-1/2 -translate-y-1/2 text-claude-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handlePropertyMatch}
              disabled={isMatching || !propertySearchQuery.trim()}
              className="bg-claude-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Match'}
            </button>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-claude-border rounded-lg bg-claude-card focus:outline-none focus:ring-1 focus:ring-claude-accent transition-colors text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full md:w-48 px-3 py-2 border border-claude-border rounded-lg bg-claude-card focus:outline-none focus:ring-1 focus:ring-claude-accent transition-colors text-sm text-claude-text"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="site_visit">Site Visit</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex bg-claude-card border border-claude-border rounded-lg p-1 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('table')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
            >
              <List className="w-4 h-4" /> Table
            </button>
            <button 
              onClick={() => setViewMode('pipeline')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Pipeline
            </button>
          </div>
        </div>

        {matchedLeadIds !== null && (
          <div className="text-sm text-claude-accent font-medium">
            Found {matchedLeadIds.length} leads matching your property description.
          </div>
        )}

        {/* Dashboard Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64 text-claude-muted">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          viewMode === 'table' ? (
            <LeadTable 
              leads={filteredLeads}
              loading={loading}
              onViewChat={(lead) => setSelectedLeadForChat(lead)}
              onSendWhatsApp={(lead) => setSelectedLeadForWhatsApp(lead)}
            />
          ) : (
            <PipelineView 
              leads={filteredLeads}
              onSelectLead={(lead) => setSelectedLeadForChat(lead)}
              onWhatsAppClick={(lead) => setSelectedLeadForWhatsApp(lead)}
            />
          )
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isAddLeadModalOpen} 
        onClose={() => setIsAddLeadModalOpen(false)} 
        title="Add New Lead"
      >
        <LeadForm onSuccess={handleLeadAdded} />
      </Modal>

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <Modal 
        isOpen={!!selectedLeadForChat} 
        onClose={() => setSelectedLeadForChat(null)} 
        title={`Intelligence: ${selectedLeadForChat?.name}`}
      >
        {selectedLeadForChat && <ConversationView lead={selectedLeadForChat} />}
      </Modal>

      <Modal 
        isOpen={!!selectedLeadForWhatsApp} 
        onClose={() => setSelectedLeadForWhatsApp(null)} 
        title="Send WhatsApp Message"
      >
        {selectedLeadForWhatsApp && (
          <WhatsAppModal 
            lead={selectedLeadForWhatsApp} 
            onClose={() => setSelectedLeadForWhatsApp(null)} 
          />
        )}
      </Modal>
    </div>
  );
}
