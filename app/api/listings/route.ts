import { NextResponse } from 'next/server';
import { createListing, getListings } from '@/lib/firestore/listings';
import { z } from 'zod';

const listingSchema = z.object({
  title: z.string().min(3),
  price: z.string().min(1),
  type: z.string(),
  locality: z.string(),
  mediaUrls: z.array(z.string()).optional(),
  status: z.enum(['Active', 'Sold', 'Draft']).optional(),
});

export async function GET() {
  try {
    const listings = await getListings();
    return NextResponse.json({ success: true, data: listings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch listings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rawData = await req.json();
    const result = listingSchema.safeParse(rawData);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const newListing = await createListing(result.data);
    return NextResponse.json({ success: true, data: newListing });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create listing' }, { status: 500 });
  }
}
