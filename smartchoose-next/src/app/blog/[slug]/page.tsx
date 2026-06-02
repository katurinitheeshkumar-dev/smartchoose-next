import { Suspense } from 'react';
import { BlogPostPage } from '@/sections/BlogPostPage';
import { getBlogBySlug, getAllPublishedBlogSlugs } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>
};

export async function generateStaticParams() {
  return await getAllPublishedBlogSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) return { title: 'Post Not Found | SmartChoose' };

  const title = post.seoTitle || `${post.title} | SmartChoose`;
  const description = post.seoDescription || post.intro?.slice(0, 155) || '';
  const image = post.featuredImage || 'https://smartchoose.in/logo.png';
  const baseUrl = 'https://www.smartchoose.in';

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}/blog/${slug}` },
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
      type: 'article',
      url: `${baseUrl}/blog/${slug}`,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: ['SmartChoose Editorial Team'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) notFound();

  const baseUrl = 'https://www.smartchoose.in';
  const postUrl = `${baseUrl}/blog/${slug}`;

  // ── 1. Article / Review Schema ─────────────────────────────────────────────
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': post.type === 'product' ? 'Review' : 'Article',
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.intro?.slice(0, 155),
    image: post.featuredImage,
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    ...(post.type === 'product' && post.rating && {
      reviewRating: {
        '@type': 'Rating',
        ratingValue: post.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    author: {
      '@type': 'Organization',
      name: 'SmartChoose Editorial Team',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SmartChoose',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
  };

  // ── 2. BreadcrumbList Schema ───────────────────────────────────────────────
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.category, item: `${baseUrl}/blog?category=${encodeURIComponent(post.category)}` },
      { '@type': 'ListItem', position: 4, name: post.title, item: postUrl },
    ],
  };

  // ── 3. Product ItemList Schema ─────────────────────────────────────────────
  const itemListSchema = post.products && post.products.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: post.title,
    description: post.seoDescription,
    numberOfItems: post.products.length,
    itemListElement: post.products.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.description,
        image: p.image,
        ...(p.rating && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.rating,
            bestRating: 5,
            reviewCount: 1,
          },
        }),
        offers: {
          '@type': 'Offer',
          price: p.price ? p.price.replace(/[^\d.]/g, '') : '0',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: p.amazonLink || p.flipkartLink || p.affiliateLink || postUrl,
        },
      },
    })),
  } : null;

  // ── 4. FAQPage Schema ──────────────────────────────────────────────────────
  const faqSchema = post.faq && post.faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  } : null;

  return (
    <>
      {/* Article / Review Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* Breadcrumb Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Product ItemList Schema */}
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}

      {/* FAQ Schema */}
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
        <BlogPostPage initialPost={post} />
      </Suspense>
    </>
  );
}
