import { NextResponse } from 'next/server';
import { getLeads, createLead } from '@/lib/firestore/leads';
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string(),
  status: z.enum(['new', 'contacted', 'replied', 'qualified', 'site_visit', 'negotiation', 'closed']).optional(),
});

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
    const rawData = await request.json();
    const result = leadSchema.safeParse(rawData);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const newLead = await createLead(result.data as any);
    return NextResponse.json({ success: true, data: newLead });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 });
  }
}
