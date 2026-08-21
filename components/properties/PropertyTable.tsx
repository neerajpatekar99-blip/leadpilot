"use client";

import React from 'react';
import { Property } from '@/lib/types';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function PropertyTable({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-10 text-claude-muted">
        No properties found. Add your first property!
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(price);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-claude-border text-xs uppercase text-claude-muted">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Locality</th>
            <th className="px-4 py-3 font-medium">Price Range</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-claude-border">
          {properties.map((prop) => (
            <tr key={prop.id} className="hover:bg-white/5 transition-colors group">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {prop.imageUrls?.[0] ? (
                    <img src={prop.imageUrls[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-claude-bg flex items-center justify-center text-claude-muted text-xs">No img</div>
                  )}
                  <span className="font-medium text-claude-text">{prop.title}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-claude-muted">{prop.propertyType}</td>
              <td className="px-4 py-4 text-claude-text">{prop.locality}</td>
              <td className="px-4 py-4 text-claude-text font-medium">
                {formatPrice(prop.priceMin)} - {formatPrice(prop.priceMax)}
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  prop.status === 'available' ? 'bg-green-500/10 text-green-400' :
                  prop.status === 'sold' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {prop.status}
                </span>
              </td>
              <td className="px-4 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 text-claude-muted hover:text-white rounded-md hover:bg-claude-bg">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-claude-muted hover:text-red-400 rounded-md hover:bg-claude-bg">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
