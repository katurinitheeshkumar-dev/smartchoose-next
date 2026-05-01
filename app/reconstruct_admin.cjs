const fs = require('fs');
const path = require('path');

const originalPath = path.join('c:', 'Users', '12039383', 'OneDrive - MEGHA ENGINEERING & INFRASTRUCTURES LIMITED', 'Desktop', 'SmartChoose_Site', 'app', 'src', 'components', 'admin', 'AdminProducts.tsx');

const fileParts = [];

// Part 1: Imports and Header
fileParts.push(`import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import { detectEcommercePlatform, parsePrice, formatPrice, getHighResImage, cleanAffiliateLink } from '@/lib/utils';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';
import { useSearchParams } from 'react-router-dom';
import { PlatformIcon } from '@/components/ui/custom/PlatformIcon';

interface ProductFormData {
  title: string;
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
}

const initialFormData: ProductFormData = {
  title: '',
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
  brand: ''
};
`);

// Part 2: ImageCropModal
fileParts.push(`
function ImageCropModal({ src, onConfirm, onCancel }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const SIZE = Math.min(typeof window !== 'undefined' ? window.innerWidth - 48 : 320, 340);
  const minZoom = (img) => Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
  const clamp = (ox, oy, z, img) => {
    const dw = img.naturalWidth * z;
    const dh = img.naturalHeight * z;
    return {
      x: Math.max(-(dw - SIZE) / 2, Math.min((dw - SIZE) / 2, ox)),
      y: Math.max(-(dh - SIZE) / 2, Math.min((dh - SIZE) / 2, oy)),
    };
  };
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const z = minZoom(img);
      zoomRef.current = z;
      setZoom(z);
      offsetRef.current = { x: 0, y: 0 };
      setOffset({ x: 0, y: 0 });
      setReady(true);
    };
    img.src = src;
  }, [src]);
  const onMouseDown = (e) => { e.preventDefault(); dragRef.current = { on: true, sx: e.clientX, sy: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y }; };
  const onMouseMove = (e) => {
    if (!dragRef.current.on || !imgRef.current) return;
    const clamped = clamp(dragRef.current.ox + e.clientX - dragRef.current.sx, dragRef.current.oy + e.clientY - dragRef.current.sy, zoomRef.current, imgRef.current);
    offsetRef.current = clamped; setOffset({ ...clamped });
  };
  const onMouseUp = () => { dragRef.current.on = false; };
  const confirmCrop = () => {
    const img = imgRef.current;
    const z = zoomRef.current;
    const { x, y } = offsetRef.current;
    const OUT = 800;
    const out = document.createElement('canvas');
    out.width = OUT; out.height = OUT;
    const ctx = out.getContext('2d');
    const dw = img.naturalWidth * z, dh = img.naturalHeight * z;
    const imgX = (SIZE - dw) / 2 + x;
    const imgY = (SIZE - dh) / 2 + y;
    ctx.drawImage(img, -imgX / z, -imgY / z, SIZE / z, SIZE / z, 0, 0, OUT, OUT);
    onConfirm(out.toDataURL('image/jpeg', 0.92));
  };
  const dw = imgRef.current ? imgRef.current.naturalWidth * zoom : SIZE;
  const dh = imgRef.current ? imgRef.current.naturalHeight * zoom : SIZE;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: SIZE + 40 }}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div><p className="font-bold text-slate-900 text-sm">Square Crop</p></div>
          <button type="button" onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><Icon name="x" size={14} /></button>
        </div>
        <div className="relative mx-auto overflow-hidden bg-slate-800" style={{ width: SIZE, height: SIZE, cursor: ready ? 'grab' : 'default', touchAction: 'none' }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          {ready && imgRef.current && <img src={src} alt="crop" draggable={false} style={{ position: 'absolute', width: dw, height: dh, left: (SIZE - dw) / 2 + offset.x, top: (SIZE - dh) / 2 + offset.y, pointerEvents: 'none' }} />}
          {ready && <div className="absolute inset-0 pointer-events-none" style={{ border: '2.5px solid #10b981' }}></div>}
        </div>
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          <button type="button" onClick={() => { const newZ = Math.max(minZoom(imgRef.current), zoomRef.current - 0.1); zoomRef.current = newZ; setZoom(newZ); }} className="w-10 h-10 rounded-full bg-slate-100 text-xl font-light">−</button>
          <div className="flex-1 text-center"><span className="text-sm font-bold text-slate-800">{Math.round(zoom * 100)}%</span></div>
          <button type="button" onClick={() => { const newZ = Math.min(4, zoomRef.current + 0.1); zoomRef.current = newZ; setZoom(newZ); }} className="w-10 h-10 rounded-full bg-slate-100 text-xl font-light">+</button>
        </div>
        <div className="flex gap-3 px-4 pb-4">
          <button type="button" onClick={onCancel} className="flex-1 py-3 border border-slate-200 rounded-xl font-medium text-sm">Cancel</button>
          <button type="button" onClick={confirmCrop} disabled={!ready} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition"><Icon name="check" size={16} /> Use This Crop</button>
        </div>
      </div>
    </div>
  );
}
`);

