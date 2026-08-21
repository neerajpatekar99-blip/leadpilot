import { NextResponse } from 'next/server';
import { isFirebaseConfigured } from '@/lib/firebase-admin';

export async function GET() {
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'dummy');
  const hasWhatsApp = Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  const hasFacebookSecret = Boolean(process.env.FACEBOOK_APP_SECRET);
  const isFirebaseLive = isFirebaseConfigured();

  const services = {
    database: {
      status: isFirebaseLive ? 'connected_production' : 'simulated_local_mode',
      provider: isFirebaseLive ? 'Google Cloud Firestore' : 'High-Performance Local Memory',
      ready: true,
    },
    llmEngine: {
      status: hasGroq ? 'active' : 'api_key_required',
      model: 'llama-3.3-70b-versatile via Groq',
      ready: hasGroq,
    },
    whatsappCloudApi: {
      status: hasWhatsApp ? 'configured' : 'mock_simulation_ready',
      ready: hasWhatsApp,
    },
    metaWebhooks: {
      status: hasFacebookSecret ? 'secured' : 'open_development_mode',
      ready: true,
    }
  };

  const isProductionReady = isFirebaseLive && hasGroq && hasWhatsApp;

  return NextResponse.json({
    status: 'healthy',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    productionReady: isProductionReady,
    services,
  });
}
