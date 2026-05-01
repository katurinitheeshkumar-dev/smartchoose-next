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

const PRODUCTS_PER_PAGE = 8;

export function ProductsSection({
  searchQuery,
  highlightedProduct,
  onProductClick
}: ProductsSectionProps) {
  const { products, isProductsLoading } = useDatabase();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [displayLimit, setDisplayLimit] = useState(PRODUCTS_PER_PAGE);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const observerTarget = useRef<HTMLDivElement>(null);

  const { isSubscribed, subscribe, loading, isDismissed, dismiss } = useNotifications('products');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['All', ...new Set(products.map(p => p.category))];
    return cats;
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && product.published;
    });

    // Sort by search relevance if searching
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
  }, [products, selectedCategory, searchQuery]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isBatchLoading && displayLimit < filteredProducts.length) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayLimit, filteredProducts.length, isBatchLoading]);

  const loadMore = () => {
    setIsBatchLoading(true);
    // Simulate minor network delay for smooth skeleton transition
    setTimeout(() => {
      setDisplayLimit(prev => prev + PRODUCTS_PER_PAGE);
      setIsBatchLoading(false);
    }, 400);
  };

  // Reset limit on filter change
  useEffect(() => {
    setDisplayLimit(PRODUCTS_PER_PAGE);
  }, [selectedCategory, searchQuery]);

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
          {isProductsLoading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : (
            <>
              {filteredProducts.slice(0, displayLimit).map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    // First few products on page load get high priority
                    fetchPriority: index < 4 ? 'high' : 'auto'
                  }}
                  highlighted={highlightedProduct === product.id}
                  onCopy={() => showToast('Link copied to clipboard!')}
                  onClick={() => onProductClick(product.id)}
                />
              ))}
              {/* Skeletons for batch loading */}
              {isBatchLoading && (
                Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={`batch-skeleton-${i}`} />)
              )}
            </>
          )}
        </div>

        {/* Sentinel for Infinite Scroll */}
        {!isProductsLoading && displayLimit < filteredProducts.length && (
          <div 
            ref={observerTarget} 
            className="h-20 flex items-center justify-center mt-8"
          >
            {!isBatchLoading && (
               <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Icon name="loader-2" size={24} className="animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Loading more...</span>
               </div>
            )}
          </div>
        )}

        {/* End of Content Marker */}
        {!isProductsLoading && filteredProducts.length > 0 && displayLimit >= filteredProducts.length && (
           <div className="mt-16 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-100 rounded-full text-slate-400 text-xs font-bold uppercase tracking-widest">
                <Icon name="package" size={14} />
                You've seen all products
              </div>
           </div>
        )}

        {/* Empty State */}
        {!isProductsLoading && filteredProducts.length === 0 && (
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
