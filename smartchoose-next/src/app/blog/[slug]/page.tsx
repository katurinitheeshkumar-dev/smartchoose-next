import { Suspense } from 'react';
import { BlogPostPage } from '@/sections/BlogPostPage';
import { getBlogBySlug } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>
};

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      type: 'article',
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

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <BlogPostPage initialPost={post} />
    </Suspense>
  );
}
