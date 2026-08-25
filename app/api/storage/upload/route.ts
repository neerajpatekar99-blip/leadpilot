import { NextResponse } from 'next/server';
import { uploadFileToGcs } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawFolder = (formData.get('folder') as string) || 'brochures';
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '') || 'brochures';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Limit maximum upload size to 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds maximum allowed limit (50MB)' }, { status: 413 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destinationPath = `${folder}/${Date.now()}_${safeName}`;

    const url = await uploadFileToGcs(destinationPath, buffer, file.type || 'application/octet-stream');

    if (!url) {
      return NextResponse.json({ error: 'Failed to upload to Google Cloud Storage' }, { status: 500 });
    }

    return NextResponse.json({ success: true, url, fileName: file.name }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading file to GCS:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
