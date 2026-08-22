import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/firestore/leads';
import { exportLeadsToGcs } from '@/lib/storage';

export async function POST() {
  try {
    const leads = await getLeads();
    const backupUrl = await exportLeadsToGcs(leads);

    if (!backupUrl) {
      return NextResponse.json({ error: 'Failed to archive leads to Google Cloud Storage' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      backupUrl,
      leadCount: leads.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating GCS backup:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
