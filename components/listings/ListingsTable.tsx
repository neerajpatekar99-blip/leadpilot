"use client";

import React from 'react';
import { Listing } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { MapPinIcon, HomeIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface ListingsTableProps {
  listings: Listing[];
  loading: boolean;
  onSmartMatch: (listing: Listing) => void;
}

export function ListingsTable({ listings, loading, onSmartMatch }: ListingsTableProps) {
  
  if (loading) {
    return <div className="text-center py-12 text-claude-muted">Loading listings...</div>;
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-claude-border rounded-xl">
        <p className="text-claude-muted">No active listings. Add your first property!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl border border-claude-border shadow-sm">
        <table className="min-w-full divide-y divide-claude-border">
          <thead className="bg-claude-bg">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Property</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Details</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-claude-muted uppercase tracking-wider">Date Added</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-claude-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-claude-card divide-y divide-claude-border">
            {listings.map(listing => (
              <tr key={listing.id} className="hover:bg-claude-bg transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {listing.mediaUrls && listing.mediaUrls.length > 0 ? (
                      <img src={listing.mediaUrls[0]} alt="Property" className="w-10 h-10 rounded-md object-cover border border-claude-border" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-claude-bg border border-claude-border flex items-center justify-center">
                        <HomeIcon className="w-5 h-5 text-claude-muted" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-claude-text">{listing.title}</div>
                      <div className="text-sm text-claude-muted mt-0.5">{listing.type} • {listing.locality}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-500">
                  {listing.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-1 text-xs text-claude-muted">
                    <span className="flex items-center gap-1"><HomeIcon className="w-3 h-3" /> {listing.type}</span>
                    <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> {listing.locality}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge color={listing.status === 'Active' ? 'green' : listing.status === 'Sold' ? 'gray' : 'yellow'}>
                    {listing.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-claude-muted">
                  {new Date(listing.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => onSmartMatch(listing)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-claude-accent/10 text-claude-accent hover:bg-claude-accent hover:text-white rounded-lg transition-colors border border-claude-accent/20"
                    title="Find Matching Leads"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    <span>Smart Match</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
