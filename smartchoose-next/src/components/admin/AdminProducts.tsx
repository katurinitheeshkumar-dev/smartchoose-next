import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { PlatformIcon } from '@/components/ui/custom/PlatformIcon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import { detectEcommercePlatform, cleanAffiliateLink } from '@/lib/utils';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlatformBadge } from './PlatformBadge';
import { ProductImageManager } from './ProductImageManager';
import type { Product } from '@/types';

interface ProductFormData {
  title: string;
  fullTitle: string;
  description: string;
  price: string;
  originalPrice: string;
  discount: string;
  category: string;
  affiliateLink: string;
  affiliateLinks: { platform: string; url: string; icon: string; price?: string }[];
  images: string[];
  rating: number;
  reviews: number;
  published: boolean;
  brand: string;
  platform: string;
  features: string[];
  specifications: Record<string, string>;
  pros: string[];
}

const initialFormData: ProductFormData = {
  title: '',
  fullTitle: '',
  description: '',
  price: '',
  originalPrice: '',
  discount: '',
  category: '',
  affiliateLink: '',
  affiliateLinks: [{ url: '', platform: 'Store', icon: 'generic.svg', price: '' }],
  images: [],
  rating: 4.5,
  reviews: 0,
  published: true,
  brand: '',
  platform: 'Store',
  features: [],
  specifications: {},
  pros: []
};

