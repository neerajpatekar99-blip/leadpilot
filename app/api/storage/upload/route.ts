import { NextResponse } from 'next/server';
import { uploadFileToGcs } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'brochures';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
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
