import { useState, useMemo, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { ProductCard, ProductSkeleton } from './ProductCard';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPopup } from '@/components/ui/custom/NotificationPopup';
import { useSearch } from '@/contexts/SearchContext';
import { algoliasearch } from 'algoliasearch';

const ALGOLIA_APP_ID = "P0Z3D6UVHU";
const ALGOLIA_SEARCH_KEY = "e35a248fd899d0140303755dbc36adff";
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

interface ProductsSectionProps {
  searchQuery: string;
  highlightedProduct: string | null;
  onProductClick: (productId: string) => void;
}

const CATEGORIES = [
  'All',
  'Smartphones & Accessories',
  'Laptops & Computers',
  'Home Appliances',
  'Audio & Headphones',
  'Smartwatches & Wearables',
  'Gaming',
  'Cameras & Photography',
  'Personal Care',
  'Home & Kitchen',
];

const PRODUCTS_PER_PAGE = 12;

export function ProductsSection({
  initialProducts = [],
  searchQuery,
  highlightedProduct,
  onProductClick
}: ProductsSectionProps & { initialProducts?: any[] }) {
  const { selectedCategory, setSelectedCategory } = useSearch();
  const { isProductsLoading: contextLoading } = useDatabase();
  const [localProducts, setLocalProducts] = useState<any[]>(initialProducts);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(initialProducts.length === 0);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const observerTarget = useRef<HTMLDivElement>(null);
  // Track if we've done the initial load — prevents wiping server-provided initialProducts
  const initialLoadDone = useRef(initialProducts.length > 0);

  const { isSubscribed, subscribe, loading, isDismissed, dismiss } = useNotifications('products');

  const categories = CATEGORIES;

  const filteredProducts = useMemo(() => {
    if (!localProducts || !Array.isArray(localProducts)) return [];

    if (!searchQuery) {
      return localProducts.filter(p => p && p.published && (selectedCategory === 'All' || p.category === selectedCategory));
    }

    // When searchQuery is present, localProducts comes from Algolia which already did the text search.
    // We only need to apply the category filter.
    return localProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesCategory && (product.published !== false); // Algolia might not return boolean published field properly, assume true if it's in algolia index
    });
  }, [localProducts, selectedCategory, searchQuery]);

  // Firestore REST Fetch Function
  const fetchProducts = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setIsBatchLoading(true);
      else if (localProducts.length === 0) setIsInitialLoading(true);

      const PROJECT_ID = 'smartchoose-official';
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
      
      const filters: any[] = [{
        fieldFilter: {
          field: { fieldPath: 'published' },
          op: 'EQUAL',
          value: { booleanValue: true },
        }
      }];

      if (selectedCategory !== 'All') {
        filters.push({
          fieldFilter: {
            field: { fieldPath: 'category' },
            op: 'EQUAL',
            value: { stringValue: selectedCategory },
          }
        });
      }

      const structuredQuery: any = {
        from: [{ collectionId: 'products' }],
        where: filters.length === 1 ? filters[0] : {
          compositeFilter: {
            op: 'AND',
            filters: filters,
          }
        },
        limit: 100, // Fetch up to 100 to sort client-side without indexes
      };

      // Note: Infinite scroll pagination with REST API is complex without orderBy.
      // For now, we fetch the first batch. Real pagination would need orderBy and startAt.
      // But we removed orderBy to avoid index issues. 
      // We will rely on Algolia for more complex browsing if needed.

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery }),
      });

      if (!res.ok) throw new Error(`Firestore REST failed: ${res.status}`);
      
      const data = await res.json();
      const docs = (data || [])
        .filter((item: any) => item.document)
        .map((item: any) => {
          const fields = item.document.fields || {};
          const result: any = { id: item.document.name.split('/').pop() };
          
          // Basic parser for needed fields
          for (const [k, v] of Object.entries(fields)) {
            const val: any = v;
            if ('stringValue' in val) result[k] = val.stringValue;
            else if ('integerValue' in val) result[k] = Number(val.integerValue);
            else if ('doubleValue' in val) result[k] = val.doubleValue;
            else if ('booleanValue' in val) result[k] = val.booleanValue;
            else if ('arrayValue' in val) result[k] = (val.arrayValue.values || []).map((av: any) => av.stringValue || av.mapValue);
          }
          return result;
        });

      // Sort by newest first
      if (Array.isArray(docs)) {
        docs.sort((a: any, b: any) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
      }

      const currentIds = new Set(localProducts.map(p => p.id));
      const newDocs = docs.filter((d: any) => !currentIds.has(d.id));

      if (docs.length < PRODUCTS_PER_PAGE || (isLoadMore && newDocs.length === 0)) {
        setHasMore(false);
      }

      if (isLoadMore) {
        setLocalProducts(prev => [...prev, ...newDocs]);
      } else {
        setLocalProducts(docs);
      }

    } catch (error) {
      console.error("Error fetching products via REST:", error);
      setHasMore(false);
    } finally {
      setIsBatchLoading(false);
      setIsInitialLoading(false);
    }
  };

  // Search logic via Algolia
  useEffect(() => {
    if (searchQuery) {
      setIsInitialLoading(true);
      searchClient.search({
        requests: [
          {
            indexName: 'products',
            query: searchQuery,
            hitsPerPage: 50
          }
        ]
      }).then((response: any) => {
        const hits = response.results[0].hits || [];
        const mappedHits = hits.map((hit: any) => ({ ...hit, id: hit.objectID || hit.id }));
        setLocalProducts(mappedHits);
        setHasMore(false);
      }).catch(err => {
        console.error('Algolia product search error:', err);
      }).finally(() => {
        setIsInitialLoading(false);
      });
    } else if (!initialLoadDone.current) {
      // Revert to initial products if search cleared and we aren't switching categories
      setLocalProducts(initialProducts);
      setHasMore(true);
    }
  }, [searchQuery]);


  // Category Change (Reset)
  useEffect(() => {
    // Skip the very first run if we already have server-provided products
    if (initialLoadDone.current) {
      initialLoadDone.current = false; // Allow future category changes to fetch
      return;
    }
    
    setLocalProducts([]);
    setLastDoc(null);
    setHasMore(true);
    fetchProducts(false);
  }, [selectedCategory]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isBatchLoading && !isInitialLoading && hasMore) {
          fetchProducts(true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isBatchLoading, isInitialLoading, lastDoc]);

  // Scroll to products when searching
  useEffect(() => {
    if (searchQuery && filteredProducts.length > 0) {
      const element = document.getElementById('products-section');
      if (element) {
        // Changed to 'instant' as per user feedback to remove annoying scroll animation
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
  }, [searchQuery, filteredProducts.length]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
  };

  // Listen for category filter events from Hero
  useEffect(() => {
    const handleFilter = (e: any) => {
      if (e.detail) {
        setSelectedCategory(e.detail.charAt(0).toUpperCase() + e.detail.slice(1));
      }
    };
    window.addEventListener('filter-category', handleFilter);
    return () => window.removeEventListener('filter-category', handleFilter);
  }, []);

  return (
    <section id="products-section" className="py-16 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-bold mb-4 uppercase tracking-wider">
              <Icon name="sparkles" size={12} />
              Curated Collection
            </div>
            <h2 id="products-section" className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 leading-tight tracking-tight">
              Featured <br className="sm:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Deals</span>
            </h2>
          </div>
        </div>

        {/* Product Notifications Popup */}
        <NotificationPopup
          show={!isSubscribed && !isDismissed}
          onClose={dismiss}
          onSubscribe={async () => {
            const success = await subscribe();
            if (success) {
              alert('System: Product alerts turned on!');
              dismiss();
            }
          }}
          loading={loading}
          title="New Product Alerts!"
          description="Get notified the moment we upload premium products and exclusive deals."
          color="blue"
        />

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {isInitialLoading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : (
            <>
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    fetchPriority: index < 4 ? 'high' : 'auto'
                  }}
                  highlighted={highlightedProduct === product.id}
                  onCopy={() => showToast('Link copied to clipboard!')}
                  onClick={() => onProductClick(product.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Sentinel for Infinite Scroll */}
        {!isInitialLoading && hasMore && (
          <div 
            ref={observerTarget} 
            className="h-32 flex items-center justify-center mt-8"
          >
            {isBatchLoading && (
               <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Icon name="loader-2" size={28} className="animate-spin text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Syncing Feed...</span>
               </div>
            )}
          </div>
        )}

        {/* End of Content Marker */}
        {!isInitialLoading && !hasMore && filteredProducts.length > 0 && (
           <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-100 rounded-full text-slate-400 text-xs font-bold uppercase tracking-widest">
                <Icon name="package" size={14} />
                You've seen all products
              </div>
           </div>
        )}

        {/* Empty State */}
        {!isInitialLoading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Icon name="package-x" size={64} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 text-lg">No products found matching your search</p>
            <button
              onClick={() => { setSelectedCategory('All'); }}
              className="mt-4 text-sky-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        onClose={() => setToast({ show: false, message: '' })}
      />
    </section>
  );
}

export default ProductsSection;
