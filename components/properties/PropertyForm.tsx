"use client";

import React, { useState } from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { 
  PlusIcon, 
  TrashIcon, 
  SparklesIcon, 
  DocumentTextIcon, 
  PhotoIcon, 
  CheckCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

const PROPERTY_TYPES = ['1BHK', '2BHK', '3BHK', '4BHK', 'villa', 'plot', 'office', 'shop'];
const STATUSES = ['available', 'sold', 'on_hold'];
const FURNISHING_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-Furnished' },
  { value: 'fully_furnished', label: 'Fully Furnished' }
];

const CURATED_IMAGE_PRESETS = [
  {
    name: 'Luxury Apartment',
    urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    name: 'Modern Villa',
    urls: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    name: 'Commercial Office',
    urls: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    name: 'Penthouse View',
    urls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80'
    ]
  }
];

function formatIndianCurrency(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return '';
  if (amount >= 10000000) {
    const cr = (amount / 10000000).toFixed(2).replace(/\.00$/, '');
    return `₹${cr} Crore`;
  }
  if (amount >= 100000) {
    const lac = (amount / 100000).toFixed(2).replace(/\.00$/, '');
    return `₹${lac} Lakh`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function PropertyForm({ onSuccess, onCancel }: { onSuccess?: () => void, onCancel?: () => void }) {
  const [mode, setMode] = useState<'form' | 'ai_import'>('ai_import');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedSuccess, setParsedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    propertyType: '3BHK',
    locality: '',
    priceMin: 0,
    priceMax: 0,
    areaSqft: 0,
    amenitiesStr: '',
    description: '',
    status: 'available',
    builderName: '',
    possessionDate: 'Ready to Move',
    furnishing: 'semi_furnished'
  });

  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
  ]);

  const handleAIParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParsedSuccess(false);

    try {
      const res = await fetch('/api/properties/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data;
        setFormData(prev => ({
          ...prev,
          title: p.title || prev.title,
          propertyType: p.propertyType || prev.propertyType,
          locality: p.locality || prev.locality,
          priceMin: p.priceMin || prev.priceMin,
          priceMax: p.priceMax || prev.priceMax,
          areaSqft: p.areaSqft || prev.areaSqft,
          amenitiesStr: Array.isArray(p.amenities) ? p.amenities.join(', ') : (p.amenitiesStr || prev.amenitiesStr),
          description: p.description || prev.description,
          builderName: p.builderName || prev.builderName,
          possessionDate: p.possessionDate || prev.possessionDate,
          furnishing: p.furnishing || prev.furnishing,
        }));
        setParsedSuccess(true);
        setTimeout(() => {
          setMode('form');
        }, 600);
      } else {
        alert(json.error || 'Failed to parse property text');
      }
    } catch (e) {
      console.error(e);
      alert('Error parsing text with AI');
    } finally {
      setParsing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priceMin' || name === 'priceMax' || name === 'areaSqft' ? Number(value) : value
    }));
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const addImageUrl = () => setImageUrls([...imageUrls, '']);
  const removeImageUrl = (index: number) => setImageUrls(imageUrls.filter((_, i) => i !== index));

  const applyImagePreset = (urls: string[]) => {
    setImageUrls(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amenities = formData.amenitiesStr.split(',').map(s => s.trim()).filter(Boolean);
      const validImages = imageUrls.filter(Boolean);
      
      const payload = {
        ...formData,
        amenities,
        imageUrls: validImages
      };
      
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        if (onSuccess) onSuccess();
      } else {
        alert('Failed to save property');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-claude-border pb-3 gap-2">
        <button
          type="button"
          onClick={() => setMode('ai_import')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'ai_import' 
              ? 'bg-claude-accent text-white shadow-md shadow-claude-accent/20' 
              : 'text-claude-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <SparklesIcon className="w-4 h-4" />
          <span>✨ AI Fast Import (Paste Text)</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('form')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'form' 
              ? 'bg-claude-accent text-white shadow-md shadow-claude-accent/20' 
              : 'text-claude-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>📝 Property Details Form</span>
        </button>
      </div>

      {/* AI Fast Import Screen */}
      {mode === 'ai_import' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-r from-claude-accent/10 to-transparent p-4 rounded-xl border border-claude-accent/20">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-claude-accent" />
              Effortless Client Ingestion
            </h3>
            <p className="text-xs text-claude-muted mt-1 leading-relaxed">
              Paste any raw WhatsApp message, builder broadcast, or broker notes below. Our AI will automatically extract the Title, Locality, Price, BHK Type, Amenities, and Description in seconds!
            </p>
          </div>

          <div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. Prestige Lakeside Habitat 3BHK in Whitefield Bangalore. 1850 sqft. Asking 1.55 Cr to 1.75 Cr. Amenities: Clubhouse, Olympic pool, tennis court. Ready to move. Semi-furnished."
              className="w-full bg-claude-bg border border-claude-border rounded-xl p-3.5 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setRawText("Godrej Splendour 2BHK in Whitefield, Bangalore. 980 sqft. Price ₹75 Lakh - ₹85 Lakh. Amenities: Swimming Pool, Gym, Indoor Games, 24/7 Security. Possession: Dec 2026. Unfurnished.");
              }}
              className="text-xs text-claude-muted hover:text-claude-accent underline"
            >
              Try sample listing text
            </button>

            <button
              type="button"
              disabled={parsing || !rawText.trim()}
              onClick={handleAIParse}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-claude-accent hover:bg-opacity-90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-claude-accent/20"
            >
              {parsing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Analyzing & Extracting...</span>
                </>
              ) : parsedSuccess ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-green-300" />
                  <span>Imported Successfully!</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>Auto-Fill Form with AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Manual & Verified Form */}
      {mode === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Title</label>
              <input 
                required 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="e.g. Prestige Lakeside 3BHK" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Property Type</label>
              <Combobox 
                options={PROPERTY_TYPES}
                value={formData.propertyType}
                onChange={(val) => setFormData(prev => ({ ...prev, propertyType: val }))}
                placeholder="Select type"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Locality</label>
              <input 
                required 
                name="locality" 
                value={formData.locality} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="e.g. Whitefield, Bangalore" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Status</label>
              <select 
                required 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">
                Min Price (₹) {formData.priceMin > 0 && <span className="text-claude-accent font-medium ml-1">({formatIndianCurrency(formData.priceMin)})</span>}
              </label>
              <input 
                type="number" 
                required 
                name="priceMin" 
                value={formData.priceMin || ''} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="15000000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">
                Max Price (₹) {formData.priceMax > 0 && <span className="text-claude-accent font-medium ml-1">({formatIndianCurrency(formData.priceMax)})</span>}
              </label>
              <input 
                type="number" 
                required 
                name="priceMax" 
                value={formData.priceMax || ''} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="18000000"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Area (Sqft)</label>
              <input 
                type="number" 
                required 
                name="areaSqft" 
                value={formData.areaSqft || ''} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="1850"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Builder / Project</label>
              <input 
                name="builderName" 
                value={formData.builderName} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="e.g. Prestige Group" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Possession Date</label>
              <input 
                name="possessionDate" 
                value={formData.possessionDate} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                placeholder="e.g. Ready to Move or Dec 2026" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Furnishing</label>
              <select 
                name="furnishing" 
                value={formData.furnishing} 
                onChange={handleChange} 
                className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent"
              >
                {FURNISHING_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Amenities (comma separated)</label>
            <input 
              name="amenitiesStr" 
              value={formData.amenitiesStr} 
              onChange={handleChange} 
              className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
              placeholder="Pool, Gym, Clubhouse, 24/7 Security, Power Backup" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1.5">Description</label>
            <textarea 
              required 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={3} 
              className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-sm text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent"
              placeholder="Spacious luxury apartment with lake views..."
            />
          </div>

          {/* Visual Images & Presets */}
          <div className="space-y-3 pt-2 border-t border-claude-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted">
                Property Photos & HD Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-claude-muted mr-1 self-center">1-Click Presets:</span>
                {CURATED_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyImagePreset(preset.urls)}
                    className="text-xs bg-claude-bg hover:bg-claude-accent hover:text-white text-claude-text px-2 py-1 rounded border border-claude-border transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Thumbnail Preview Strip */}
            <div className="flex flex-wrap gap-3 my-2">
              {imageUrls.filter(Boolean).map((url, i) => (
                <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-claude-border bg-claude-bg">
                  <img src={url} alt={`Property ${i+1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImageUrl(i)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition-opacity"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* URL Inputs */}
            <div className="space-y-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input 
                    value={url} 
                    onChange={(e) => handleImageUrlChange(i, e.target.value)} 
                    className="flex-1 bg-claude-bg border border-claude-border rounded-lg px-3 py-1.5 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                    placeholder="https://images.unsplash.com/..." 
                  />
                  {imageUrls.length > 1 && (
                    <button type="button" onClick={() => removeImageUrl(i)} className="p-1.5 text-claude-muted hover:text-red-400">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addImageUrl} className="flex items-center gap-1 text-xs text-claude-accent hover:text-white mt-1">
                <PlusIcon className="w-3.5 h-3.5" /> Add another image URL
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-claude-border">
            {onCancel && (
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-claude-text bg-claude-card border border-claude-border rounded-lg hover:bg-claude-bg">
                Cancel
              </button>
            )}
            <button type="submit" disabled={loading} className="px-6 py-2 text-sm font-medium text-white bg-claude-accent rounded-lg hover:bg-opacity-90 disabled:opacity-50 shadow-lg shadow-claude-accent/20">
              {loading ? 'Saving to Catalog...' : 'Save Property'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
