import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import type { Product } from '@/types';
import { algoliasearch } from 'algoliasearch';

const searchClient = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
  ? algoliasearch(process.env.NEXT_PUBLIC_ALGOLIA_APP_ID, process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY)
  : null;

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
        const { results } = await searchClient.search([
          {
            indexName: 'products',
            query: query,
            params: { hitsPerPage: 5 }
          }
        ]);
        setAlgoliaProducts(results[0].hits as any[]);
      } catch (err) {
        console.error('Algolia search error:', err);
      } finally {
        setIsSearching(false);
      }
    };
    
    fetchAlgolia();
  }, [query]);

  if (!query.trim()) {
    const featuredProducts = priorityView === 'blog' ? publishedProducts.slice(0, 2) : publishedProducts.slice(0, 4);
    const featuredBlogs = priorityView === 'blog' ? publishedBlogs.slice(0, 4) : publishedBlogs.slice(0, 2);

    if (featuredProducts.length === 0 && featuredBlogs.length === 0) return null;

    const renderProducts = () => (
      featuredProducts.length > 0 && (
        <div>
          <div className="px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
            Trending Products
          </div>
          {featuredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => onSelect(product.id, 'product')}
              className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 text-left"
            >
              <img src={product.images?.[0]} alt={product.title} width="40" height="40" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{product.title}</p>
                <p className="text-xs text-emerald-600 font-bold">{product.price}</p>
              </div>
            </button>
          ))}
        </div>
      )
    );

    const renderBlogs = () => (
      featuredBlogs.length > 0 && (
        <div>
          <div className="px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100">
            Featured Articles
          </div>
          {featuredBlogs.map(post => (
            <button
              key={post.id}
              onClick={() => onSelect(post.slug, 'blog')}
              className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <Icon name="file-text" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{post.title}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{post.category}</p>
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
            {renderBlogs()}
            {renderProducts()}
          </>
        ) : (
          <>
            {renderProducts()}
            {renderBlogs()}
          </>
        )}
      </m.div>
    );
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
      <div className="border-b border-slate-100">
        <div className="px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50/50">
          Products ({matchedProducts.length})
        </div>
        {matchedProducts.map(product => (
          <button
            key={product.id}
            onClick={() => onSelect(product.id, 'product')}
            className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 text-left"
          >
            <img src={product.images?.[0]} alt={product.title} width="40" height="40" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{product.title}</p>
              <p className="text-xs text-emerald-600 font-bold">{product.category} • {product.price}</p>
            </div>
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
