import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import type { Product } from '@/types';
import { algoliasearch } from 'algoliasearch';

const ALGOLIA_APP_ID = "P0Z3D6UVHU";
const ALGOLIA_SEARCH_KEY = "e35a248fd899d0140303755dbc36adff";

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

interface SearchDropdownProps {
  query: string;
  products: Product[];
  blogPosts: any[];
  onSelect: (id: string, type: 'product' | 'blog') => void;
  priorityView?: 'product' | 'blog';
}

export default function SearchDropdown({
  query,
  products,
  blogPosts,
  onSelect,
  priorityView = 'product'
}: SearchDropdownProps) {
  const [algoliaProducts, setAlgoliaProducts] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const publishedProducts = products.filter(p => p.published);
  const publishedBlogs = (blogPosts || []).filter(b => b.status === 'published');

  useEffect(() => {
    const fetchAlgolia = async () => {
      if (!query.trim() || !searchClient) {
        setAlgoliaProducts([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await searchClient.search({
          requests: [
            {
              indexName: 'products',
              query: query,
              hitsPerPage: 5
            }
          ]
        });
        setAlgoliaProducts((response.results[0] as any).hits || []);
      } catch (err) {
        console.error('Algolia search error:', err);
      } finally {
        setIsSearching(false);
      }
    };
    
    fetchAlgolia();
  }, [query]);

  if (!query.trim()) {
    return null; // Don't show anything on empty query to match Amazon style
  }

  const q = query.toLowerCase();
  
  // Use Algolia results if available and searchClient exists, otherwise fallback to local filter
  const matchedProducts = searchClient 
    ? algoliaProducts 
    : publishedProducts
        .filter(p => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        .slice(0, 5);
  
  const matchedBlogs = publishedBlogs
    .filter(b => b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || (b.tags || []).some((tag: string) => tag.toLowerCase().includes(q)))
    .slice(0, 5);

  if (isSearching) {
    return (
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="search-dropdown p-8 text-center">
        <Icon name="loader-2" size={32} className="mx-auto text-emerald-500 mb-2 animate-spin" />
        <p className="text-slate-500 font-medium">Searching...</p>
      </m.div>
    );
  }

  if (matchedProducts.length === 0 && matchedBlogs.length === 0) {
    return (
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="search-dropdown p-8 text-center">
        <Icon name="search-x" size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 font-medium">No results for "{query}"</p>
      </m.div>
    );
  }

  const renderMatchedProducts = () => (
    matchedProducts.length > 0 && (
      <div className="border-b border-slate-100 pb-2">
        <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Product Suggestions
        </div>
        {matchedProducts.map(product => (
          <button
            key={product.id}
            onClick={() => onSelect(product.id, 'product')}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left"
          >
            <Icon name="search" size={14} className="text-slate-300" />
            <span className="text-sm font-medium text-slate-700 truncate">{product.title}</span>
          </button>
        ))}
      </div>
    )
  );

  const renderMatchedBlogs = () => (
    matchedBlogs.length > 0 && (
      <div>
        <div className="px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50/50">
          Articles ({matchedBlogs.length})
        </div>
        {matchedBlogs.map(post => (
          <button
            key={post.id}
            onClick={() => onSelect(post.slug, 'blog')}
            className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-[10px]">BLOG</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{post.title}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{post.category}</p>
            </div>
          </button>
        ))}
      </div>
    )
  );

  return (
    <m.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="search-dropdown overflow-hidden"
    >
      {priorityView === 'blog' ? (
        <>
          {renderMatchedBlogs()}
          {renderMatchedProducts()}
        </>
      ) : (
        <>
          {renderMatchedProducts()}
          {renderMatchedBlogs()}
        </>
      )}
    </m.div>
  );
}
