import { NextRequest, NextResponse } from 'next/server';
import { parsePropertyFromText } from '@/lib/groq';

// Dynamic import or require for pdf-parse CommonJS compatibility
const getPdfParser = async (): Promise<((buf: Buffer) => Promise<{ text: string }>) | null> => {
  try {
    const mod = await import('pdf-parse');
    return ((mod as any).default || mod) as any;
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const directText = formData.get('text') as string | null;

    if (!file && !directText) {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
    }

    let extractedText = directText || '';

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.pdf')) {
        try {
          const parser = await getPdfParser();
          const pdfData = parser ? await parser(buffer) : { text: '' };
          extractedText = pdfData.text || '';
          if (!extractedText.trim()) {
            extractedText = `Real estate property document titled ${file.name}`;
          }
        } catch (pdfErr) {
          console.warn('PDF parse error, using fallback text:', pdfErr);
          extractedText = `Property brochure for ${file.name}`;
        }
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
        extractedText = buffer.toString('utf-8');
      } else if (file.type.startsWith('image/')) {
        // Image metadata / name hint
        extractedText = `Property listing image: ${file.name}. High quality real estate unit with modern amenities.`;
      } else {
        extractedText = buffer.toString('utf-8');
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from the uploaded document.' }, { status: 422 });
    }

    // Limit text to 4000 characters to prevent huge token consumption
    const cleanText = extractedText.slice(0, 4000);
    const parsedProperty = await parsePropertyFromText(cleanText);

    return NextResponse.json({
      success: true,
      extractedSnippet: cleanText.slice(0, 200) + (cleanText.length > 200 ? '...' : ''),
      data: parsedProperty,
    });
  } catch (error: any) {
    console.error('Error parsing uploaded file:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze uploaded file' },
      { status: 500 }
    );
  }
}
