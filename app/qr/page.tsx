"use client";

import React from 'react';
import Link from 'next/link';
import { DeviceLinkQRCard } from '@/components/dashboard/DeviceLinkQRCard';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function WhatsAppConnectPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to CRM Dashboard
          </Link>
          <span className="text-[11px] text-gray-500 font-mono">LeadPilot Live Gateway</span>
        </div>

        <DeviceLinkQRCard />
      </div>
    </div>
  );
}
