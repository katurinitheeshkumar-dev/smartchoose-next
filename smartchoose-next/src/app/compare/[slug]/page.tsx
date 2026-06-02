import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  getComparisonBySlug,
  getAllComparisonSlugs,
  firestoreSave,
  searchProductsByKeyword,
  type ComparisonPage,
} from '@/lib/db';
import { hasCommercialIntent, parseComparisonSlug, normalizeCacheKey } from '@/lib/commercial-intent';
import { ComparisonPageView } from '@/sections/ComparisonPage';

// ISR: revalidate every 24h — prices / content stay fresh
export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return await getAllComparisonSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getComparisonBySlug(normalizeCacheKey(slug));
  if (!page) {
    const parsed = parseComparisonSlug(slug);
    const title = parsed ? `${parsed.productA} vs ${parsed.productB} | SmartChoose` : 'Comparison | SmartChoose';
    return { title };
  }

  const baseUrl = 'https://www.smartchoose.in';
  return {
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: `${baseUrl}/compare/${slug}` },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      type: 'article',
      url: `${baseUrl}/compare/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.seoTitle,
      description: page.seoDescription,
    },
  };
}

export default async function CompareSlugPage({ params }: Props) {
  const { slug } = await params;
  const normalizedSlug = normalizeCacheKey(slug);

  // ── 1. Commercial intent check ────────────────────────────────────────────
  const intent = hasCommercialIntent(slug);
  if (!intent.allowed) {
    notFound(); // Return 404 for non-commercial slugs
  }

  // ── 2. Cache-first: serve from DB if available ────────────────────────────
  let page = await getComparisonBySlug(normalizedSlug);

  if (page) {
    // Generate all schemas from cached data
    const baseUrl = 'https://www.smartchoose.in';
    const pageUrl = `${baseUrl}/compare/${slug}`;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
        { '@type': 'ListItem', position: 2, name: 'Compare', item: `${baseUrl}/compare` },
        { '@type': 'ListItem', position: 3, name: page.title, item: pageUrl },
      ],
    };

    const faqSchema = page.faq && page.faq.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    } : null;

    const itemListSchema = page.products && page.products.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: page.title,
      itemListElement: page.products.map((p: any, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          image: p.image,
          offers: {
            '@type': 'Offer',
            price: p.price?.replace(/[^\d.]/g, '') || '0',
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
          },
        },
      })),
    } : null;

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
        {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
        {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
          <ComparisonPageView page={page} />
        </Suspense>
      </>
    );
  }

  // ── 3. Not in DB → Generate on-demand & cache permanently ─────────────────
  const parsed = parseComparisonSlug(slug);
  if (!parsed) notFound();

  // Trigger server-side generation via API
  const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.smartchoose.in';
  try {
    const genRes = await fetch(`${baseAppUrl}/api/generate-comparison`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      cache: 'no-store',
    });

    if (genRes.ok) {
      const result = await genRes.json();
      if (result.success && result.page) {
        page = result.page as ComparisonPage;
      }
    }
  } catch {
    // Generation failed — show 404
  }

  if (!page) notFound();

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="spinner" /></div>}>
      <ComparisonPageView page={page} />
    </Suspense>
  );
}
