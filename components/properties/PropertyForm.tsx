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
  DocumentArrowUpIcon,
  BoltIcon
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

const ONE_CLICK_SAMPLES = [
  {
    label: '🏢 3BHK Luxury High-Rise',
    text: '*Prestige Grand Heights 3BHK* in Prime Metro Corridor. 1750 sqft. Price: ₹1.45 Cr to ₹1.65 Cr. Infinity Pool, Clubhouse, 2 Car Parking, Tennis Court, Italian Marble. Ready to move. Semi-furnished.'
  },
  {
    label: '🏡 4BHK Gated Villa',
    text: '*Palm Meadows Luxury 4BHK Villa* with Private Garden & Pool. 3200 sqft. Price: ₹3.5 Cr. Gated Community, 24/7 Security, 100% Power Backup. Possession Dec 2026. Fully furnished.'
  },
  {
    label: '🌴 2BHK Affordable Metro Flat',
    text: '*Godrej Green Vista 2BHK* on Central Express Highway. 1100 sqft with double balcony. Price: ₹65 Lakh to ₹75 Lakh negotiable. Gym, Kids Play Area. Possession Mid 2026. Unfurnished.'
  },
  {
    label: '🏬 Prime Commercial High-Street Shop',
    text: '*City Center High-Street Retail Shop* on Ground Floor. 650 sqft double height. Price: ₹95 Lakh. 12% Expected ROI, Main Road frontage, high footfall. Ready for possession.'
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
  const [mode, setMode] = useState<'ai_import' | 'upload_doc' | 'form'>('ai_import');
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedSuccess, setParsedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [instantSuccessMsg, setInstantSuccessMsg] = useState<string | null>(null);

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

  // 1-Click Instant AI Parse and Save to Database
  const handleOneClickPublish = async (textToUse?: string) => {
    const text = (textToUse || rawText).trim();
    if (!text) {
      alert('Please paste property text or click one of the quick templates above.');
      return;
    }
    setParsing(true);
    setLoading(true);

    try {
      const parseRes = await fetch('/api/properties/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const parseResult = await parseRes.json();
      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.error || 'Could not parse property details.');
      }
      const d = parseResult.data;

      // Smart Curated Photo Preset Assignment
      let autoImages: string[] = [];
      const typeLower = (d.propertyType || '').toLowerCase();
      if (typeLower.includes('villa')) {
        autoImages = CURATED_IMAGE_PRESETS[1].urls;
      } else if (typeLower.includes('commercial') || typeLower.includes('office') || typeLower.includes('shop')) {
        autoImages = CURATED_IMAGE_PRESETS[2].urls;
      } else if (typeLower.includes('4bhk') || typeLower.includes('penthouse')) {
        autoImages = CURATED_IMAGE_PRESETS[3].urls;
      } else {
        autoImages = CURATED_IMAGE_PRESETS[0].urls;
      }

      const payload = {
        title: d.title || 'New Property Listing',
        propertyType: d.propertyType || '3BHK',
        locality: d.locality || 'Prime Locality',
        priceMin: Number(d.priceMin) || 0,
        priceMax: Number(d.priceMax) || Number(d.priceMin) || 0,
        areaSqft: Number(d.areaSqft) || 0,
        amenities: Array.isArray(d.amenities) ? d.amenities : [],
        imageUrls: autoImages,
        status: 'available',
        description: d.description || '',
        builderName: d.builderName || '',
        possessionDate: d.possessionDate || 'Ready to Move',
        furnishing: d.furnishing || 'semi_furnished',
      };

      const saveRes = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saveResult = await saveRes.json();
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save property to database.');
      }

      setInstantSuccessMsg(`🎉 "${payload.title}" successfully published in 1 Click!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '1-Click publish failed.');
    } finally {
      setParsing(false);
      setLoading(false);
    }
  };

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

  // Handle Multiple Image Uploads
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

  // Handle Raw Text AI Parse into Form
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

      const result = await res.json();
      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        alert(result.error || 'Failed to save property.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl max-w-4xl mx-auto space-y-6">
      {/* Header Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>✨ Add Property to Catalog</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Use 1-Click Fast Ingest, drop a brochure PDF, or fill out details manually.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('ai_import')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              mode === 'ai_import'
                ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BoltIcon className="w-4 h-4 text-slate-950" />
            <span>⚡ 1-Click AI Ingest</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('upload_doc')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              mode === 'upload_doc'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DocumentArrowUpIcon className="w-4 h-4" />
            <span>PDF Brochure</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('form')}
            className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all ${
              mode === 'form'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Manual Form</span>
          </button>
        </div>
      </div>

      {instantSuccessMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
          <span>{instantSuccessMsg}</span>
        </div>
      )}

      {/* 1. TEXT 1-CLICK FAST IMPORT TAB (PRIMARY) */}
      {mode === 'ai_import' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <BoltIcon className="w-4 h-4" /> 1-Click Fast Property Ingestion
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Paste any raw WhatsApp message from builders or brokers below. Click <strong>"⚡ 1-Click AI Publish"</strong> and the AI will extract the BHK, price, area, and amenities, attach high-res photos, and save it directly in 1 second!
            </p>
          </div>

          {/* Quick 1-Click Template Chips */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              1-Click Quick Templates (Click to paste):
            </div>
            <div className="flex flex-wrap gap-2">
              {ONE_CLICK_SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawText(sample.text)}
                  className="text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 transition-all flex items-center gap-1"
                >
                  <span>{sample.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw WhatsApp listing note, brochure text, or builder broadcast message here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMode('form')}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Skip to Manual Form →
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
                disabled={parsing || loading || !rawText.trim()}
                onClick={handleAiParse}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                <span>Auto-Fill & Review</span>
              </button>

              <button
                type="button"
                disabled={parsing || loading || !rawText.trim()}
                onClick={() => handleOneClickPublish()}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {parsing || loading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-4 h-4" />
                    <span>⚡ 1-Click AI Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PDF / BROCHURE DROP TAB */}
      {mode === 'upload_doc' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) {
                const file = e.dataTransfer.files[0];
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
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
                onClick={() => setMode('ai_import')}
                className="text-emerald-400 underline hover:text-emerald-300"
              >
                Use 1-Click Fast Ingest
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Property Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Prestige Lakeside Habitat 3BHK"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Property Type / BHK *</label>
              <Combobox
                options={PROPERTY_TYPES.map(t => ({ value: t, label: t }))}
                value={formData.propertyType}
                onChange={(val) => setFormData({ ...formData, propertyType: val })}
                placeholder="Select BHK / Type"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Locality & City *</label>
              <input
                type="text"
                required
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                placeholder="e.g. Whitefield, Bangalore"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Developer / Builder Name</label>
              <input
                type="text"
                value={formData.builderName}
                onChange={(e) => setFormData({ ...formData, builderName: e.target.value })}
                placeholder="e.g. Prestige Group, Godrej Properties"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Floor / Minimum Price (INR) *</label>
              <input
                type="number"
                required
                value={formData.priceMin || ''}
                onChange={(e) => setFormData({ ...formData, priceMin: Number(e.target.value) })}
                placeholder="e.g. 7500000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              {formData.priceMin > 0 && (
                <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                  {formatIndianCurrency(formData.priceMin)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Asking / Maximum Price (INR) *</label>
              <input
                type="number"
                required
                value={formData.priceMax || ''}
                onChange={(e) => setFormData({ ...formData, priceMax: Number(e.target.value) })}
                placeholder="e.g. 8500000"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              {formData.priceMax > 0 && (
                <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                  {formatIndianCurrency(formData.priceMax)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Super Built-up Area (Sq.Ft.)</label>
              <input
                type="number"
                value={formData.areaSqft || ''}
                onChange={(e) => setFormData({ ...formData, areaSqft: Number(e.target.value) })}
                placeholder="e.g. 1450"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Furnishing Status</label>
              <Combobox
                options={FURNISHING_OPTIONS}
                value={formData.furnishing}
                onChange={(val) => setFormData({ ...formData, furnishing: val })}
                placeholder="Select Furnishing"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Possession Timeline</label>
              <input
                type="text"
                value={formData.possessionDate}
                onChange={(e) => setFormData({ ...formData, possessionDate: e.target.value })}
                placeholder="e.g. Ready to Move, Dec 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Catalog Status</label>
              <Combobox
                options={STATUSES.map(s => ({ value: s, label: s.toUpperCase() }))}
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
                placeholder="Select Status"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Property Highlights & Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Appealing sales overview, views, corner unit, RERA registered..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Amenities Tag Manager */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Key Amenities & Project Features</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAmenity();
                  }
                }}
                placeholder="e.g. Swimming Pool, Clubhouse, 24/7 Security (Press Enter)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddAmenity}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {formData.amenities.map((amenity, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-full text-xs"
                >
                  {amenity}
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(i)}
                    className="text-slate-400 hover:text-rose-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Curated 1-Click Photo Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">1-Click High-Res Image Presets</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {CURATED_IMAGE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyImagePreset(preset.urls)}
                  className="text-xs bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-slate-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <PlusIcon className="w-3 h-3" />
                  {preset.name} (+{preset.urls.length} Photos)
                </button>
              ))}
            </div>

            {formData.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {formData.imageUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(i)}
                      className="absolute top-1 right-1 p-1 bg-slate-950/80 text-rose-400 rounded hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
              Save Property to Catalog
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
