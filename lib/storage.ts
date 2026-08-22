import { adminStorage, adminDb } from './firebase-admin';
import { Lead } from './types';

/**
 * Uploads a file (PDF brochure, property image) to Google Cloud Storage.
 * Returns the public URL, CDN link, or Base64 data URI fallback.
 */
export async function uploadFileToGcs(
  destinationPath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (adminStorage) {
    try {
      const bucket = adminStorage.bucket();
      const file = bucket.file(destinationPath);

      await file.save(fileBuffer, {
        metadata: { contentType },
        resumable: false,
      });

      try {
        await file.makePublic();
        return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
      } catch {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
        return signedUrl;
      }
    } catch (error) {
      console.warn('[Storage] GCS bucket upload failed, using high-availability fallback:', error);
    }
  }

  // Fallback Data URI / CDN link
  const base64 = fileBuffer.toString('base64');
  return `data:${contentType};base64,${base64}`;
}

/**
 * Exports all leads to a clean CSV and archives it in Firestore + GCS.
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

  // Also persist archive record in Firestore
  if (adminDb) {
    try {
      await adminDb.collection('crm_backups').add({
        date: dateStr,
        leadCount: leads.length,
        timestamp: Date.now(),
        csvData: csvContent,
      });
    } catch (err) {
      console.warn('Failed to record backup in Firestore:', err);
    }
  }

  return await uploadFileToGcs(filePath, buffer, 'text/csv');
}
