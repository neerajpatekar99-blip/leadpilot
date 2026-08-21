"use client";

import React, { useState, useRef } from 'react';
import { Combobox } from '@/components/ui/Combobox';
import { 
  PlusIcon, 
  TrashIcon, 
  SparklesIcon, 
  DocumentTextIcon, 
  PhotoIcon, 
  CheckCircleIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  DocumentArrowUpIcon,
  VideoCameraIcon,
  FilmIcon
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
  const [mode, setMode] = useState<'upload_doc' | 'ai_import' | 'form'>('upload_doc');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedSuccess, setParsedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    propertyType: '3BHK',
    locality: '',
    priceMin: 0,
    priceMax: 0,
    areaSqft: 0,
    amenities: [] as string[],
    imageUrls: [] as string[],
    videoUrl: '',
    status: 'available',
    description: '',
    builderName: '',
    possessionDate: '',
    furnishing: 'unfurnished',
  });

  const [amenityInput, setAmenityInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Handle PDF / Document Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setParsing(true);
    setParsedSuccess(false);

    try {
      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/properties/parse-file', {
        method: 'POST',
        body: data,
      });

      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setFormData(prev => ({
          ...prev,
          title: d.title || prev.title || file.name.replace(/\.[^/.]+$/, ''),
          propertyType: d.propertyType || prev.propertyType,
          locality: d.locality || prev.locality,
          priceMin: d.priceMin || prev.priceMin,
          priceMax: d.priceMax || prev.priceMax,
          areaSqft: d.areaSqft || prev.areaSqft,
          amenities: d.amenities?.length ? Array.from(new Set([...prev.amenities, ...d.amenities])) : prev.amenities,
          description: d.description || prev.description,
          builderName: d.builderName || prev.builderName,
          possessionDate: d.possessionDate || prev.possessionDate,
          furnishing: d.furnishing || prev.furnishing,
        }));
        setParsedSuccess(true);
        setMode('form');
      } else {
        alert(result.error || 'Could not parse document.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to parse document with AI.');
    } finally {
      setParsing(false);
    }
  };

  // Handle Multiple Image Uploads (converts to preview data URLs)
  const handleMediaUpload = (files: FileList | null) => {
    if (!files || !files.length) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setFormData(prev => ({
              ...prev,
              imageUrls: [...prev.imageUrls, e.target!.result as string]
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Handle Raw Text AI Parse
  const handleAiParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParsedSuccess(false);

    try {
      const res = await fetch('/api/properties/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });

      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setFormData(prev => ({
          ...prev,
          title: d.title || prev.title,
          propertyType: d.propertyType || prev.propertyType,
          locality: d.locality || prev.locality,
          priceMin: d.priceMin || prev.priceMin,
          priceMax: d.priceMax || prev.priceMax,
          areaSqft: d.areaSqft || prev.areaSqft,
          amenities: d.amenities?.length ? d.amenities : prev.amenities,
          description: d.description || prev.description,
          builderName: d.builderName || prev.builderName,
          possessionDate: d.possessionDate || prev.possessionDate,
          furnishing: d.furnishing || prev.furnishing,
        }));
        setParsedSuccess(true);
        setMode('form');
      } else {
        alert(result.error || 'Failed to parse text.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to parse property with AI.');
    } finally {
      setParsing(false);
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenityInput.trim()]
      }));
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.filter((_, i) => i !== index)
    }));
  };

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setFormData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, imageUrlInput.trim()]
      }));
      setImageUrlInput('');
    }
  };

  const handleRemoveImageUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const handleApplyImagePreset = (presetUrls: string[]) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: Array.from(new Set([...prev.imageUrls, ...presetUrls]))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create property');
      }
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Mode Switcher Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-800 mb-6 gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-emerald-400" />
            Add Property to Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Drop a PDF brochure, upload photos, or paste raw broker text to auto-fill in seconds.
          </p>
        </div>

        {/* Ingestion Mode Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('upload_doc')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'upload_doc'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DocumentArrowUpIcon className="w-4 h-4" />
            Upload PDF / Media
          </button>
          <button
            type="button"
            onClick={() => setMode('ai_import')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'ai_import'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            Paste WhatsApp Text
          </button>
          <button
            type="button"
            onClick={() => setMode('form')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'form'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {parsedSuccess ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> : null}
            Property Form {parsedSuccess && '(Filled)'}
          </button>
        </div>
      </div>

      {/* 1. DOCUMENT & MEDIA DROPZONE TAB */}
      {mode === 'upload_doc' && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                if (file.name.toLowerCase().endsWith('.pdf') || file.type.startsWith('text/')) {
                  handleFileUpload(file);
                } else if (file.type.startsWith('image/')) {
                  handleMediaUpload(e.dataTransfer.files);
                  setMode('form');
                }
              }
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragOver
                ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-emerald-500/50 bg-slate-950/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.txt,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
            <input
              type="file"
              ref={mediaInputRef}
              accept="image/*,video/*"
              multiple
              onChange={(e) => {
                handleMediaUpload(e.target.files);
                setMode('form');
              }}
              className="hidden"
            />

            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              {parsing ? (
                <ArrowPathIcon className="w-8 h-8 animate-spin" />
              ) : (
                <DocumentArrowUpIcon className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-base font-semibold text-white">
              {parsing ? 'AI is extracting details from brochure...' : 'Drag & Drop PDF Brochure or Photos'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Drop any builder PDF brochure, flyer, or property photo album. Our AI extracts pricing, BHK, floor plans, and amenities instantly.
            </p>

            {uploadedFileName && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-emerald-300 rounded-full text-xs font-mono border border-slate-700">
                📄 {uploadedFileName}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={parsing}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <DocumentTextIcon className="w-4 h-4" />
                Select PDF Brochure
              </button>
              <button
                type="button"
                disabled={parsing}
                onClick={() => mediaInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-50"
              >
                <PhotoIcon className="w-4 h-4 text-emerald-400" />
                Upload Property Photos
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode('ai_import')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-all"
            >
              Or Paste WhatsApp Message →
            </button>
          </div>
        </div>
      )}

      {/* 2. TEXT FAST IMPORT TAB */}
      {mode === 'ai_import' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4" /> Paste any Raw Property Text
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Paste messy WhatsApp messages from builders, broker broadcast groups, or listing notes.
            </p>
          </div>

          <div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. *New Launch at Kharghar!* 2BHK 1100 sqft with balcony. Price: 65L to 72L negotiable. Swimming pool, Gym, Clubhouse, 24/7 Security. Possession Dec 2026. Contact Sachin."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setMode('form')}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Skip to Manual Entry →
            </button>

            <div className="flex items-center gap-3">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                disabled={parsing || !rawText.trim()}
                onClick={handleAiParse}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {parsing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Extracting with AI...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Auto-Fill Property Form
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. STRUCTURED PROPERTY FORM */}
      {mode === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {parsedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                <strong>Auto-filled by AI!</strong> Please review and save.
              </span>
              <button
                type="button"
                onClick={() => setMode('upload_doc')}
                className="text-emerald-400 underline hover:text-emerald-300"
              >
                Upload another file
              </button>
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Property Title <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Prestige Lakeside Habitat 3BHK"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Locality / Area <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.locality}
                onChange={e => setFormData({ ...formData, locality: e.target.value })}
                placeholder="e.g. Kharghar, Navi Mumbai"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Property Type</label>
              <Combobox
                options={PROPERTY_TYPES.map(t => ({ value: t, label: t }))}
                value={formData.propertyType}
                onChange={val => setFormData({ ...formData, propertyType: val })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
              <Combobox
                options={STATUSES.map(s => ({ value: s, label: s.toUpperCase() }))}
                value={formData.status}
                onChange={val => setFormData({ ...formData, status: val })}
              />
            </div>

            {/* Price Inputs with Indian Currency Helper */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Floor Price (Min Price in INR) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.priceMin || ''}
                onChange={e => setFormData({ ...formData, priceMin: Number(e.target.value) })}
                placeholder="e.g. 5700000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[11px] text-emerald-400/90 font-medium mt-1">
                {formatIndianCurrency(formData.priceMin) ? `Word format: ${formatIndianCurrency(formData.priceMin)}` : 'Enter amount in INR (e.g. 5700000 for 57 Lakh)'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Asking Price (Max Price in INR) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.priceMax || ''}
                onChange={e => setFormData({ ...formData, priceMax: Number(e.target.value) })}
                placeholder="e.g. 6200000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[11px] text-emerald-400/90 font-medium mt-1">
                {formatIndianCurrency(formData.priceMax) ? `Word format: ${formatIndianCurrency(formData.priceMax)}` : 'Enter amount in INR (e.g. 6200000 for 62 Lakh)'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Area (Sqft)</label>
              <input
                type="number"
                min={0}
                value={formData.areaSqft || ''}
                onChange={e => setFormData({ ...formData, areaSqft: Number(e.target.value) })}
                placeholder="e.g. 1050"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Builder / Developer</label>
              <input
                type="text"
                value={formData.builderName}
                onChange={e => setFormData({ ...formData, builderName: e.target.value })}
                placeholder="e.g. Godrej Properties"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Possession Date</label>
              <input
                type="text"
                value={formData.possessionDate}
                onChange={e => setFormData({ ...formData, possessionDate: e.target.value })}
                placeholder="e.g. Ready to Move or Dec 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Furnishing</label>
              <Combobox
                options={FURNISHING_OPTIONS}
                value={formData.furnishing}
                onChange={val => setFormData({ ...formData, furnishing: val })}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Highlight top features, views, Italian marble, clubhouse, connectivity..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Video Walkthrough Link */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <VideoCameraIcon className="w-4 h-4 text-emerald-400" /> Video Walkthrough Link (Optional)
            </label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={e => setFormData({ ...formData, videoUrl: e.target.value })}
              placeholder="e.g. https://youtu.be/sample-walkthrough or Vimeo video URL"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Amenities Tag Manager */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Amenities</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={amenityInput}
                onChange={e => setAmenityInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAmenity(); } }}
                placeholder="e.g. Swimming Pool, Gym, 24/7 Security"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" /> Add
              </button>
            </div>

            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                {formData.amenities.map((amenity, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    {amenity}
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(idx)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Image Presets & Photo Gallery */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Property Photos (Shared automatically on WhatsApp matches)
              </label>
            </div>

            {/* Curated 1-Click Image Presets */}
            <div className="mb-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <p className="text-[11px] text-slate-400 mb-2 font-medium">⚡ 1-Click Curated HD Photo Presets:</p>
              <div className="flex flex-wrap gap-2">
                {CURATED_IMAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyImagePreset(preset.urls)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 rounded border border-slate-800 hover:border-emerald-500/40 text-xs transition-all"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL and File Upload */}
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
                placeholder="Or paste an Image URL (https://...)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" /> Add URL
              </button>
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/30 flex items-center gap-1"
              >
                <PhotoIcon className="w-4 h-4" /> Upload File
              </button>
            </div>

            {/* Image Preview Strip */}
            {formData.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                {formData.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-900">
                    <img src={url} alt={`Property ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-500/80 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" /> Saving Property...
                </>
              ) : (
                <>Save to Property Inventory</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
