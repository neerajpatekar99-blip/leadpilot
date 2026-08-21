import { NextResponse } from 'next/server';
import { parsePropertyFromText } from '@/lib/groq';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Please provide property text to parse' }, { status: 400 });
    }

    try {
      const parsedData = await parsePropertyFromText(text);
      return NextResponse.json({ success: true, data: parsedData });
    } catch (aiError) {
      // Fallback heuristic parsing if Groq is unavailable
      console.warn('AI Parsing fallback triggered:', aiError);
      
      const clean = text.toLowerCase();
      let propertyType = '3BHK';
      if (clean.includes('1bhk') || clean.includes('1 bhk')) propertyType = '1BHK';
      else if (clean.includes('2bhk') || clean.includes('2 bhk')) propertyType = '2BHK';
      else if (clean.includes('4bhk') || clean.includes('4 bhk')) propertyType = '4BHK';
      else if (clean.includes('villa')) propertyType = 'villa';
      else if (clean.includes('plot')) propertyType = 'plot';
      else if (clean.includes('office')) propertyType = 'office';
      else if (clean.includes('shop')) propertyType = 'shop';

      return NextResponse.json({
        success: true,
        data: {
          title: text.slice(0, 40) + '...',
          propertyType,
          locality: 'Bangalore',
          priceMin: 10000000,
          priceMax: 12000000,
          areaSqft: 1500,
          amenities: ['Power Backup', 'Security', 'Parking'],
          description: text.slice(0, 200),
        }
      });
    }
  } catch (error: any) {
    console.error('Property parse route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
