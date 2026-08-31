import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://onestoppropertysolution.in';
  const currentDate = new Date();

  // Core Pages
  const routes = [
    '',
    '/dashboard',
    '/dashboard/properties',
    '/qr',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Hyperlocal Kamothe Sector Pages
  const kamotheSectors = Array.from({ length: 36 }, (_, i) => ({
    url: `${baseUrl}/kamothe/sector-${i + 1}-properties`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [...routes, ...kamotheSectors];
}