// Part 3: ImageManager and PlatformBadge
fileParts.push(`
function ImageManager({ images, onChange }) {
  const [activeTab, setActiveTab] = useState('url');
  const [urlInput, setUrlInput] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const fileInputRef = useRef(null);
  const handleCropConfirm = (cropped) => { onChange([...images, cropped]); setCropSrc(null); setUrlInput(''); };
  return (
    <div className="space-y-4">
      {cropSrc && <ImageCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />}
      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setActiveTab('url')} className={\`px-4 py-2 rounded-lg text-sm font-medium \${activeTab === 'url' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}\`}>Add by URL</button>
        <button type="button" onClick={() => setActiveTab('upload')} className={\`px-4 py-2 rounded-lg text-sm font-medium \${activeTab === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}\`}>Upload & Crop</button>
      </div>
      {activeTab === 'url' && (
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none" />
          <button type="button" onClick={() => setCropSrc(urlInput)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium">Crop</button>
        </div>
      )}
      {activeTab === 'upload' && (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => fileInputRef.current.click()}>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if(file) { const r = new FileReader(); r.onload=ev=>setCropSrc(ev.target.result); r.readAsDataURL(file); } }} />
          <p className="text-slate-500 text-sm">Click to upload image</p>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3 mt-4">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square border rounded-lg overflow-hidden group bg-white">
            <img src={img} className="w-full h-full object-contain" />
            <button type="button" onClick={() => onChange(images.filter((_,i)=>i!==idx))} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="x" size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformBadge({ url, name }) {
  const platformName = useMemo(() => name || (url ? detectEcommercePlatform(url).name : 'Store'), [url, name]);
  return <PlatformIcon name={platformName} size="sm" showText className="scale-90 origin-left" />;
}
`);

