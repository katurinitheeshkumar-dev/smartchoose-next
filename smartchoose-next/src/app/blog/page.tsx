import { Suspense } from 'react';
import { BlogListingPage } from '@/sections/BlogListingPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Expert Buying Guides & Reviews | SmartChoose Blog',
  description: 'Read our professional buying guides, product reviews, and expert shopping tips to make smarter choices.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <BlogListingPage />
    </Suspense>
  );
}
