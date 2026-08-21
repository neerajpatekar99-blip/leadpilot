import { NextResponse } from 'next/server';
import { getAgentProfile, updateAgentProfile } from '@/lib/firestore/agent';

export async function GET() {
  try {
    const profile = await getAgentProfile();
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const updates = await req.json();
    const updatedProfile = await updateAgentProfile(updates);
    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