export function AdminProducts() {
  const { fetchAdminProducts, addProduct, updateProduct, deleteProduct, getProductUrl, broadcastProduct, siteStats } = useDatabase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterStatus = searchParams.get('filter') || 'all';
  
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<any[]>([null]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');   
  const [isFetching, setIsFetching] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [analyticsProductId, setAnalyticsProductId] = useState<string | null>(null);

  const PAGE_SIZE = 20;

  const categories = ['Electronics', 'Smartphones', 'Audio', 'Wearables', 'Laptops', 'Tablets', 'Cameras', 'TVs & Displays', 'Gaming & Accessories', 'Accessories', 'Kitchen', 'Home Appliances', 'Other'];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch Logic
  const loadProducts = useCallback(async (page: number, isNext: boolean = true) => {
    setIsLoading(true);
    const lastVisible = pageHistory[page - 1];
    
    const result = await fetchAdminProducts(
      PAGE_SIZE, 
      lastVisible, 
      debouncedSearch, 
      filterStatus
    );
    
    setLocalProducts(result.products);
    setTotalCount(result.totalCount);
    
    if (isNext && result.lastVisible && pageHistory.length <= page) {
      setPageHistory(prev => [...prev, result.lastVisible]);
    }
    
    setIsLoading(false);
  }, [fetchAdminProducts, debouncedSearch, filterStatus, pageHistory]);

  useEffect(() => {
    setCurrentPage(1);
    setPageHistory([null]);
    loadProducts(1);
  }, [debouncedSearch, filterStatus]);

  const handleNextPage = () => {
    if (localProducts.length < PAGE_SIZE) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    loadProducts(next, true);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prev = currentPage - 1;
    setCurrentPage(prev);
    loadProducts(prev, false);
  };

  const handleBroadcast = async (productId: string) => {
    setIsBroadcasting(productId);
    const success = await broadcastProduct(productId);
    setToast({ show: true, message: success ? 'Broadcasted successfully!' : 'Broadcast failed.', type: success ? 'success' : 'error' });
    setIsBroadcasting(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(initialFormData);
    setSourceUrl('');
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({ 
      ...initialFormData,
      ...product,
      affiliateLinks: product.affiliateLinks || [{ url: product.affiliateLink || '', platform: 'Store', icon: 'generic.svg' }]
    });
    setSourceUrl('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setDeleteConfirm(null);
    setToast({ show: true, message: 'Product deleted', type: 'success' });
    loadProducts(currentPage);
  };

  const handleEnrich = async () => {
    if (!formData.title && !formData.fullTitle) return setToast({ show: true, message: 'Please enter a title first.', type: 'error' });
    setIsFetching(true);
    setToast({ show: true, message: 'AI is professionalizing your product details...', type: 'info' });
    try {
      const res = await fetch('https://smartchoose-proxy.vercel.app/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'enrich',
          product: {
            title: formData.title,
            fullTitle: formData.fullTitle,
            description: formData.description,
            brand: formData.brand,
            category: formData.category
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          ...data.data,
          specifications: { ...prev.specifications, ...data.data.specifications },
          features: data.data.features && data.data.features.length > 0 ? data.data.features : prev.features,
        }));
        setToast({ show: true, message: 'AI Enrichment Successful!', type: 'success' });
      } else {
        setToast({ show: true, message: 'Enrichment Failed: ' + (data.error || 'Unknown error'), type: 'error' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Network error during enrichment.', type: 'error' });
    } finally {
      setIsFetching(false);
    }
  };

  const handleAutoFetch = async () => {
    if (!sourceUrl) return;
    setIsFetching(true);
    setToast({ show: true, message: 'AI Agent is starting extraction...', type: 'info' });
    try {
      const res = await fetch('https://smartchoose-proxy.vercel.app/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl })
      });
      const data = await res.json();
      if (data.success) {
        const platform = detectEcommercePlatform(sourceUrl);
        setFormData(prev => ({
            ...prev,
            title: data.data?.fullTitle || data.data?.title || prev.title,
            fullTitle: data.data?.fullTitle || data.data?.title || prev.fullTitle,
            description: data.data?.description || prev.description,
            price: data.data?.price || prev.price,
            originalPrice: data.data?.originalPrice || prev.originalPrice,
            discount: data.data?.discount || prev.discount,
            brand: data.data?.brand || prev.brand,
            images: data.data?.images && data.data?.images.length > 0 ? data.data?.images : (data.data?.image ? [data.data.image] : prev.images),
            features: data.data?.features || [],
            specifications: data.data?.specifications || {},
            affiliateLink: cleanAffiliateLink(sourceUrl),
            affiliateLinks: [{ 
              url: cleanAffiliateLink(sourceUrl), 
              platform: platform.name, 
              icon: platform.iconFile || 'generic.svg', 
              price: data.data?.price 
            }]
        }));
        setToast({ show: true, message: 'AI Extraction Successful!', type: 'success' });
      } else {
        setToast({ show: true, message: 'Extraction Failed. Manual entry required.', type: 'error' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Network error during extraction.', type: 'error' });
    } finally {
      setIsFetching(false);
    }
  };

  const handlePasteExtensionData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return setToast({ show: true, message: 'Clipboard is empty.', type: 'error' });
      
      let data;
      try { data = JSON.parse(text); } catch (e) { return setToast({ show: true, message: 'Invalid extension data in clipboard.', type: 'error' }); }
      if (!Array.isArray(data) || data.length === 0) return setToast({ show: true, message: 'No products found in clipboard.', type: 'error' });

      setToast({ show: true, message: `Scanning ${data.length} products...`, type: 'info' });
      
      let addedCount = 0;
      
      for (let item of data) {
        const platformObj = detectEcommercePlatform(item.affiliateLink || '');
        if (item.needsEnrichment && item.affiliateLink) {
          try {
            const enrichRes = await fetch('https://smartchoose-proxy.vercel.app/api/fetch-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: item.affiliateLink })
            });
            const enrichData = await enrichRes.json();
            if (enrichData.success && enrichData.data) {
              item = { ...item, ...enrichData.data, title: enrichData.data.title || item.title };
            }
          } catch (e) { console.warn("Auto-enrich failed for " + item.title); }
        }
        
        const displayTitle = item.fullTitle || item.title || '';
        const finalData = {
          title: displayTitle,
          fullTitle: displayTitle,
          description: item.description || '',
          price: item.price || '',
          originalPrice: item.originalPrice || '',
          discount: item.discount || '',
          category: item.category || 'Electronics',
          brand: item.brand || '',
          platform: item.platform || platformObj.name,
          images: item.images && item.images.length > 0 ? item.images : [item.image].filter(Boolean),
          rating: item.rating || 4.5,
          reviews: item.reviews || 0,
          features: item.features || [],
          specifications: item.specifications || {},
          pros: item.pros || [],
          published: true,
          affiliateLink: item.isOfficial ? item.affiliateLink : cleanAffiliateLink(item.affiliateLink || ''),
          affiliateLinks: [{
            url: item.isOfficial ? item.affiliateLink : cleanAffiliateLink(item.affiliateLink || ''),
            platform: platformObj.name,
            icon: platformObj.iconFile || 'generic.svg',
            price: item.price || ''
          }]
        };

        await addProduct(finalData);
        addedCount++;
      }
      
      setToast({ show: true, message: `Successfully imported ${addedCount} products!`, type: 'success' });
      loadProducts(1);
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'Failed to paste. Please check clipboard permissions.', type: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const mainLink = formData.affiliateLinks[0]?.url || '';
      const finalTitle = formData.fullTitle || formData.title;
      const finalData = { ...formData, title: finalTitle, fullTitle: finalTitle, affiliateLink: mainLink };
      
      let productId = editingProduct?.id;
      if (editingProduct) {
        await updateProduct(editingProduct.id, finalData);
      } else {
        productId = await addProduct(finalData);
        if (finalData.published && productId) {
          setToast({ show: true, message: 'Product created! Broadcasting alerts...', type: 'info' });
          broadcastProduct(productId);
        }
      }
      
      closeModal();
      setToast({ show: true, message: `Product ${editingProduct ? 'updated' : 'created'} successfully!`, type: 'success' });
      loadProducts(currentPage);
    } catch (err) {
      setToast({ show: true, message: 'Error saving product.', type: 'error' });
    }
  };

  const handleSyncPrices = async () => {
    if (!window.confirm('Sync prices for the oldest 20 products? This may take ~30 seconds.')) return;
    setToast({ show: true, message: '🔄 Syncing prices from servers...', type: 'info' });
    try {
      const res = await fetch('https://smartchoose-proxy.vercel.app/api/cron/price-sync.js');
      const data = await res.json();
      if (data.success) {
        setToast({ show: true, message: `✅ Synced ${data.synced} products!`, type: 'success' });
        loadProducts(currentPage);
      } else {
        setToast({ show: true, message: '❌ Sync failed: ' + (data.error || 'Unknown error'), type: 'error' });
      }
    } catch (err: any) {
      setToast({ show: true, message: '❌ Network error during sync.', type: 'error' });
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icon name="package" size={32} className="text-emerald-500" />
            Product Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">High-performance monetization dashboard ({siteStats.totalProducts} total)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handlePasteExtensionData} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20">
            <Icon name="clipboard" size={20} /> Paste Extension Data
          </button>
          <button onClick={handleSyncPrices} className="border-2 border-emerald-500 text-emerald-600 px-6 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-50 transition-all flex items-center gap-2">
            <Icon name="refresh-cw" size={14} /> Sync Prices
          </button>
          <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20">
            <Icon name="plus" size={20} /> Add Product
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by title, brand or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shrink-0">
          <button onClick={() => router.push('?filter=all')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${filterStatus !== 'published' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>All</button>
          <button onClick={() => router.push('?filter=published')} className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${filterStatus === 'published' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Published</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-tighter">Product Info</th>
                <th className="px-5 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-tighter">Pricing</th>
                <th className="px-5 py-4 text-left text-[10px] uppercase font-black text-slate-400 tracking-tighter">Platform</th>
                <th className="px-5 py-4 text-right text-[10px] uppercase font-black text-slate-400 tracking-tighter">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Icon name="loader-2" size={40} className="text-emerald-500 animate-spin mx-auto" /></td></tr>
              ) : localProducts.length > 0 ? (
                localProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors group" onClick={() => handleEdit(product)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-100">
                          <img src={product.images?.[0] || 'https://via.placeholder.com/60'} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                           <div className="flex items-center gap-2 mb-0.5">
                             <p className="font-extrabold text-slate-900 text-sm truncate max-w-[300px] tracking-tight">{product.title}</p>
                             {!product.affiliateLink && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase ring-1 ring-red-200">Fix Affiliate</span>}
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category} &bull; {product.brand || 'No Brand'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <div className="font-black text-slate-900">{product.price}</div>
                      {product.originalPrice && <div className="text-[10px] text-slate-400 line-through font-bold">{product.originalPrice}</div>}
                    </td>
                    <td className="px-5 py-3"><PlatformBadge url={product.affiliateLink} name={product.platform} /></td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setAnalyticsProductId(product.id); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Icon name="bar-chart-2" size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleBroadcast(product.id); }} disabled={isBroadcasting === product.id || !product.published} className={`p-2 rounded-lg ${product.broadcasted ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'}`}>
                          {isBroadcasting === product.id ? <Icon name="loader-2" size={16} className="animate-spin" /> : <Icon name="share-2" size={16} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Icon name="edit" size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getProductUrl(product.id)); setToast({show:true, message:'Link copied', type:'success'}); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Icon name="link" size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(product.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Icon name="trash-2" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="py-20 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} &bull; {totalCount} Records</div>
          <div className="flex gap-2">
            <button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading} className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all flex items-center gap-2">Prev</button>
            <button onClick={handleNextPage} disabled={localProducts.length < PAGE_SIZE || isLoading} className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all flex items-center gap-2">Next</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto items-start">
            <m.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4 overflow-hidden border border-slate-100">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Storefront Index Manager</p>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><Icon name="x" size={24} /></button>
              </div>

              <div className="p-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
                {!editingProduct && (
                  <div className="mb-8 rounded-2xl border border-slate-900/10 overflow-hidden shadow-sm">
                    <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-white font-black text-xs uppercase tracking-widest">AI Extraction Agent</span>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">1. Link to Product Page (Source)</label>
                        <div className="flex gap-2">
                           <input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} className="flex-1 bg-white border-2 border-slate-200 p-4 rounded-xl outline-none text-sm font-bold focus:border-emerald-500 transition-all shadow-sm" placeholder="Paste Amazon, Flipkart, Ajio, or Myntra link..." />
                           <button type="button" onClick={handleAutoFetch} disabled={!sourceUrl || isFetching} className="bg-emerald-600 hover:bg-emerald-700 px-8 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2 disabled:opacity-50">
                             {isFetching ? <Icon name="loader-2" size={18} className="animate-spin" /> : <Icon name="zap" size={18} />}
                             {isFetching ? 'Extracting...' : 'Extract Data'}
                           </button>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-6">
                         <label className="block text-[10px] font-black text-orange-500 uppercase mb-2 ml-1">2. Affiliate Link</label>
                         <input type="url" value={formData.affiliateLinks[0]?.url || ''} 
                               onChange={e=>{ 
                                 const updated=[...formData.affiliateLinks]; 
                                 const platform = detectEcommercePlatform(e.target.value);
                                 updated[0] = { url: e.target.value, platform: platform.name, icon: platform.iconFile || 'generic.svg', price: formData.price }; 
                                 setFormData({...formData, affiliateLinks: updated, affiliateLink: e.target.value}); 
                               }} 
                               className="w-full bg-white border-2 border-orange-100 p-4 rounded-xl outline-none text-sm font-black text-orange-600 focus:border-orange-500 transition-all shadow-sm placeholder:text-orange-200" 
                               placeholder="Paste EarnKaro / Affiliate link here..." />
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="md:col-span-2 relative group">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center justify-between">
                          Product Title *
                          <button type="button" onClick={handleEnrich} disabled={isFetching} className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full flex items-center gap-1">AI Enrich</button>
                        </label>
                        <textarea rows={2} required value={formData.fullTitle} onChange={e=>setFormData({...formData, fullTitle: e.target.value, title: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none transition-all font-bold text-slate-700 resize-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Description</label>
                        <textarea rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none transition-all font-medium text-sm text-slate-600 resize-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Sale Price *</label>
                        <input type="text" required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-black text-slate-900" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Category</label>
                        <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-bold text-slate-700">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Product Images</label>
                        <ProductImageManager images={formData.images} onChange={imgs=>setFormData({...formData, images: imgs})} />
                    </div>
                    <div className="md:col-span-2 pt-4 flex items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${formData.published ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full transition-all duration-300 transform ${formData.published ? 'translate-x-7' : 'translate-x-0'}`} />
                          </div>
                          <input type="checkbox" className="hidden" checked={formData.published} onChange={e=>setFormData({...formData, published: e.target.checked})} />
                          <span className="text-xs font-black uppercase text-slate-700 tracking-widest">Public Deployment</span>
                        </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-8 border-t border-slate-100">
                    <button type="button" onClick={closeModal} className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                    <button type="submit" className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 active:scale-95 transition-all">
                      {editingProduct ? 'Commit Changes' : 'Publish Product'}
                    </button>
                  </div>
                </form>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-[200]">
          <Toast message={toast.message} show={toast.show} type={toast.type as any} onClose={()=>setToast({...toast, show:false})} />
      </div>
      
      {analyticsProductId && <AnalyticsDetailModal type="product_performance" productId={analyticsProductId} onClose={() => setAnalyticsProductId(null)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <m.div initial={{scale:0.9, opacity: 0}} animate={{scale:1, opacity: 1}} className="bg-white rounded-3xl p-10 w-full max-w-md text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><Icon name="trash-2" size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter">Permanently Delete?</h3>
            <p className="text-slate-500 text-sm font-medium mb-10 px-4">This action will remove the product from all indexes. This cannot be undone.</p>
            <div className="flex gap-4">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 py-4 text-slate-500 font-bold uppercase text-[10px] tracking-widest">Keep Product</button>
              <button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-900/20 hover:bg-red-700 transition-all">Delete Forever</button>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
