"use client";

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  XMarkIcon, 
  ArrowPathIcon, 
  CheckCircleIcon, 
  QrCodeIcon, 
  KeyIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppConnectModal({ isOpen, onClose }: Props) {
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
      console.error(e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus();
    const pollInterval = setInterval(() => fetchStatus(false), 2500);
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 20 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transition-all">
        
        {/* Modal Header (Pixel match with user screenshot) */}
        <div className="px-6 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-base">WhatsApp AI Agent Link</h2>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold">
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
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#0d1117]/90 border-b border-[#30363d] px-6 pt-2.5 gap-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'qr'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <QrCodeIcon className="w-4 h-4" /> Option 1: Live QR
          </button>
          <button
            onClick={() => setActiveTab('pairing')}
            className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'pairing'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyIcon className="w-4 h-4" /> Option 2: Pairing Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {isConnected ? (
            /* Connected State */
            <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-6 text-center space-y-3">
              <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-bold text-white">WhatsApp Agent Active!</h3>
              <p className="text-xs text-gray-300 max-w-sm mx-auto">
                Your WhatsApp number is actively connected to the Groq AI qualification engine. Inbound buyer inquiries will receive instant 1-line real estate responses automatically.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={handleManualRefresh}
                  className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition"
                >
                  Force Reconnect
                </button>
              </div>
            </div>
          ) : (
            /* Connection Content */
            <div>
              {activeTab === 'qr' && (
                /* Option 1: Live QR Code (Pixel match to reference) */
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 text-center space-y-3.5">
                  <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <QrCodeIcon className="w-4 h-4" /> OPTION 1: SCAN QR CODE (IPHONE & ANDROID)
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <ArrowPathIcon className="w-3 h-3 animate-spin text-emerald-400" /> AUTO-REFRESHING ({countdown}s)
                    </span>
                  </div>

                  <div className="flex justify-center p-4 bg-white rounded-xl inline-block shadow-2xl mx-auto border-2 border-emerald-500/20">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56 rounded object-contain mx-auto" />
                    ) : (
                      <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-800 text-xs gap-2">
                        <ArrowPathIcon className="w-6 h-6 animate-spin text-emerald-600" />
                        <span className="font-semibold">Generating live QR...</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-300 font-medium">
                    Open WhatsApp on phone ➔ <b>Settings ⚙️</b> ➔ <b>Linked Devices</b> ➔ <b>Link a Device</b> ➔ Point camera at this QR code.
                  </p>
                </div>
              )}

              {activeTab === 'pairing' && (
                /* Option 2: 8-Digit Pairing Code */
                <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
                  <div className="text-xs text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold">
                    <KeyIcon className="w-4 h-4" /> OPTION 2: 8-DIGIT PAIRING CODE
                  </div>

                  {data.pairingCode ? (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-gray-400 font-mono">LIVE PAIRING CODE:</div>
                        <div className="text-3xl font-mono font-bold tracking-widest text-emerald-400 select-all">
                          {data.pairingCode}
                        </div>
                      </div>
                      <button
                        onClick={() => copyCode(data.pairingCode!)}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
                      >
                        {copied ? '✓ Copied' : 'Copy Code'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRequestPairingCode} className="space-y-3">
                      <p className="text-xs text-gray-300">
                        Enter your WhatsApp number to request an 8-digit push notification pairing code:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. +91 9876543210"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="submit"
                          disabled={requestingPair || !customPhone.trim()}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                        >
                          {requestingPair ? 'Requesting...' : 'Get Code'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="text-[11px] text-gray-400 bg-[#161b22]/70 p-3 rounded-lg space-y-1 font-mono">
                    <div>1. WhatsApp ➔ Settings ⚙️ ➔ Linked Devices</div>
                    <div>2. Link a Device ➔ Link with phone number instead</div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer (Pixel match with user screenshot) */}
        <div className="px-6 py-3.5 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5 font-mono">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            <span>Continuous Firestore Cloud Sync</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#21262d] text-white hover:bg-[#30363d] transition font-medium text-xs border border-gray-700"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
