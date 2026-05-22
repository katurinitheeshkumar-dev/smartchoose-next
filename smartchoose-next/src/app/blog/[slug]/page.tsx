import { Suspense } from 'react';
import { BlogPostPage } from '@/sections/BlogPostPage';
import { getBlogBySlug, getAllPublishedBlogSlugs } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Revalidate every hour so new blog posts get indexed quickly
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>
};

/**
 * Pre-render ALL published blog posts as static HTML at build time.
 * This ensures Googlebot can instantly crawl and index every post.
 */
export async function generateStaticParams() {
  return await getAllPublishedBlogSlugs();
}


export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | SmartChoose'
    };
  }

  const title = post.seoTitle || `${post.title} | SmartChoose`;
  const description = post.seoDescription || post.intro?.slice(0, 155) || '';
  const image = post.featuredImage || 'https://smartchoose.in/logo.png';

  const baseUrl = 'https://www.smartchoose.in';

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      images: [image],
      type: 'article',
      url: `${baseUrl}/blog/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    }
  };
}

export default async function BlogPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    notFound();
  }

  // Generate JSON-LD Schema
  const baseUrl = 'https://www.smartchoose.in';
  
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': post.type === 'product' ? 'Review' : 'Article',
    headline: post.seoTitle || post.title,
    description: post.seoDescription || post.intro?.slice(0, 155),
    image: post.featuredImage,
    datePublished: post.createdAt,
    dateModified: post.updatedAt || post.createdAt,
    author: {
      '@type': 'Organization',
      name: 'SmartChoose',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'SmartChoose',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${slug}`,
    },
  };

  // Add ItemList Schema for Product Guides
  let itemListSchema = null;
  if (post.products && post.products.length > 0) {
    itemListSchema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: post.products.map((p, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: p.name,
          description: p.description,
          image: p.image,
          offers: {
            '@type': 'Offer',
            price: p.price ? p.price.replace(/[^0-9.]/g, '') : '0',
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
          }
        }
      }))
    };
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {itemListSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
        />
      )}
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
        <BlogPostPage initialPost={post} />
      </Suspense>
    </>
  );
}
