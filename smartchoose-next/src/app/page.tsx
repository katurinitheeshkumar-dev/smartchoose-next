"use client";

import { Suspense } from 'react';
import { HeroSection } from '@/sections/HeroSection';
import { ProductsSection } from '@/sections/ProductsSection';
import { AboutSection } from '@/sections/AboutSection';
import { BlogSection } from '@/sections/BlogSection';
import { useSearch } from '@/contexts/SearchContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { searchQuery, highlightedProduct } = useSearch();
  const router = useRouter();

  const handleProductClick = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  return (
    <main>
      <Suspense fallback={null}>
        <HeroSection />
        <div id="products-section">
          <ProductsSection
            searchQuery={searchQuery}
            highlightedProduct={highlightedProduct}
            onProductClick={handleProductClick}
          />
        </div>
      </Suspense>
      <Suspense fallback={null}>
        <AboutSection />
        <BlogSection />
      </Suspense>
    </main>
  );
}
