import { adminStorage } from './firebase-admin';
import { Lead } from './types';

/**
 * Uploads a file (PDF brochure, property image) to Google Cloud Storage.
 * Returns the public URL or signed CDN link.
 */
export async function uploadFileToGcs(
  destinationPath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!adminStorage) {
    console.warn('[Storage] Google Cloud Storage not initialized. Mocking upload path.');
    return `https://storage.googleapis.com/leadpilot75.appspot.com/${destinationPath}`;
  }

  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(destinationPath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
      },
      resumable: false,
    });

    // Make public or generate a 1-year signed URL for high security
    try {
      await file.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
    } catch {
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      return signedUrl;
    }
  } catch (error) {
    console.error('[Storage] Error uploading to Google Cloud Storage:', error);
    return null;
  }
}

/**
 * Exports all leads to a clean CSV and archives it in Google Cloud Storage.
 */
export async function exportLeadsToGcs(leads: Lead[]): Promise<string | null> {
  const headers = ['ID', 'Name', 'Phone', 'Source', 'Status', 'LeadScore', 'Budget', 'Locality', 'CreatedDate'];
  const rows = leads.map(l => [
    l.id,
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.phone}"`,
    l.source,
    l.status,
    l.leadScore || 'Unscored',
    `"${l.budget || ''}"`,
    `"${l.locality || ''}"`,
    new Date(l.createdAt).toISOString(),
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const buffer = Buffer.from(csvContent, 'utf-8');
  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = `backups/leads_backup_${dateStr}_${Date.now()}.csv`;

  return await uploadFileToGcs(filePath, buffer, 'text/csv');
}
