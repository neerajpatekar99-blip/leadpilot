"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { LeadTable } from '@/components/leads/LeadTable';
import { PipelineView } from '@/components/leads/PipelineView';
import { LeadForm } from '@/components/leads/LeadForm';
import { WhatsAppModal } from '@/components/leads/WhatsAppModal';
import { ConversationView } from '@/components/leads/ConversationView';
import { SettingsModal } from '@/components/leads/SettingsModal';
import { ListingsTable } from '@/components/listings/ListingsTable';
import { ListingForm } from '@/components/listings/ListingForm';
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { VisitsWidget } from '@/components/dashboard/VisitsWidget';
import { Modal } from '@/components/ui/Modal';
import { Lead, Listing } from '@/lib/types';
import { PlusIcon, Cog6ToothIcon, MagnifyingGlassIcon, UsersIcon, ExclamationCircleIcon, CheckCircleIcon, Squares2X2Icon, ListBulletIcon, LightBulbIcon, ArrowPathIcon, XMarkIcon, BuildingOffice2Icon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => data.data);

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'listings'>('leads');
  
  // Leads State via SWR
  const { data: leadsRaw, error: leadsError, mutate: mutateLeads } = useSWR<Lead[]>('/api/leads', fetcher, { 
    fallbackData: [], 
    refreshInterval: 5000 
  });
  const leads = useMemo(() => {
    return [...(leadsRaw || [])].sort((a, b) => {
      if (a.aiStatus === 'needs_agent' && b.aiStatus !== 'needs_agent') return -1;
      if (b.aiStatus === 'needs_agent' && a.aiStatus !== 'needs_agent') return 1;
      return b.createdAt - a.createdAt; 
    });
  }, [leadsRaw]);
  
  const loadingLeads = !leadsRaw && !leadsError;
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Listings State via SWR
  const { data: listingsRaw, error: listingsError, mutate: mutateListings } = useSWR<Listing[]>('/api/listings', fetcher, { fallbackData: [] });
  const listings = listingsRaw || [];
  const loadingListings = !listingsRaw && !listingsError;

  // Modals State
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isAddListingModalOpen, setIsAddListingModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedLeadForChat, setSelectedLeadForChat] = useState<Lead | null>(null);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);

  // Smart Property Matcher
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchedLeadIds, setMatchedLeadIds] = useState<string[] | null>(null);

  const handleLeadAdded = () => {
    setIsAddLeadModalOpen(false);
    mutateLeads();
  };

  const handleListingAdded = () => {
    setIsAddListingModalOpen(false);
    mutateListings();
  };

  const handlePropertyMatch = async (forceQuery?: string) => {
    const queryToUse = forceQuery || propertySearchQuery;
    if (!queryToUse.trim()) {
      setMatchedLeadIds(null);
      return;
    }
    
    // Switch to leads tab automatically if matching from another tab
    if (activeTab !== 'leads') setActiveTab('leads');
    
    setIsMatching(true);
    try {
      const res = await fetch('/api/analytics/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyDescription: queryToUse })
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

  const handleSmartMatchFromListing = (listing: Listing) => {
    const query = `${listing.type} in ${listing.locality} priced around ${listing.price}`;
    setPropertySearchQuery(query);
    handlePropertyMatch(query);
  };

  const clearPropertyMatch = () => {
    setPropertySearchQuery('');
    setMatchedLeadIds(null);
  };

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim() || selectedLeads.length === 0) return;
    setSendingBulk(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: selectedLeads, message: bulkMessage })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully sent to ${data.successCount} leads.`);
        setIsBulkModalOpen(false);
        setBulkMessage('');
        setSelectedLeads([]);
      } else {
        alert('Failed to send bulk messages.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingBulk(false);
    }
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
    <div className="min-h-screen bg-claude-bg text-claude-text p-4 md:p-8 font-sans pb-24">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold font-serif">LeadPilot CRM</h1>
            <div className="hidden md:flex bg-claude-card border border-claude-border rounded-lg p-1">
              <button 
                onClick={() => setActiveTab('leads')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
              >
                <UsersIcon className="w-4 h-4" /> Leads
              </button>
              <button 
                onClick={() => setActiveTab('listings')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'listings' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
              >
                <BuildingOffice2Icon className="w-4 h-4" /> Listings
              </button>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-3">
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2.5 bg-claude-card border border-claude-border text-claude-muted hover:text-claude-text rounded-lg shadow-sm transition-colors"
              title="Settings & Integrations"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => activeTab === 'leads' ? setIsAddLeadModalOpen(true) : setIsAddListingModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-claude-accent text-white rounded-lg hover:bg-[#C86445] shadow-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add {activeTab === 'leads' ? 'Lead' : 'Listing'}
            </button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="flex md:hidden bg-claude-card border border-claude-border rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('leads')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
          >
            <UsersIcon className="w-4 h-4" /> Leads
          </button>
          <button 
            onClick={() => setActiveTab('listings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'listings' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
          >
            <BuildingOffice2Icon className="w-4 h-4" /> Listings
          </button>
        </div>

        {/* Tab Content: LEADS */}
        {activeTab === 'leads' && (
          <>
            {/* Widgets Section (Tasks & Visits) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[350px]">
              <TasksWidget />
              <VisitsWidget />
            </div>

            {/* Smart Property Matcher (Global) */}
            <div className="bg-gradient-to-r from-claude-card to-[#1a1513] border border-claude-accent/30 p-5 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[200px]">
                <div className="p-2 bg-claude-accent/20 text-claude-accent rounded-lg">
                  <LightBulbIcon className="w-5 h-5" />
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
                    className="absolute right-32 top-1/2 -translate-y-1/2 text-claude-muted hover:text-white"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => handlePropertyMatch()}
                  disabled={isMatching || !propertySearchQuery.trim()}
                  className="bg-claude-accent text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap min-w-[120px]"
                >
                  {isMatching ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'Find Match'}
                </button>
              </div>
            </div>

            {matchedLeadIds !== null && (
              <div className="text-sm text-claude-accent font-medium">
                Found {matchedLeadIds.length} leads matching your property description.
              </div>
            )}

            {/* Filters and View Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
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
                  <ListBulletIcon className="w-4 h-4" /> Table
                </button>
                <button 
                  onClick={() => setViewMode('pipeline')}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'pipeline' ? 'bg-claude-bg text-claude-text shadow-sm' : 'text-claude-muted hover:text-claude-text'}`}
                >
                  <Squares2X2Icon className="w-4 h-4" /> Pipeline
                </button>
              </div>
            </div>

            {loadingLeads ? (
              <div className="flex justify-center items-center h-64 text-claude-muted">
                <ArrowPathIcon className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              viewMode === 'table' ? (
                <LeadTable 
                  leads={filteredLeads}
                  loading={loadingLeads}
                  onViewChat={(lead) => setSelectedLeadForChat(lead)}
                  onSendWhatsApp={(lead) => setSelectedLeadForWhatsApp(lead)}
                  selectedLeads={selectedLeads}
                  onSelectionChange={setSelectedLeads}
                />
              ) : (
                <PipelineView 
                  leads={filteredLeads}
                  onSelectLead={(lead) => setSelectedLeadForChat(lead)}
                  onWhatsAppClick={(lead) => setSelectedLeadForWhatsApp(lead)}
                />
              )
            )}
          </>
        )}

        {/* Tab Content: LISTINGS */}
        {activeTab === 'listings' && (
          <ListingsTable 
            listings={listings}
            loading={loadingListings}
            onSmartMatch={handleSmartMatchFromListing}
          />
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedLeads.length > 0 && activeTab === 'leads' && viewMode === 'table' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-claude-card border border-claude-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-5 z-40">
          <div className="text-sm font-medium">
            <span className="text-claude-accent">{selectedLeads.length}</span> leads selected
          </div>
          <div className="h-4 w-px bg-claude-border"></div>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-full transition-colors"
          >
            <ChatBubbleOvalLeftIcon className="w-4 h-4" />
            Bulk WhatsApp
          </button>
          <button 
            onClick={() => setSelectedLeads([])}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors text-claude-muted hover:text-white"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal 
        isOpen={isAddLeadModalOpen} 
        onClose={() => setIsAddLeadModalOpen(false)} 
        title="Add New Lead"
      >
        <LeadForm onSuccess={handleLeadAdded} />
      </Modal>

      <Modal 
        isOpen={isAddListingModalOpen} 
        onClose={() => setIsAddListingModalOpen(false)} 
        title="Add New Property Listing"
      >
        <ListingForm onSuccess={handleListingAdded} />
      </Modal>

      <Modal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        title={`Send Message to ${selectedLeads.length} Leads`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-claude-muted mb-2">Message Content</label>
            <p className="text-xs text-gray-500 mb-2">Use {'{name}'} to personalize with the lead's name.</p>
            <textarea 
              rows={4}
              value={bulkMessage}
              onChange={e => setBulkMessage(e.target.value)}
              className="w-full bg-claude-bg border border-claude-border rounded-lg p-3 text-sm focus:border-claude-accent focus:outline-none focus:ring-1 focus:ring-claude-accent text-white"
              placeholder="Hi {name}, I have a new property you might like..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsBulkModalOpen(false)}
              className="px-4 py-2 text-sm text-claude-muted hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={sendBulkMessage}
              disabled={sendingBulk || !bulkMessage.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {sendingBulk ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : 'Send Blast'}
            </button>
          </div>
        </div>
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
