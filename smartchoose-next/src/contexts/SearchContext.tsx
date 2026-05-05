"use client";

import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  highlightedProduct: string | null;
  setHighlightedProduct: (id: string | null) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

function SearchProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Internal state for immediate UI response (avoiding debounce lag in input)
  const [searchQuery, setSearchQueryInternal] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategoryInternal] = useState(searchParams.get('cat') || 'All');
  const [highlightedProduct, setHighlightedProduct] = useState<string | null>(null);

  // Sync internal state with URL params
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('cat') || 'All';
    if (q !== searchQuery) setSearchQueryInternal(q);
    if (cat !== selectedCategory) setSelectedCategoryInternal(cat);
  }, [searchParams]);

  const updateUrl = (q: string, cat: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set('q', q); else params.delete('q');
    if (cat && cat !== 'All') params.set('cat', cat); else params.delete('cat');
    
    // Use replace to avoid cluttering history while typing
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setSearchQuery = (query: string) => {
    setSearchQueryInternal(query);
    updateUrl(query, selectedCategory);
  };

  const setSelectedCategory = (category: string) => {
    setSelectedCategoryInternal(category);
    updateUrl(searchQuery, category);
  };

  return (
    <SearchContext.Provider value={{ 
      searchQuery, 
      setSearchQuery, 
      selectedCategory, 
      setSelectedCategory,
      highlightedProduct, 
      setHighlightedProduct 
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SearchProviderInner>
        {children}
      </SearchProviderInner>
    </Suspense>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within SearchProvider');
  return context;
}
