import { NextResponse } from 'next/server';
import { getLeads } from '@/lib/firestore/leads';
import { matchPropertyWithLeads } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const { propertyDescription } = await req.json();

    if (!propertyDescription) {
      return NextResponse.json({ success: false, error: 'Missing propertyDescription' }, { status: 400 });
    }

    const leads = await getLeads();
    // Only pass leads that have some data
    const validLeads = leads.filter(l => l.leadScore !== 'Unscored' || l.budget || l.locality);
    
    if (validLeads.length === 0) {
      return NextResponse.json({ success: true, matchedLeads: [] });
    }

    const matchedLeadIds = await matchPropertyWithLeads(propertyDescription, validLeads);

    const matchedLeads = leads.filter(l => matchedLeadIds.includes(l.id));

    return NextResponse.json({ success: true, matchedLeads });
  } catch (error: unknown) {
    console.error('Error matching property:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
