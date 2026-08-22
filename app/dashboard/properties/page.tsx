"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  UsersIcon, 
  BuildingOffice2Icon, 
  Cog6ToothIcon, 
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import PropertyTable from '@/components/properties/PropertyTable';
import PropertyForm from '@/components/properties/PropertyForm';
import { SettingsModal } from '@/components/leads/SettingsModal';
import AiKillswitchButton from '@/components/ui/AiKillswitchButton';
import { Property } from '@/lib/types';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data.properties || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.builderName && p.builderName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === 'all' || p.propertyType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [properties, searchQuery, typeFilter]);

  return (
    <div className="min-h-screen bg-claude-bg text-claude-text p-4 md:p-8 font-sans pb-24 animate-in fade-in duration-300">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-extrabold tracking-tight">LeadPilot CRM</h1>
            <div className="hidden md:flex bg-claude-card border border-claude-border rounded-lg p-1">
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors text-claude-muted hover:text-claude-text"
              >
                <UsersIcon className="w-4 h-4" /> Leads
              </Link>
              <button 
                className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-claude-bg text-claude-text shadow-sm"
              >
                <BuildingOffice2Icon className="w-4 h-4" /> Properties
              </button>
            </div>
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-3">
            <AiKillswitchButton />
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2.5 bg-claude-card border border-claude-border text-claude-muted hover:text-claude-text rounded-lg shadow-sm transition-colors"
              title="Settings & Integrations"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-claude-accent text-white rounded-lg hover:bg-[#C86445] shadow-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-claude-accent/20"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Property</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden bg-claude-card border border-claude-border rounded-lg p-1">
          <Link 
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors text-claude-muted hover:text-claude-text"
          >
            <UsersIcon className="w-4 h-4" /> Leads
          </Link>
          <button 
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-claude-bg text-claude-text shadow-sm"
          >
            <BuildingOffice2Icon className="w-4 h-4" /> Properties
          </button>
        </div>

        {/* Page Title & Fast Add Promo Banner */}
        <div className="bg-gradient-to-r from-claude-card via-claude-card to-[#1d1614] border border-claude-border p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Property Inventory & Catalog</h2>
            <p className="text-sm text-claude-muted mt-1">
              Properties listed here are dynamically matched and pitched to high-intent leads by the AI assistant.
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-claude-text border border-claude-border px-4 py-2 rounded-xl text-xs font-medium transition-colors"
          >
            <SparklesIcon className="w-4 h-4 text-claude-accent" />
            <span>✨ AI Fast Ingestion from WhatsApp / Notes</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row w-full md:w-auto gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search properties by title, locality, or builder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-claude-border rounded-lg bg-claude-card focus:outline-none focus:ring-1 focus:ring-claude-accent transition-colors text-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="block w-full md:w-48 px-3 py-2 border border-claude-border rounded-lg bg-claude-card focus:outline-none focus:ring-1 focus:ring-claude-accent transition-colors text-sm text-claude-text"
            >
              <option value="all">All Types</option>
              <option value="1BHK">1BHK</option>
              <option value="2BHK">2BHK</option>
              <option value="3BHK">3BHK</option>
              <option value="4BHK">4BHK</option>
              <option value="villa">Villa</option>
              <option value="plot">Plot</option>
              <option value="office">Office</option>
              <option value="shop">Shop</option>
            </select>
          </div>

          <div className="text-xs text-claude-muted">
            Showing <span className="text-white font-medium">{filteredProperties.length}</span> of {properties.length} properties
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-claude-card border border-claude-border rounded-xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-claude-muted text-sm">Loading properties catalog...</div>
          ) : (
            <PropertyTable properties={filteredProperties} />
          )}
        </div>

        {/* Add Property Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-claude-card border border-claude-border rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-claude-card/95 backdrop-blur z-10 px-6 py-4 border-b border-claude-border flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Add Property to Catalog</h2>
                  <p className="text-xs text-claude-muted">Use AI fast import or fill details manually</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-claude-muted hover:text-white p-1 text-lg">
                  ✕
                </button>
              </div>
              <div className="p-6">
                <PropertyForm 
                  onSuccess={() => {
                    setShowModal(false);
                    fetchProperties();
                  }}
                  onCancel={() => setShowModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <SettingsModal 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </div>
  );
}
