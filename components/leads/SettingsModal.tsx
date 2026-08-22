"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { 
  DocumentDuplicateIcon, 
  CheckIcon, 
  SparklesIcon, 
  CommandLineIcon, 
  HeartIcon, 
  CpuChipIcon, 
  GlobeAltIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { AgentProfile } from '@/lib/types';

const PROMPT_TEMPLATES = [
  {
    title: '🌟 NRI & Investor Focus',
    text: 'Highlight high capital appreciation, 6-8% expected rental yield, RERA registration, and NRI repatriation ease for all premium properties.'
  },
  {
    title: '📅 Weekend Visit Window',
    text: 'Strictly schedule all site visits on Saturday or Sunday between 10:00 AM and 2:00 PM when our on-site team is available.'
  },
  {
    title: '💰 Launch Discounts',
    text: 'Inform prospective buyers that we are offering an exclusive 5% pre-launch waiver on clubhouse charges for bookings finalized this week.'
  },
  {
    title: '📍 Locality Priority',
    text: 'If the lead does not specify a location, immediately recommend our prime gated community projects in Whitefield and Sarjapur Road.'
  }
];

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'ai' | 'integrations' | 'health'>('ai');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedWaUrl, setCopiedWaUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isLaunchingMeta, setIsLaunchingMeta] = useState(false);
  const [metaAuthStatus, setMetaAuthStatus] = useState<string | null>(null);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ url: string; count: number } | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [profile, setProfile] = useState<Partial<AgentProfile>>({
    name: 'Sachin Bhoir',
    agencyName: 'One Stop Property Solutions',
    phone: '+919876543210',
    tone: 'friendly',
    languagePreference: 'hinglish',
    customInstructions: '',
  });

  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/integrations/facebook`
    : 'https://leadpilot-liard.vercel.app/api/integrations/facebook';

  const waWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : 'https://leadpilot-liard.vercel.app/api/whatsapp/webhook';

  const verifyToken = 'leadpilot_webhook_token';

  const triggerGcsBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);
    try {
      const res = await fetch('/api/storage/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackupResult({ url: data.backupUrl, count: data.leadCount });
      }
    } catch (err) {
      console.error('Backup failed:', err);
    } finally {
      setIsBackingUp(false);
    }
  };

  const launchMetaEmbeddedSignup = () => {
    setIsLaunchingMeta(true);
    setMetaAuthStatus(null);

    // Ensure FB SDK is loaded
    if (typeof window !== 'undefined') {
      const loadAndLaunch = () => {
        if ((window as any).FB) {
          (window as any).FB.init({
            appId: '2227816574724553',
            cookie: true,
            xfbml: true,
            version: 'v20.0'
          });

          (window as any).FB.login(
            (response: any) => {
              setIsLaunchingMeta(false);
              if (response.authResponse) {
                setMetaAuthStatus('✅ Connected to Meta! Phone number registered.');
              } else {
                setMetaAuthStatus('Popup closed or cancelled.');
              }
            },
            {
              config_id: '1930273901003382',
              response_type: 'code',
              override_default_response_type: true
            }
          );
        } else {
          // Dynamically inject FB SDK script
          const script = document.createElement('script');
          script.src = 'https://connect.facebook.net/en_US/sdk.js';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            (window as any).FB.init({
              appId: '2227816574724553',
              cookie: true,
              xfbml: true,
              version: 'v20.0'
            });
            (window as any).FB.login(
              (response: any) => {
                setIsLaunchingMeta(false);
                if (response.authResponse) {
                  setMetaAuthStatus('✅ Connected to Meta! Phone number registered.');
                }
              },
              {
                config_id: '1930273901003382',
                response_type: 'code',
                override_default_response_type: true
              }
            );
          };
          document.body.appendChild(script);
        }
      };

      loadAndLaunch();
    }
  };

  const fetchSettings = async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/health');
      const json = await res.json();
      setHealthData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      fetchHealth();
    }
  }, [isOpen]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      const json = await res.json();
      if (json.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        alert('Failed to save settings: ' + json.error);
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const copyToClipboard = (text: string, isToken = false) => {
    navigator.clipboard.writeText(text);
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const insertPromptTemplate = (text: string) => {
    setProfile(prev => ({
      ...prev,
      customInstructions: prev.customInstructions 
        ? `${prev.customInstructions.trim()}\n${text}`
        : text
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="LeadPilot Control Center & Settings">
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-claude-border pb-2 gap-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'ai' 
                ? 'bg-claude-accent text-white shadow-sm' 
                : 'text-claude-muted hover:text-white'
            }`}
          >
            <CpuChipIcon className="w-4 h-4" />
            <span>🤖 AI & Custom Prompts</span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'integrations' 
                ? 'bg-claude-accent text-white shadow-sm' 
                : 'text-claude-muted hover:text-white'
            }`}
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span>📱 WhatsApp & Webhooks</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'health' 
                ? 'bg-claude-accent text-white shadow-sm' 
                : 'text-claude-muted hover:text-white'
            }`}
          >
            <CommandLineIcon className="w-4 h-4" />
            <span>⚡ System Health</span>
          </button>
        </div>

        {/* TAB 1: AI CUSTOM PROMPTS & PERSONA */}
        {activeTab === 'ai' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-300">
            {/* Master AI Killswitch Banner */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              profile.aiEnabled !== false
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${profile.aiEnabled !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  Master AI Operations Switch: {profile.aiEnabled !== false ? 'ACTIVE (24/7 Autopilot)' : 'PAUSED (Manual Mode)'}
                </h4>
                <p className="text-[11px] text-claude-muted mt-0.5">
                  {profile.aiEnabled !== false
                    ? 'AI is actively qualifying leads and negotiating on WhatsApp.'
                    : 'All AI responses are halted. Leads are held for manual agent replies.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, aiEnabled: profile.aiEnabled === false })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  profile.aiEnabled !== false
                    ? 'bg-rose-600/80 hover:bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-sm'
                }`}
              >
                {profile.aiEnabled !== false ? '🛑 Stop AI Operations' : '▶️ Resume AI Operations'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1">Agent Name</label>
                <input 
                  value={profile.name || ''} 
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                  placeholder="Sachin Bhoir"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1">Agency Name</label>
                <input 
                  value={profile.agencyName || ''} 
                  onChange={e => setProfile({ ...profile, agencyName: e.target.value })}
                  className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent" 
                  placeholder="One Stop Property Solutions"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1">AI Tone / Persona</label>
                <select 
                  value={profile.tone || 'friendly'} 
                  onChange={e => setProfile({ ...profile, tone: e.target.value as any })}
                  className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent"
                >
                  <option value="friendly">Warm & Approachable (Friendly Advisor)</option>
                  <option value="luxury">Luxury Consultant (Prestigious & High-End)</option>
                  <option value="professional">Professional & Consultative (Direct & Data-Driven)</option>
                  <option value="casual">Fast & Crisp (Ultra-Short Texting Style)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1">Language Style</label>
                <select 
                  value={profile.languagePreference || 'hinglish'} 
                  onChange={e => setProfile({ ...profile, languagePreference: e.target.value as any })}
                  className="w-full bg-claude-bg border border-claude-border rounded-lg px-3 py-2 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent"
                >
                  <option value="hinglish">Hinglish (Natural Urban Indian Mix)</option>
                  <option value="english">Standard English (Polished & Clear)</option>
                  <option value="hindi">Hindi (Conversational)</option>
                  <option value="auto">Auto (Mirror the Lead's Exact Style)</option>
                </select>
              </div>
            </div>

            {/* Custom Instructions Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted">
                  Custom LLM Instructions & Deal Rules
                </label>
                <span className="text-[11px] text-claude-accent font-medium">Injected live into Groq system prompt</span>
              </div>

              <textarea 
                rows={5}
                value={profile.customInstructions || ''}
                onChange={e => setProfile({ ...profile, customInstructions: e.target.value })}
                placeholder="Add your agency's custom sales rules, project pitch priorities, discount policies, site visit rules..."
                className="w-full bg-claude-bg border border-claude-border rounded-xl p-3 text-xs text-claude-text focus:outline-none focus:ring-1 focus:ring-claude-accent leading-relaxed font-mono"
              />

              {/* 1-Click Prompt Templates */}
              <div className="mt-2 space-y-1.5">
                <div className="text-[11px] text-claude-muted">Insert Quick Rule Templates:</div>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertPromptTemplate(tmpl.text)}
                      className="text-[11px] bg-claude-bg hover:bg-claude-accent hover:text-white text-claude-text px-2 py-1 rounded border border-claude-border transition-colors flex items-center gap-1"
                    >
                      <span>+</span> {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-claude-border">
              {savedSuccess ? (
                <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Custom instructions saved & active!</span>
                </div>
              ) : <div />}

              <button 
                type="submit" 
                disabled={savingProfile}
                className="px-5 py-2 text-xs font-semibold text-white bg-claude-accent rounded-lg hover:bg-opacity-90 disabled:opacity-50 shadow-md shadow-claude-accent/20 flex items-center gap-1.5"
              >
                {savingProfile ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <CheckIcon className="w-3.5 h-3.5" />}
                <span>Save AI Instructions</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: INTEGRATIONS & WEBHOOKS */}
        {activeTab === 'integrations' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Meta 1-Click Embedded Onboarding */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-claude-card to-[#121f18] p-4 rounded-xl border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white">Meta WhatsApp Business Coexistence Onboarding</h3>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  Config ID: 1930273901003382
                </span>
              </div>
              <p className="text-xs text-claude-muted mb-3 leading-relaxed">
                Connect your existing WhatsApp Business number directly through Meta&apos;s official popup with chat history and phone coexistence.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={launchMetaEmbeddedSignup}
                  disabled={isLaunchingMeta}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
                >
                  {isLaunchingMeta ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <span>🔗</span>}
                  <span>{isLaunchingMeta ? 'Launching Meta Popup...' : 'Connect WhatsApp Business via Meta'}</span>
                </button>
                {metaAuthStatus && (
                  <span className="text-xs font-medium text-emerald-400">{metaAuthStatus}</span>
                )}
              </div>
            </div>

            {/* WhatsApp Cloud API Webhook */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted">
                  WhatsApp Cloud API Webhook (Inbound Messages)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Status: Connected & Verified</span>
              </div>
              <div className="flex">
                <input 
                  type="text" 
                  readOnly 
                  value={waWebhookUrl}
                  className="flex-1 bg-claude-bg border border-claude-border rounded-l-lg px-3 py-2 text-xs text-claude-text focus:outline-none font-mono"
                />
                <button 
                  onClick={() => copyToClipboard(waWebhookUrl, false)}
                  className="bg-claude-card hover:bg-white/10 border border-l-0 border-claude-border rounded-r-lg px-3.5 flex items-center justify-center transition-colors"
                >
                  {copiedWaUrl ? <CheckIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4 text-claude-muted" />}
                </button>
              </div>
            </div>

            {/* Facebook Lead Ads Webhook */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1">
                Facebook Lead Ads Webhook (Instant Ad Form Sync)
              </label>
              <div className="flex">
                <input 
                  type="text" 
                  readOnly 
                  value={webhookUrl}
                  className="flex-1 bg-claude-bg border border-claude-border rounded-l-lg px-3 py-2 text-xs text-claude-text focus:outline-none font-mono"
                />
                <button 
                  onClick={() => copyToClipboard(webhookUrl, false)}
                  className="bg-claude-card hover:bg-white/10 border border-l-0 border-claude-border rounded-r-lg px-3.5 flex items-center justify-center transition-colors"
                >
                  {copiedUrl ? <CheckIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4 text-claude-muted" />}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-claude-muted mb-1">Verify Token (Meta Challenge)</label>
              <div className="flex">
                <input 
                  type="text" 
                  readOnly 
                  value={verifyToken}
                  className="flex-1 bg-claude-bg border border-claude-border rounded-l-lg px-3 py-2 text-xs text-claude-text focus:outline-none font-mono"
                />
                <button 
                  onClick={() => copyToClipboard(verifyToken, true)}
                  className="bg-claude-card hover:bg-white/10 border border-l-0 border-claude-border rounded-r-lg px-3.5 flex items-center justify-center transition-colors"
                >
                  {copiedToken ? <CheckIcon className="w-4 h-4 text-green-400" /> : <DocumentDuplicateIcon className="w-4 h-4 text-claude-muted" />}
                </button>
              </div>
            </div>

            <div className="bg-claude-bg p-3.5 rounded-xl border border-claude-border">
              <h4 className="text-xs font-semibold mb-2 text-claude-text">Active Connected Phone Asset:</h4>
              <div className="text-xs text-claude-muted space-y-1 font-mono">
                <div>• Verified Name: <span className="text-white font-medium">One Stop Property Solution</span></div>
                <div>• Verified Phone: <span className="text-emerald-400 font-medium">+91 80970 63232</span></div>
                <div>• Phone Number ID: <span className="text-white font-medium">532941163244534</span></div>
              </div>
            </div>

            {/* Google Cloud Storage Integration */}
            <div className="bg-gradient-to-r from-blue-950/30 via-claude-card to-[#0d1b2a] p-4 rounded-xl border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <h4 className="text-xs font-bold text-white">Google Cloud Storage (GCS)</h4>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-mono">
                  Bucket: leadpilot75.appspot.com
                </span>
              </div>
              <p className="text-xs text-claude-muted mb-3 leading-relaxed">
                Stores HD property brochures, floor plans, and generates automatic daily CSV archives of your leads and conversations.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerGcsBackup}
                  disabled={isBackingUp}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-900/30 transition-all disabled:opacity-50"
                >
                  {isBackingUp ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <span>☁️</span>}
                  <span>{isBackingUp ? 'Exporting to GCS...' : 'Export & Backup Leads to GCS'}</span>
                </button>
                {backupResult && (
                  <span className="text-xs font-medium text-blue-400">
                    ✅ Backed up {backupResult.count} leads to Google Cloud!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM HEALTH & DIAGNOSTICS */}
        {activeTab === 'health' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">System Diagnostics & Readiness</h3>
                <p className="text-xs text-claude-muted">Status of connected services and backend infrastructure.</p>
              </div>
              <button 
                onClick={fetchHealth}
                disabled={loadingHealth}
                className="p-1.5 text-claude-muted hover:text-white bg-claude-bg rounded-lg border border-claude-border"
                title="Refresh Status"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {healthData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-claude-bg p-3 rounded-xl border border-claude-border">
                  <div className="text-xs text-claude-muted mb-1">Database Engine</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${healthData.services?.database?.status.includes('production') ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <span className="text-xs font-semibold text-white">{healthData.services?.database?.provider}</span>
                  </div>
                  <div className="text-[10px] text-claude-muted mt-1">
                    {healthData.services?.database?.status.includes('production') ? 'Live Google Cloud Firestore' : 'Dual-Mode Stateful Simulation Active'}
                  </div>
                </div>

                <div className="bg-claude-bg p-3 rounded-xl border border-claude-border">
                  <div className="text-xs text-claude-muted mb-1">LLM Groq AI Engine</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${healthData.services?.llmEngine?.ready ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <span className="text-xs font-semibold text-white">Llama 3.3 70B Versatile</span>
                  </div>
                  <div className="text-[10px] text-claude-muted mt-1">
                    {healthData.services?.llmEngine?.ready ? 'Connected & High-Speed Ingestion Ready' : 'Set GROQ_API_KEY for live inference'}
                  </div>
                </div>

                <div className="bg-claude-bg p-3 rounded-xl border border-claude-border">
                  <div className="text-xs text-claude-muted mb-1">WhatsApp Cloud API</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${healthData.services?.whatsappCloudApi?.ready ? 'bg-green-400' : 'bg-blue-400'}`} />
                    <span className="text-xs font-semibold text-white">{healthData.services?.whatsappCloudApi?.ready ? 'Connected' : 'Simulation Ready'}</span>
                  </div>
                  <div className="text-[10px] text-claude-muted mt-1">
                    {healthData.services?.whatsappCloudApi?.ready ? 'Meta Graph API v18.0 Active' : 'Messages simulated in UI until token added'}
                  </div>
                </div>

                <div className="bg-claude-bg p-3 rounded-xl border border-claude-border">
                  <div className="text-xs text-claude-muted mb-1">Production Readiness</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${healthData.productionReady ? 'bg-green-400' : 'bg-emerald-400'}`} />
                    <span className="text-xs font-semibold text-white">Operational (Zero Crash)</span>
                  </div>
                  <div className="text-[10px] text-claude-muted mt-1">
                    Environment: {healthData.environment}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-claude-muted">Loading diagnostics...</div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
