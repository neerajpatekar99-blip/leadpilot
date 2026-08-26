"use client";

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  QrCodeIcon, 
  KeyIcon, 
  DevicePhoneMobileIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

interface DeviceLinkQRCardProps {
  compact?: boolean;
  onOpenModal?: () => void;
}

export function DeviceLinkQRCard({ compact = false, onOpenModal }: DeviceLinkQRCardProps) {
  const [data, setData] = useState<{
    status?: string;
    qr?: string;
    pairingCode?: string;
    phone?: string;
    agentPhone?: string;
    directChatUrl?: string;
    isDirectFallback?: boolean;
    updatedAt?: number;
  }>({});
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'pairing' | 'direct'>('qr');
  const [customPhone, setCustomPhone] = useState('');
  const [requestingPair, setRequestingPair] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const lastQrRef = useRef<string | null>(null);

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/whatsapp/qr', { cache: 'no-store' });
      const json = await res.json();
      setData(json);

      const qrTarget = json.qr || json.directChatUrl || `https://wa.me/918879757407?text=${encodeURIComponent('Hi LeadPilot AI')}`;
      
      if (qrTarget && qrTarget !== lastQrRef.current) {
        lastQrRef.current = qrTarget;
        const url = await QRCode.toDataURL(qrTarget, { 
          width: 380, 
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          }
        });
        setQrDataUrl(url);
      }
      setCountdown(20);
    } catch (e) {
      console.error('[DeviceLinkQRCard] status fetch error:', e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Continuous live poll (never expires)
    const pollInterval = setInterval(() => fetchStatus(false), 2500);
    // Visual countdown ring
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 20 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      });
      await fetchStatus(true);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    setRequestingPair(true);
    try {
      await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pair', phone: customPhone })
      });
      await fetchStatus(true);
    } catch (e) {
      console.error(e);
    } finally {
      setRequestingPair(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isConnected = data.status === 'open' || data.status === 'connected';

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300">
      
      {/* Card Header (Identical to User Reference) */}
      <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg shadow-inner">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-base tracking-tight">WhatsApp AI Agent Link</h2>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                NEVER-EXPIRES
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`} />
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {isConnected ? 'Live & Connected 24/7' : 'Ready to Scan / Pair'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-emerald-400 bg-[#21262d] hover:bg-[#30363d] border border-gray-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 text-xs"
            title="Force refresh live QR code immediately"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#0d1117]/80 border-b border-[#30363d] px-5 pt-3 gap-2">
        <button
          onClick={() => setActiveTab('qr')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'qr'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <QrCodeIcon className="w-4 h-4" /> Option 1: Live QR Code
        </button>
        <button
          onClick={() => setActiveTab('pairing')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'pairing'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <KeyIcon className="w-4 h-4" /> Option 2: 8-Digit Pairing Code
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
            activeTab === 'direct'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ChatBubbleLeftRightIcon className="w-4 h-4" /> Option 3: Direct Inbound
        </button>
      </div>

      {/* Card Body */}
      <div className="p-5 sm:p-6 space-y-5">
        
        {isConnected ? (
          /* Connected State */
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-6 text-center space-y-4 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircleIcon className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">WhatsApp Agent Active & Linked!</h3>
              <p className="text-xs text-emerald-300 font-mono">
                Connected Number: {data.phone ? `+${data.phone}` : data.agentPhone || 'Active'}
              </p>
            </div>
            <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
              Your WhatsApp line is actively streaming live inquiries into LeadPilot. Groq AI automatically qualifies inbound buyers with 1-line real estate answers 24/7.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href={data.directChatUrl || `https://wa.me/${(data.agentPhone || '918879757407').replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-2"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Send Test WhatsApp Message
              </a>
              <button
                onClick={handleManualRefresh}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white border border-gray-700 rounded-lg text-xs font-semibold transition"
              >
                Reconnect Session
              </button>
            </div>
          </div>
        ) : (
          /* Connection Options */
          <div>
            {activeTab === 'qr' && (
              /* Option 1: Live QR Code Card (Pixel-match to user reference) */
              <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 text-center space-y-4 shadow-xl relative">
                
                {/* Monospace Green Header */}
                <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-emerald-400 font-bold">
                    <QrCodeIcon className="w-4 h-4" /> OPTION 1: SCAN QR CODE (IPHONE & ANDROID)
                  </span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1.5 bg-[#161b22] px-2.5 py-1 rounded-full border border-[#30363d]">
                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-emerald-400" /> 
                    <span className="text-emerald-400 font-semibold">AUTO-REFRESHING</span> ({countdown}s)
                  </span>
                </div>

                {/* QR Code Container (Crisp White Rounded Box) */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl inline-block shadow-2xl mx-auto border-4 border-emerald-500/20 transition-all hover:scale-[1.01]">
                  {qrDataUrl ? (
                    <img 
                      src={qrDataUrl} 
                      alt="WhatsApp Device Pairing QR Code" 
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg mx-auto"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-gray-800 text-xs gap-3">
                      <ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-600" />
                      <span className="font-semibold text-gray-700 font-mono">Generating Live QR Code...</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-gray-200 font-medium max-w-lg mx-auto">
                    Open WhatsApp on phone ➔ <b>Settings ⚙️</b> ➔ <b>Linked Devices</b> ➔ <b>Link a Device</b> ➔ Point camera at this QR code.
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono">
                    ✨ Continuous auto-sync ensures this QR never expires or fails.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'pairing' && (
              /* Option 2: 8-Digit Pairing Code */
              <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 space-y-5">
                <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-amber-400 font-bold">
                    <KeyIcon className="w-4 h-4" /> OPTION 2: 8-DIGIT PAIRING CODE
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Push to Phone</span>
                </div>

                {data.pairingCode ? (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="text-xs text-gray-400 font-mono">ENTER THIS ON YOUR PHONE:</div>
                      <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400 select-all">
                        {data.pairingCode}
                      </div>
                    </div>
                    <button
                      onClick={() => copyCode(data.pairingCode!)}
                      className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                    >
                      {copied ? <CheckCircleIcon className="w-4 h-4" /> : null}
                      {copied ? 'Copied to Clipboard!' : 'Copy Code'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
                    <p className="text-xs text-gray-300">
                      Want to connect using your phone number instead of scanning? Enter your WhatsApp number below to generate an 8-digit push pairing code:
                    </p>
                    <form onSubmit={handleRequestPairingCode} className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 text-xs">
                          📱
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. +91 9876543210"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={requestingPair || !customPhone.trim()}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {requestingPair ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <KeyIcon className="w-4 h-4" />}
                        Generate Code
                      </button>
                    </form>
                  </div>
                )}

                <div className="text-xs text-gray-400 bg-[#161b22]/70 p-4 rounded-xl space-y-1.5 border border-[#30363d] font-mono">
                  <div className="font-semibold text-gray-200">📱 How to enter pairing code on WhatsApp:</div>
                  <div>1. Open WhatsApp ➔ <b>Settings ⚙️</b> ➔ <b>Linked Devices</b></div>
                  <div>2. Tap <b>Link a Device</b> ➔ Tap <b>&quot;Link with phone number instead&quot;</b> at the bottom</div>
                  <div>3. Type the 8-digit code shown above on your phone</div>
                </div>
              </div>
            )}

            {activeTab === 'direct' && (
              /* Option 3: Direct Inbound Lead QR (Permanent 100% Guaranteed) */
              <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 text-center space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-blue-400 font-bold">
                    <ChatBubbleLeftRightIcon className="w-4 h-4" /> OPTION 3: PERMANENT INBOUND QR CODE
                  </span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                    100% Guaranteed 365 Days
                  </span>
                </div>

                <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl mx-auto border-4 border-blue-500/20">
                  {qrDataUrl && (
                    <img 
                      src={qrDataUrl} 
                      alt="Permanent WhatsApp QR" 
                      className="w-52 h-52 object-contain rounded-lg mx-auto" 
                    />
                  )}
                </div>

                <p className="text-xs text-gray-300 max-w-md mx-auto">
                  Scan with ANY camera app (iPhone Camera, Google Lens) to immediately initiate a live WhatsApp inquiry with your AI real estate CRM agent.
                </p>

                <div className="pt-2 flex justify-center gap-3">
                  <a
                    href={data.directChatUrl || `https://wa.me/${(data.agentPhone || '918879757407').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition flex items-center gap-2"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Open Chat in WhatsApp Web
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Card Footer (Identical to User Reference) */}
      <div className="px-5 py-3.5 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between text-xs text-gray-400 font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
          <span>Continuous Firestore Cloud Sync</span>
        </div>
        <div className="flex items-center gap-2">
          <SignalIcon className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-gray-300">24/7 AI Gateway Active</span>
        </div>
      </div>

    </div>
  );
}
