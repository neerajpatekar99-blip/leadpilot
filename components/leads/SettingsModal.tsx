import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Copy, Check } from 'lucide-react';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const webhookUrl = 'https://your-production-url.vercel.app/api/integrations/facebook';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Integrations & Settings">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-serif font-medium mb-2 text-claude-text">Facebook Lead Ads Webhook</h3>
          <p className="text-sm text-claude-muted">
            Connect your Facebook Lead forms directly to LeadPilot. New leads will automatically receive a WhatsApp greeting.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-claude-muted mb-1">Webhook URL</label>
          <div className="flex">
            <input 
              type="text" 
              readOnly 
              value={webhookUrl}
              className="flex-1 bg-claude-bg border border-claude-border rounded-l-lg px-3 py-2 text-sm text-claude-text focus:outline-none"
            />
            <button 
              onClick={copyToClipboard}
              className="bg-claude-card hover:bg-gray-50 border border-l-0 border-claude-border rounded-r-lg px-4 flex items-center justify-center transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-claude-muted" />}
            </button>
          </div>
        </div>

        <div className="bg-claude-bg p-4 rounded-lg border border-claude-border">
          <h4 className="text-sm font-semibold mb-3 text-claude-text">Setup Instructions</h4>
          <ol className="list-decimal list-inside text-sm text-claude-muted space-y-2">
            <li>Go to Meta Business Suite &gt; All Tools &gt; Events Manager.</li>
            <li>Select your Data Source and click &apos;Settings&apos;.</li>
            <li>Under &apos;Webhooks&apos;, click &apos;Set up&apos; or &apos;Edit&apos;.</li>
            <li>Paste the Webhook URL above.</li>
            <li>Enter your <strong>Verify Token</strong> (from your <code>.env.local</code>).</li>
            <li>Subscribe to the <strong>leadgen</strong> event field.</li>
          </ol>
        </div>
      </div>
    </Modal>
  );
}
