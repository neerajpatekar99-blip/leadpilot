import { NextResponse } from 'next/server';
import { getLeads, createLead } from '@/lib/firestore/leads';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');

    let leads = await getLeads();

    if (status) {
      leads = leads.filter(lead => lead.status === status);
    }
    
    if (source) {
      leads = leads.filter(lead => lead.source === source);
    }

    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newLead = await createLead(data);
    return NextResponse.json({ success: true, data: newLead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 });
  }
}
