import type { Metadata } from 'next';
import { getHeroProducts, getFeaturedProducts, getLatestBlogs } from '@/lib/db';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'SmartChoose - India\'s Product Discovery & Price Comparison Platform',
  description: 'SmartChoose independently researches and curates the best products in India. Compare prices across Amazon, Flipkart and more. Find the best deals — free, unbiased, and trusted by 50,000+ shoppers.',
  alternates: {
    canonical: '/',
  },
};

/**
 * SMARTCHOOSE HOME PAGE (Server Component)
 * Optimized for LCP < 2s and maximum PageSpeed score.
 */
export default async function Home() {
  // Parallel data fetching on the server
  const [heroProducts, featuredProducts, latestBlogs] = await Promise.all([
    getHeroProducts(),
    getFeaturedProducts(12),
    getLatestBlogs(4)
  ]);

  return (
    <HomeClient 
      initialHeroProducts={heroProducts}
      initialFeaturedProducts={featuredProducts}
      initialBlogs={latestBlogs}
    />
  );
}
