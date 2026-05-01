import { useState, useMemo, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { ProductCard, ProductSkeleton } from './ProductCard';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPopup } from '@/components/ui/custom/NotificationPopup';

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
  searchQuery,
  highlightedProduct,
  onProductClick
}: ProductsSectionProps) {
  // We still need useDatabase for some context, but we will manage products locally
  const { isProductsLoading: contextLoading } = useDatabase();
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const observerTarget = useRef<HTMLDivElement>(null);

  const { isSubscribed, subscribe, loading, isDismissed, dismiss } = useNotifications('products');

  const categories = CATEGORIES;

  // Filter products client-side for search if it's already loaded,
  // but true pagination requires a server-side query.
  // For this version, we will fetch base paginated products from Firebase,
  // and apply search filtering locally on the fetched set.
  // A robust search would use Algolia.
  const filteredProducts = useMemo(() => {
    const filtered = localProducts.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && product.published;
    });

    if (searchQuery) {
      filtered.sort((a, b) => {
        const q = searchQuery.toLowerCase();
        const aTitle = a.title.toLowerCase().includes(q);
        const bTitle = b.title.toLowerCase().includes(q);
        if (aTitle && !bTitle) return -1;
        if (!aTitle && bTitle) return 1;
        return 0;
      });
    }

    return filtered;
  }, [localProducts, selectedCategory, searchQuery]);

  // Firebase Fetch Function
  const fetchProducts = async (isLoadMore = false) => {
    try {
      if (isLoadMore) setIsBatchLoading(true);
      else setIsInitialLoading(true);

      const { collection, query, orderBy, limit, startAfter, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');

      let q;
      const baseConstraints = [
        where('published', '==', true),
        orderBy('createdAt', 'desc')
      ];

      // If a category is selected and it's not 'All', add a where clause
      if (selectedCategory !== 'All') {
        // Note: Firestore requires a composite index if combining where(category) and orderBy(createdAt).
        // If index doesn't exist, this might fail, so we might need to rely on local filtering 
        // or just orderBy category first. Assuming index exists for now, or fallback to simple query.
        q = query(
          collection(db, 'products'),
          where('category', '==', selectedCategory),
          ...baseConstraints,
          limit(PRODUCTS_PER_PAGE)
        );
      } else {
        q = query(
          collection(db, 'products'),
          ...baseConstraints,
          limit(PRODUCTS_PER_PAGE)
        );
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => doc.data());
      
      if (docs.length < PRODUCTS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      }

      if (isLoadMore) {
        setLocalProducts(prev => {
          // Prevent duplicates
          const newDocs = docs.filter(d => !prev.find(p => p.id === d.id));
          return [...prev, ...newDocs];
        });
      } else {
        setLocalProducts(docs);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      // Fallback: If index is missing, remove the category where clause and let local filter handle it
      setHasMore(false);
    } finally {
      setIsBatchLoading(false);
      setIsInitialLoading(false);
    }
  };

  // Initial Load & Category Change
  useEffect(() => {
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
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest mb-3 border border-emerald-100">
              <Icon name="sparkles" size={12} />
              Curated Collection
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Featured Deals</h2>
          </div>
          
          {/* Category Filters - Modern Pill Style */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <m.button
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${selectedCategory === category
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 border-emerald-600'
                    : 'bg-white text-slate-500 hover:text-emerald-600 hover:border-emerald-200 border-slate-100 shadow-sm'
                  }`}
              >
                {category}
              </m.button>
            ))}
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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 content-visibility-auto">
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
              {isBatchLoading && (
                Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={`batch-skeleton-${i}`} />)
              )}
            </>
          )}
        </div>

        {/* Sentinel for Infinite Scroll */}
        {!isInitialLoading && hasMore && (
          <div 
            ref={observerTarget} 
            className="h-20 flex items-center justify-center mt-8"
          >
            {!isBatchLoading && (
               <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Icon name="loader-2" size={24} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Scroll for more...</span>
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
