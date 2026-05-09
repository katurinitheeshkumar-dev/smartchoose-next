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

const PRODUCTS_PER_PAGE = 50;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(initialProducts.length === 0);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const observerTarget = useRef<HTMLDivElement>(null);
  // Track if we've done the initial load — prevents wiping server-provided initialProducts
  const initialLoadDone = useRef(initialProducts.length > 0);
  const loadingRef = useRef(false);

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
    if (loadingRef.current) return;
    try {
      loadingRef.current = true;
      if (isLoadMore) setIsBatchLoading(true);
      else if (!localProducts || localProducts.length === 0) setIsInitialLoading(true);

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
        limit: PRODUCTS_PER_PAGE,
        offset: (currentPage - 1) * PRODUCTS_PER_PAGE,
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
      // Recursive Firestore REST parser
      const parseValue = (val: any): any => {
        if (!val) return null;
        if ('stringValue' in val) return val.stringValue;
        if ('integerValue' in val) return Number(val.integerValue);
        if ('doubleValue' in val) return val.doubleValue;
        if ('booleanValue' in val) return val.booleanValue;
        if ('timestampValue' in val) return val.timestampValue;
        if ('arrayValue' in val) return (val.arrayValue?.values || []).map(parseValue);
        if ('mapValue' in val) {
          const res: any = {};
          const f = val.mapValue.fields || {};
          for (const [k, v] of Object.entries(f)) res[k] = parseValue(v);
          return res;
        }
        return null;
      };

      const docs = (data || [])
        .filter((item: any) => item && item.document && item.document.name)
        .map((item: any) => {
          const fields = item.document.fields || {};
          const nameParts = item.document.name.split('/');
          const id = nameParts[nameParts.length - 1];
          const result: any = { id };
          
          for (const [k, v] of Object.entries(fields)) {
            result[k] = parseValue(v);
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
      
      const currentIds = new Set(localProducts.filter(p => p && p.id).map(p => p.id));
      const newDocs = docs.filter((d: any) => d && d.id && !currentIds.has(d.id));

      if (docs.length < PRODUCTS_PER_PAGE || (isLoadMore && newDocs.length === 0)) {
        setHasMore(false);
      }

      setLocalProducts(docs);
      


    } catch (error) {
      console.error("Error fetching products via REST:", error);
      setHasMore(false);
    } finally {
      setIsBatchLoading(false);
      setIsInitialLoading(false);
      loadingRef.current = false;
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
            page: currentPage - 1,
            hitsPerPage: PRODUCTS_PER_PAGE
          }
        ]
      }).then((response: any) => {
        const hits = response.results[0].hits || [];
        const nbHits = response.results[0].nbHits || 0;
        const mappedHits = hits.map((hit: any) => ({ ...hit, id: hit.objectID || hit.id }));
        setLocalProducts(mappedHits);
        setTotalHits(nbHits);
        setHasMore(nbHits > currentPage * PRODUCTS_PER_PAGE);
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
    setCurrentPage(1); // Reset to page 1 on category change
    fetchProducts(false);
  }, [selectedCategory]);

  // Page Change
  useEffect(() => {
    if (!initialLoadDone.current) {
      fetchProducts(false);
    } else {
      initialLoadDone.current = false;
    }
  }, [currentPage]);

  // Total pages calculation
  const { siteStats } = useDatabase();
  const totalItems = searchQuery ? totalHits : (selectedCategory === 'All' ? siteStats.totalPublishedProducts : localProducts.length + (hasMore ? PRODUCTS_PER_PAGE : 0));
  const totalPages = Math.max(1, Math.ceil(totalItems / PRODUCTS_PER_PAGE));

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

        {/* Pagination Controls */}
        {!isInitialLoading && totalPages > 1 && (
          <div className="mt-16 flex flex-col items-center gap-6">
            <div className="flex flex-wrap justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-emerald-500 hover:text-emerald-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <Icon name="chevron-left" size={20} />
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = currentPage;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-12 h-12 rounded-2xl font-black text-sm transition-all border shadow-sm ${
                      currentPage === pageNum
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-500'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-emerald-500 hover:text-emerald-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                <Icon name="chevron-right" size={20} />
              </button>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing Page {currentPage} of {totalPages}
            </p>
          </div>
        )}

        {/* End of Content Marker */}
        {!isInitialLoading && !hasMore && filteredProducts.length > 0 && totalPages <= 1 && (
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
