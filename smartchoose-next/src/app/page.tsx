import { getHeroProducts, getFeaturedProducts, getLatestBlogs } from '@/lib/db';
import HomeClient from './HomeClient';

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
