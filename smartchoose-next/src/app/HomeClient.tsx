"use client";

import { Suspense } from 'react';
import { HeroSection } from '@/sections/HeroSection';
import { ProductsSection } from '@/sections/ProductsSection';
import { AboutSection } from '@/sections/AboutSection';
import { BlogSection } from '@/sections/BlogSection';
import { useSearch } from '@/contexts/SearchContext';
import { useRouter } from 'next/navigation';
import type { Product, BlogPost } from '@/types';

interface HomeClientProps {
  initialHeroProducts: Product[];
  initialFeaturedProducts: Product[];
  initialBlogs: BlogPost[];
}

export default function HomeClient({ 
  initialHeroProducts, 
  initialFeaturedProducts,
  initialBlogs 
}: HomeClientProps) {
  const { searchQuery, highlightedProduct } = useSearch();
  const router = useRouter();

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  return (
    <main>
      <Suspense fallback={<div className="h-[600px] bg-slate-50 animate-pulse" />}>
        <HeroSection initialProducts={initialHeroProducts} />
        <div id="products-section">
          <ProductsSection
            initialProducts={initialFeaturedProducts}
            searchQuery={searchQuery}
            highlightedProduct={highlightedProduct}
            onProductClick={handleProductClick}
          />
        </div>
      </Suspense>
      <Suspense fallback={null}>
        <AboutSection />
        <BlogSection initialBlogs={initialBlogs} />
      </Suspense>
    </main>
  );
}
