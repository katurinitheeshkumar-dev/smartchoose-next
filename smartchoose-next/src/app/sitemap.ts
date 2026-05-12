import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE_URL = 'https://www.smartchoose.in';
  const FIREBASE_PROJECT_ID = 'smartchoose-official';

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/returns`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/disclosure`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  try {
    // 1. Fetch Products
    const productsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/products?pageSize=1000`,
      { next: { revalidate: 3600 } }
    );
    const productsData = await productsRes.json();
    const productPages: MetadataRoute.Sitemap = (productsData.documents || [])
      .map((doc: any) => {
        const id = doc.name.split('/').pop();
        const fields = doc.fields || {};
        const published = fields.published?.booleanValue ?? false;
        if (!published) return null;
        return {
          url: `${SITE_URL}/product/${id}`,
          lastModified: fields.updatedAt?.timestampValue ? new Date(fields.updatedAt.timestampValue) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    // 2. Fetch Blog Posts
    const blogsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/blogPosts?pageSize=1000`,
      { next: { revalidate: 3600 } }
    );
    const blogsData = await blogsRes.json();
    const blogPages: MetadataRoute.Sitemap = (blogsData.documents || [])
      .map((doc: any) => {
        const fields = doc.fields || {};
        const status = fields.status?.stringValue;
        const slug = fields.slug?.stringValue;
        if (status !== 'published' || !slug) return null;
        return {
          url: `${SITE_URL}/blog/${slug}`,
          lastModified: fields.updatedAt?.timestampValue ? new Date(fields.updatedAt.timestampValue) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    // 3. Fetch Jobs
    const jobsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/jobs?pageSize=1000`,
      { next: { revalidate: 3600 } }
    );
    const jobsData = await jobsRes.json();
    const jobPages: MetadataRoute.Sitemap = (jobsData.documents || [])
      .map((doc: any) => {
        const id = doc.name.split('/').pop();
        const fields = doc.fields || {};
        // Assuming jobs don't have a published flag or it's always true for active jobs
        return {
          url: `${SITE_URL}/jobs/${id}`,
          lastModified: fields.postedAt?.timestampValue ? new Date(fields.postedAt.timestampValue) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;

    return [...staticPages, ...productPages, ...blogPages, ...jobPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
