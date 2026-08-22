"use client";

import React, { useState, useEffect } from 'react';
import { PowerIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function AiKillswitchButton() {
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setAiEnabled(json.data.aiEnabled !== false);
      }
    } catch (e) {
      console.error('Failed to load AI killswitch status:', e);
    } finally {
      setInitialLoaded(true);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const toggleAi = async () => {
    setLoading(true);
    const nextState = !aiEnabled;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiEnabled: nextState }),
      });
      const json = await res.json();
      if (json.success) {
        setAiEnabled(nextState);
      } else {
        alert('Failed to update AI operation status.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while toggling AI operations.');
    } finally {
      setLoading(false);
    }
  };

  if (!initialLoaded) return null;

  return (
    <button
      type="button"
      onClick={toggleAi}
      disabled={loading}
      title={
        aiEnabled
          ? 'Click to STOP all AI operations (Switch to Manual Human Mode)'
          : 'Click to RESUME 24/7 AI Autopilot'
      }
      className={`relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all shadow-sm ${
        aiEnabled
          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400'
          : 'bg-rose-950/70 border-rose-500/60 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400'
      }`}
    >
      {loading ? (
        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-slate-400" />
      ) : (
        <span className="relative flex h-2 w-2">
          {aiEnabled && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              aiEnabled ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          ></span>
        </span>
      )}

      <span className="flex items-center gap-1.5">
        <PowerIcon className="w-3.5 h-3.5" />
        {aiEnabled ? 'AI Active (24/7 Autopilot)' : 'AI Paused (Manual Mode)'}
      </span>
    </button>
  );
}
