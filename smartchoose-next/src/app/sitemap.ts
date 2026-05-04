import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = 'https://smartchoose.in';
  const FIREBASE_PROJECT_ID = 'smartchoose-official';

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products?mask.fieldPaths=published&pageSize=1000`,
      { next: { revalidate: 3600 } }
    );
    const data = await response.json();
    const productPages: MetadataRoute.Sitemap = (data.documents || [])
      .map((doc: any) => {
        const id = doc.name.split('/').pop();
        const published = doc.fields?.published?.booleanValue ?? false;
        if (!published) return null;
        return {
          url: `${SITE_URL}/product/${id}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    return [...staticPages, ...productPages];
  } catch (error) {
    return staticPages;
  }
}
