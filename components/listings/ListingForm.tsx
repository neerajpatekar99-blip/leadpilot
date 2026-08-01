"use client";

import React, { useState } from 'react';
import { ArrowPathIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Combobox } from '@/components/ui/Combobox';

interface ListingFormProps {
  onSuccess: () => void;
}

export function ListingForm({ onSuccess }: ListingFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    type: '3BHK Apartment',
    locality: '',
  });
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          price: formData.price,
          type: formData.type,
          locality: formData.locality,
          mediaUrls: images,
          status: 'Active'
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        alert('Failed to add listing');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving listing');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "mt-1 block w-full rounded-md border border-claude-border bg-claude-card px-3 py-2 text-claude-text shadow-sm focus:border-claude-accent focus:outline-none focus:ring-1 focus:ring-claude-accent sm:text-sm transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-claude-muted">Property Title</label>
        <input 
          required 
          type="text" 
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          className={inputClasses} 
          placeholder="e.g. Luxury 3BHK in Whitefield"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-claude-muted">Price</label>
        <input 
          required 
          type="text" 
          value={formData.price}
          onChange={e => setFormData({ ...formData, price: e.target.value })}
          className={inputClasses} 
          placeholder="e.g. 1.5 Cr"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-claude-muted mb-2">Property Type</label>
        <Combobox
          value={formData.type}
          onChange={(val) => setFormData({ ...formData, type: val })}
          options={['1 RK', '1BHK Apartment', '2BHK Apartment', '3BHK Apartment', '4BHK+ Apartment', 'Villa', 'Plot / Land', 'Commercial']}
          placeholder="Select or type custom property type..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-claude-muted">Locality</label>
        <input 
          required
          type="text" 
          value={formData.locality}
          onChange={e => setFormData({ ...formData, locality: e.target.value })}
          className={inputClasses} 
          placeholder="e.g. Whitefield, Indiranagar"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-claude-muted mb-2">Property Photos (Optional)</label>
        <div className="border-2 border-dashed border-claude-border rounded-lg p-6 flex flex-col items-center justify-center bg-claude-bg/50 hover:bg-claude-bg transition-colors relative cursor-pointer group">
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <ArrowUpTrayIcon className="w-8 h-8 text-claude-muted mb-2 group-hover:text-claude-accent transition-colors" />
          <p className="text-sm text-claude-muted text-center">
            Click or drag images to upload<br/>
            <span className="text-xs opacity-70">JPEG, PNG up to 5MB</span>
          </p>
        </div>
        
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-md overflow-hidden border border-claude-border">
                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4">
        <button 
          type="submit" 
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-claude-accent hover:bg-[#C86445] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-claude-accent transition-colors disabled:opacity-50"
        >
          {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : 'Add Listing'}
        </button>
      </div>
    </form>
  );
}
