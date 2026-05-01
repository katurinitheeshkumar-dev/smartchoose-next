"use client";

import React, { createContext, useContext, useState } from 'react';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  highlightedProduct: string | null;
  setHighlightedProduct: (id: string | null) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedProduct, setHighlightedProduct] = useState<string | null>(null);

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery, highlightedProduct, setHighlightedProduct }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within SearchProvider');
  return context;
}