// Part 4: AdminProducts Main Component
fileParts.push(`
export function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, duplicateProduct, getProductUrl, broadcastProduct } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get('filter') || 'all';
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(null);
  const [analyticsProductId, setAnalyticsProductId] = useState(null);

  const handleBroadcast = async (productId) => {
    setIsBroadcasting(productId);
    setToast({ show: true, message: 'Broadcasting to channels...', type: 'info' });
    const success = await broadcastProduct(productId);
    setToast({ show: true, message: success ? 'Broadcasted successfully!' : 'Failed.', type: success ? 'success' : 'error' });
    setIsBroadcasting(null);
  };

  const closeModal = () => { setShowModal(false); setEditingProduct(null); setFormData(initialFormData); setSourceUrl(''); };
  const handleEdit = (p) => { setEditingProduct(p); setFormData({ ...p }); setSourceUrl(''); setShowModal(true); };
  const handleDelete = async (id) => { await deleteProduct(id); setDeleteConfirm(null); setToast({ show: true, message: 'Product deleted', type: 'success' }); };

  const handleAutoFetch = async () => {
    if (!sourceUrl) return;
    setIsFetching(true);
    setToast({ show: true, message: 'AI Extracting...', type: 'info' });
    try {
      const res = await fetch('https://smartchoose-proxy.vercel.app/api/fetch-product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: sourceUrl }) });
      const data = await res.json();
      if (data.success) {
        const platform = detectEcommercePlatform(sourceUrl);
        setFormData({ ...formData, title: data.title||'', price: data.price||'', originalPrice: data.originalPrice||'', discount: data.discount||'', brand: data.brand||'', images: data.images||[], affiliateLink: cleanAffiliateLink(sourceUrl), affiliateLinks: [{url: cleanAffiliateLink(sourceUrl), platform: platform.name, icon: platform.iconFile||'generic.svg', price: data.price}] });
        setToast({ show: true, message: 'AI Extraction Success!', type: 'success' });
      }
    } finally { setIsFetching(false); }
  };

  const handleSyncPrices = async () => {
    if (!window.confirm('Sync prices for the oldest 20 products?')) return;
    setToast({ show: true, message: '🔄 Syncing prices...', type: 'info' });
    const res = await fetch('https://smartchoose-proxy.vercel.app/api/cron/price-sync.js');
    const data = await res.json();
    setToast({ show: true, message: data.success ? \`✅ Synced \${data.synced} products!\` : '❌ Sync failed.', type: data.success ? 'success' : 'error' });
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterStatus === 'published') list = list.filter(p => p.published);
    return list;
  }, [products, searchTerm, filterStatus]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Icon name="package" size={32} className="text-emerald-500" />Product Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage your storefront index & affiliate links</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleSyncPrices} className="border-2 border-emerald-500 text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"><Icon name="refresh-cw" size={18} />Sync Prices</button>
          <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"><Icon name="plus" size={20} />Add Product</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 text-left text-xs uppercase font-bold text-slate-500">Product</th>
                <th className="px-5 py-4 text-left text-xs uppercase font-bold text-slate-500">Price</th>
                <th className="px-5 py-4 text-left text-xs uppercase font-bold text-slate-500">Platform</th>
                <th className="px-5 py-4 text-right text-xs uppercase font-bold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors group" onClick={() => handleEdit(product)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-50 rounded-lg border border-slate-100 overflow-hidden flex items-center justify-center p-1"><img src={product.images?.[0] || 'https://via.placeholder.com/60'} className="w-full h-full object-contain" /></div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate max-w-[250px]">{product.title}</p>
                        {product.platform !== 'Amazon' && (!product.affiliateLink || (!product.affiliateLink.includes('ekaro') && !product.affiliateLink.includes('earnkaro'))) && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase mt-1 inline-block">Fix Affiliate</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><div className="font-bold text-slate-800">{product.price}</div></td>
                  <td className="px-5 py-3"><PlatformBadge url={product.affiliateLink} name={product.platform} /></td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setAnalyticsProductId(product.id); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Analytics"><Icon name="bar-chart-2" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBroadcast(product.id); }} disabled={isBroadcasting === product.id || !product.published} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Broadcast"><Icon name="share-2" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Edit"><Icon name="edit" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getProductUrl(product.id)); setToast({show:true, message:'Link copied', type:'success'}); }} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg" title="Copy Link"><Icon name="link" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(product.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Icon name="trash-2" size={16} /></button>
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
          <div className="fixed inset-0 z-50 flex justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto items-start">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">{editingProduct ? 'Edit' : 'Add'} Product</h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"><Icon name="x" size={24} /></button>
              </div>
              <div className="p-6">
                {!editingProduct && (
                  <div className="mb-6 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-900 px-4 py-3 flex items-center gap-2"><Icon name="cpu" size={16} className="text-emerald-400" /><span className="text-white font-bold text-xs">AI Extraction Tool</span></div>
                    <div className="p-4 bg-slate-50/50 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">1. Source URL (Product Page)</label>
                        <div className="flex gap-2">
                           <input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none text-sm focus:border-emerald-500 transition-all" placeholder="Paste Amazon/Flipkart/Ajio/Myntra link..." />
                           <button onClick={handleAutoFetch} disabled={!sourceUrl || isFetching} className="bg-emerald-600 hover:bg-emerald-700 px-6 rounded-xl text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/10 flex items-center gap-2">{isFetching?<Icon name="loader-2" size={16} className="animate-spin"/>:<Icon name="zap" size={16}/>}{isFetching?'AI...':'Extract'}</button>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-4">
                         <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">2. Affiliate Link (Optional - EarnKaro Helper)</label>
                         <div className="flex gap-2">
                            <input type="url" value={formData.affiliateLinks[0]?.url || ''} onChange={e=>{ const updated=[...formData.affiliateLinks]; updated[0].url=e.target.value; setFormData({...formData, affiliateLinks: updated, affiliateLink: e.target.value}); }} className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none text-sm focus:border-orange-500 transition-all font-mono" placeholder="Paste EarnKaro link here or click helper ->" />
                            {formData.platform !== 'Amazon' && (
                                <button onClick={()=>{
                                    const link = sourceUrl || formData.affiliateLink;
                                    if(!link) return setToast({show:true, message:'Provide Source URL first!', type:'error'});
                                    navigator.clipboard.writeText(link).then(() => {
                                        window.open('https://earnkaro.com/earn/make-link', '_blank');
                                        setToast({show:true, message:'Product URL Copied!', type:'success'});
                                    });
                                }} className="bg-orange-600 hover:bg-orange-700 px-5 rounded-xl text-white font-black text-[10px] uppercase transition-all shadow-lg shadow-orange-900/10 flex items-center gap-1.5"><Icon name="external-link" size={14} /> EarnKaro</button>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                )}
                <form onSubmit={async (e)=>{
                    e.preventDefault();
                    if(editingProduct) await updateProduct(editingProduct.id, formData);
                    else await addProduct(formData);
                    closeModal();
                }} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Product Title *</label>
                        <input type="text" required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Price *</label>
                            <input type="text" required value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Original Price</label>
                            <input type="text" value={formData.originalPrice} onChange={e=>setFormData({...formData, originalPrice: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Product Images</label>
                        <ImageManager images={formData.images} onChange={imgs=>setFormData({...formData, images: imgs})} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <button type="button" onClick={closeModal} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                    <button type="submit" className="bg-emerald-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all">{editingProduct ? 'Update Product' : 'Create Product'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50">
          <Toast message={toast.message} show={toast.show} type={toast.type} onClose={()=>setToast({...toast, show:false})} />
      </div>
      {analyticsProductId && <AnalyticsDetailModal type="product_performance" productId={analyticsProductId} onClose={() => setAnalyticsProductId(null)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div initial={{scale:0.9}} animate={{scale:1}} className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Icon name="trash-2" size={32} /></div>
            <h3 className="text-xl font-bold mb-2">Delete Product?</h3>
            <p className="text-slate-500 text-sm mb-6">This will permanently remove the product.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 py-3 text-slate-600 font-bold">No, Keep</button>
              <button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-900/20">Yes, Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
`);

const fullContent = fileParts.join('');
fs.writeFileSync(originalPath, fullContent, 'utf8');
console.log('✅ AdminProducts.tsx fully reconstructed and optimized.');
