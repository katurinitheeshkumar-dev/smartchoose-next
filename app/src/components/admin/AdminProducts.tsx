import { useState, useRef, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import { detectEcommercePlatform, cleanAffiliateLink } from '@/lib/utils';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';
import { useSearchParams } from 'react-router-dom';
import { PlatformBadge } from './PlatformBadge';
import { ProductImageManager } from './ProductImageManager';

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

// Components extracted to PlatformBadge.tsx and ProductImageManager.tsx

export function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, getProductUrl, broadcastProduct } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get('filter') || 'all';
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');   // Direct product URL for extraction
  const [isFetching, setIsFetching] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [analyticsProductId, setAnalyticsProductId] = useState<string | null>(null);

  const categories = ['Electronics', 'Smartphones', 'Audio', 'Wearables', 'Laptops', 'Tablets', 'Cameras', 'TVs & Displays', 'Gaming & Accessories', 'Accessories', 'Kitchen', 'Home Appliances', 'Other'];

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
          // Merge specs if AI returned any
          specifications: { ...prev.specifications, ...data.data.specifications },
          // Merge features
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
      let skippedCount = 0;
      
      for (let item of data) {
        const platformObj = detectEcommercePlatform(item.affiliateLink || '');
        
        // --- AUTO-ENRICHMENT LOGIC ---
        // If it's a search result (needsEnrichment), we visit the actual page in background
        if (item.needsEnrichment && item.affiliateLink) {
          try {
            const enrichRes = await fetch('https://smartchoose-proxy.vercel.app/api/fetch-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: item.affiliateLink })
            });
            const enrichData = await enrichRes.json();
            if (enrichData.success && enrichData.data) {
              // Merge rich data into item
              item = { ...item, ...enrichData.data, title: enrichData.data.title || item.title };
            }
          } catch (e) { console.warn("Auto-enrich failed for " + item.title); }
        }
        
        // Use Full Rich Title (SEO Priority)
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

        // Duplicate Check: Check if product with exact same title or link already exists
        const isDuplicate = products.some(p => 
          (p.title && p.title === finalData.title) || 
          (p.fullTitle && p.fullTitle === finalData.fullTitle) ||
          (p.affiliateLink && p.affiliateLink === finalData.affiliateLink && p.affiliateLink.length > 5)
        );

        if (isDuplicate) {
          skippedCount++;
          continue; // Skip adding duplicate
        }

        await addProduct(finalData);
        addedCount++;
      }
      
      const msg = skippedCount > 0 
        ? `Added ${addedCount} new products. Skipped ${skippedCount} duplicates.` 
        : `Successfully imported ${addedCount} products!`;
        
      setToast({ show: true, message: msg, type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ show: true, message: 'Failed to paste. Please check clipboard permissions.', type: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use the first link as the main primary link
      const mainLink = formData.affiliateLinks[0]?.url || '';
      // Ensure titles are synced (Full Title wins)
      const finalTitle = formData.fullTitle || formData.title;
      const finalData = { ...formData, title: finalTitle, fullTitle: finalTitle, affiliateLink: mainLink };
      
      let productId = editingProduct?.id;
      if (editingProduct) {
        await updateProduct(editingProduct.id, finalData);
      } else {
        productId = await addProduct(finalData);
        
        // Auto-broadcast new published products
        if (finalData.published && productId) {
          setToast({ show: true, message: 'Product created! Broadcasting alerts...', type: 'info' });
          broadcastProduct(productId);
        }
      }
      
      closeModal();
      setToast({ show: true, message: `Product ${editingProduct ? 'updated' : 'created'} successfully!`, type: 'success' });
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
      } else {
        setToast({ show: true, message: '❌ Sync failed: ' + (data.error || 'Unknown error'), type: 'error' });
      }
    } catch (err: any) {
      setToast({ show: true, message: '❌ Network error during sync.', type: 'error' });
    }
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => (p.title + p.brand + p.category).toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterStatus === 'published') list = list.filter(p => p.published);
    return list;
  }, [products, searchTerm, filterStatus]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icon name="package" size={32} className="text-emerald-500" />
            Product Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">High-performance monetization dashboard</p>
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

      {/* Filters */}
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
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${filterStatus !== 'published' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            All
          </button>
          <button
            onClick={() => setSearchParams({ filter: 'published' })}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${filterStatus === 'published' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Published
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
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
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors group" onClick={() => handleEdit(product)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-xs ring-1 ring-slate-100">
                        <img src={product.images?.[0] || 'https://via.placeholder.com/60'} className="w-full h-full object-contain" />
                      </div>
                      <div className="min-w-0">
                         <div className="flex items-center gap-2 mb-0.5">
                           <p className="font-extrabold text-slate-900 text-sm truncate max-w-[300px] tracking-tight">{product.title}</p>
                           {!product.affiliateLink && (
                            <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase ring-1 ring-red-200">Fix Affiliate</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category} &bull; {product.brand || 'No Brand'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm">
                    <div className="font-black text-slate-900">{product.price}</div>
                    {product.originalPrice && <div className="text-[10px] text-slate-400 line-through font-bold">{product.originalPrice}</div>}
                    {product.lastPriceSync && <div className="text-[8px] text-emerald-500 font-black uppercase mt-1">Synced {new Date(product.lastPriceSync.seconds * 1000).toLocaleDateString()}</div>}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto items-start">
            <m.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-4 overflow-hidden border border-slate-100">
              {/* Modal Header */}
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Storefront Index Manager</p>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"><Icon name="x" size={24} /></button>
              </div>

              <div className="p-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
                {/* AI & Affiliate Header Section */}
                {!editingProduct && (
                  <div className="mb-8 rounded-2xl border border-slate-900/10 overflow-hidden shadow-sm">
                    <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-white font-black text-xs uppercase tracking-widest">AI Extraction Agent</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Playwright Bot v3.0</span>
                    </div>
                    <div className="p-6 bg-slate-50 space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">1. Link to Product Page (Source)</label>
                        <div className="flex gap-2">
                           <input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} className="flex-1 bg-white border-2 border-slate-200 p-4 rounded-xl outline-none text-sm font-bold focus:border-emerald-500 transition-all shadow-sm" placeholder="Paste Amazon, Flipkart, Ajio, or Myntra link..." />
                           <button type="button" onClick={async () => {
                             try {
                               const text = await navigator.clipboard.readText();
                               if (text) setSourceUrl(text);
                             } catch (e) {
                               setToast({show:true, message:'Browser blocked clipboard access. Please paste manually.', type:'error'});
                             }
                           }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 rounded-xl font-bold transition-all flex items-center justify-center shadow-sm">
                             <Icon name="clipboard" size={18} />
                           </button>
                           <button type="button" onClick={handleAutoFetch} disabled={!sourceUrl || isFetching} className="bg-emerald-600 hover:bg-emerald-700 px-8 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2 disabled:opacity-50">
                             {isFetching ? <Icon name="loader-2" size={18} className="animate-spin" /> : <Icon name="zap" size={18} />}
                             {isFetching ? 'Extracting...' : 'Extract Data'}
                           </button>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-6">
                         <div className="flex items-center justify-between mb-2 ml-1">
                           <label className="block text-[10px] font-black text-orange-500 uppercase italic">2. Affiliate Monetization Helper (EarnKaro)</label>
                           <Icon name="link" size={12} className="text-orange-400" />
                         </div>
                         <div className="flex gap-2">
                            <input type="url" value={formData.affiliateLinks[0]?.url || ''} 
                              onChange={e=>{ 
                                const updated=[...formData.affiliateLinks]; 
                                const platform = detectEcommercePlatform(e.target.value);
                                updated[0] = { url: e.target.value, platform: platform.name, icon: platform.iconFile || 'generic.svg', price: formData.price }; 
                                setFormData({...formData, affiliateLinks: updated, affiliateLink: e.target.value}); 
                              }} 
                              className="flex-1 bg-white border-2 border-orange-100 p-4 rounded-xl outline-none text-sm font-black text-orange-600 focus:border-orange-500 transition-all shadow-sm placeholder:text-orange-200" 
                              placeholder="Paste EarnKaro / Affiliate link here..." />
                            <button type="button" onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                if (text) {
                                  const updated=[...formData.affiliateLinks]; 
                                  const platform = detectEcommercePlatform(text);
                                  updated[0] = { url: text, platform: platform.name, icon: platform.iconFile || 'generic.svg', price: formData.price }; 
                                  setFormData({...formData, affiliateLinks: updated, affiliateLink: text}); 
                                  setToast({show:true, message:'Link Pasted successfully!', type:'success'});
                                }
                              } catch (e) {
                                setToast({show:true, message:'Browser blocked clipboard access. Please paste manually.', type:'error'});
                              }
                            }} className="bg-orange-100 hover:bg-orange-200 text-orange-600 px-4 rounded-xl font-bold transition-all flex items-center justify-center shadow-sm">
                              <Icon name="clipboard" size={18} />
                            </button>
                            {formData.platform !== 'Amazon' && (
                                <button type="button" onClick={()=>{
                                    const link = sourceUrl || formData.affiliateLink;
                                    if(!link) return setToast({show:true, message: 'Provide Source Link first!', type:'error'});
                                    navigator.clipboard.writeText(link).then(() => {
                                        window.open('https://earnkaro.com/earn/make-link', '_blank');
                                        setToast({show:true, message:'Product URL Copied to Clipboard!', type:'success'});
                                    });
                                }} className="bg-orange-600 hover:bg-orange-700 px-6 rounded-xl text-white font-black text-[10px] uppercase tracking-tighter transition-all shadow-lg shadow-orange-900/10 flex items-center gap-1.5 ring-2 ring-orange-100">
                                  <Icon name="external-link" size={14} /> EarnKaro Helper
                                </button>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Basic Info */}
                    <div className="md:col-span-2 relative group">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest flex items-center justify-between">
                          Product Title (SEO Optimized) *
                          <button type="button" onClick={handleEnrich} disabled={isFetching} className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full flex items-center gap-1 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-900/10">
                            {isFetching ? <Icon name="refresh-cw" size={10} className="animate-spin" /> : <Icon name="sparkles" size={10} />}
                            Magic AI Fill
                          </button>
                        </label>
                        <textarea rows={2} required value={formData.fullTitle} onChange={e=>setFormData({...formData, fullTitle: e.target.value, title: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none transition-all font-bold text-slate-700 resize-none" placeholder="Paste full product title here..." />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Description (Optional)</label>
                        <textarea rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none transition-all font-medium text-sm text-slate-600 resize-none" placeholder="Enter custom product details or features..." />
                    </div>

                    {/* Pricing */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Sale Price *</label>
                        <input type="text" required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-black text-slate-900" placeholder="₹1,999" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Original Price</label>
                        <input type="text" value={formData.originalPrice} onChange={e=>setFormData({...formData, originalPrice: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-bold text-slate-400" placeholder="₹2,999" />
                    </div>

                    {/* Organization */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Category</label>
                        <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-bold text-slate-700 appearance-none">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Brand</label>
                        <input type="text" value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-bold text-slate-700" placeholder="e.g. Apple, Boat, etc." />
                    </div>

                    {/* Meta Data */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Rating (0-5)</label>
                        <input type="number" step="0.1" max="5" value={formData.rating} onChange={e=>setFormData({...formData, rating: parseFloat(e.target.value)})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-2 tracking-widest">Review Count</label>
                        <input type="number" value={formData.reviews} onChange={e=>setFormData({...formData, reviews: parseInt(e.target.value)})} className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-emerald-500 bg-slate-50/30 outline-none font-bold" />
                    </div>

                    {/* Affiliate Links Section */}
                    <div className="md:col-span-2 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest underline decoration-emerald-500 decoration-2 underline-offset-4">Affiliate & Buy Options</label>
                        <button type="button" onClick={() => setFormData({ ...formData, affiliateLinks: [...formData.affiliateLinks, { url: '', platform: 'Other', icon: 'generic.svg' }] })} className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full transition-all">
                          <Icon name="plus-circle" size={12} /> Add Alternative Store
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.affiliateLinks.map((link, idx) => (
                           <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 shadow-xs">
                             <div className="shrink-0 w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                               <PlatformIcon name={link.platform} size="sm" />
                             </div>
                             <input 
                               type="url" 
                               value={link.url} 
                               onChange={e => {
                                 const updated = [...formData.affiliateLinks];
                                 const plat = detectEcommercePlatform(e.target.value);
                                 updated[idx] = { ...updated[idx], url: e.target.value, platform: plat.name, icon: plat.iconFile || 'generic.svg' };
                                 setFormData({ ...formData, affiliateLinks: updated });
                               }}
                               className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-600"
                               placeholder="Monetized Link..."
                             />
                             {idx > 0 && (
                               <button type="button" onClick={() => {
                                 const updated = formData.affiliateLinks.filter((_, i) => i !== idx);
                                 setFormData({ ...formData, affiliateLinks: updated });
                               }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                 <Icon name="trash-2" size={14} />
                               </button>
                             )}
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Features & Specs */}
                    <div className="md:col-span-2 grid md:grid-cols-2 gap-6 pt-6 border-t-2 border-slate-50">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <label className="block text-xs font-black text-slate-900 uppercase tracking-widest">Key Features</label>
                            <button type="button" onClick={() => setFormData({...formData, features: [...formData.features, '']})} className="text-[10px] font-bold text-emerald-600">+ Add Feature</button>
                          </div>
                          <div className="space-y-2">
                            {formData.features.map((f, i) => (
                              <div key={i} className="flex gap-2">
                                <input value={f} onChange={e => {
                                  const updated = [...formData.features];
                                  updated[i] = e.target.value;
                                  setFormData({...formData, features: updated});
                                }} className="flex-1 bg-slate-50 border border-slate-100 p-2 rounded-lg text-sm" placeholder="e.g. 5000mAh Battery" />
                                <button type="button" onClick={() => setFormData({...formData, features: formData.features.filter((_, idx) => idx !== i)})} className="text-red-400 p-2"><Icon name="x" size={14}/></button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <label className="block text-xs font-black text-slate-900 uppercase tracking-widest">Specifications</label>
                            <button type="button" onClick={() => {
                              const key = window.prompt('Spec Name (e.g. RAM)');
                              if (key) setFormData({...formData, specifications: {...formData.specifications, [key]: ''}});
                            }} className="text-[10px] font-bold text-emerald-600">+ Add Spec</button>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(formData.specifications).map(([k, v], i) => (
                              <div key={k} className="flex gap-2 items-center">
                                <span className="text-[10px] font-black text-slate-400 w-20 truncate">{k}</span>
                                <input value={v} onChange={e => {
                                  setFormData({...formData, specifications: {...formData.specifications, [k]: e.target.value}});
                                }} className="flex-1 bg-slate-50 border border-slate-100 p-2 rounded-lg text-sm" placeholder="Value..." />
                                <button type="button" onClick={() => {
                                  const updated = {...formData.specifications};
                                  delete updated[k];
                                  setFormData({...formData, specifications: updated});
                                }} className="text-red-400 p-2"><Icon name="x" size={14}/></button>
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>

                    {/* Visual Media */}
                    <div className="md:col-span-2 pt-4">
                        <label className="block text-xs font-black text-slate-900 uppercase tracking-widest mb-4 underline decoration-emerald-500 decoration-2 underline-offset-4">Product Visual Media (High-Res)</label>
                        <div className="bg-slate-50/50 p-6 rounded-3xl border-2 border-slate-100">
                           <ProductImageManager images={formData.images} onChange={imgs=>setFormData({...formData, images: imgs})} />
                        </div>
                    </div>

                    {/* Visibility Settings */}
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

                  {/* Actions */}
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
