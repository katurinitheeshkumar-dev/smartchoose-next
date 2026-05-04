import { useState, useCallback, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { AIBlogGenerator } from './AIBlogGenerator';
import type { BlogPost, BlogProductBlock } from '@/types';

// ─── helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

const CATEGORIES = ['Earbuds', 'Smartwatch', 'Deals', 'Gadgets', 'Budget Picks', 'Phones', 'Laptops', 'Home', 'Beauty', 'Fashion'];

const emptyProduct = (): BlogProductBlock => ({
  id: generateId(),
  name: '',
  image: '',
  price: '',
  description: '',
  pros: [''],
  affiliateLink: '',
});

const emptyPost = (): Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  slug: '',
  category: 'Gadgets',
  type: 'value',
  featuredImage: '',
  intro: '',
  products: [emptyProduct()],
  template: 'standard',
  content: '',
  seoTitle: '',
  seoDescription: '',
  metaDescription: '',
  tags: [],
  status: 'draft',
});

function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const color = len > max ? 'text-red-500' : len > max * 0.85 ? 'text-amber-500' : 'text-slate-400';
  return <span className={`text-xs font-mono ${color}`}>{len}/{max}</span>;
}

function ProductBlockEditor({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  block: BlogProductBlock;
  index: number;
  total: number;
  onChange: (updated: BlogProductBlock) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const { getProductById } = useDatabase();
  const [fetchUrl, setFetchUrl] = useState(block.smartChooseId || '');
  const [isFetching, setIsFetching] = useState(false);

  const handleFetch = async () => {
    if (!fetchUrl) return;
    setIsFetching(true);
    let productId = fetchUrl.trim();
    if (productId.includes('/product/')) {
      const match = productId.match(/\/product\/([a-z0-9-]+)/i);
      if (match) productId = match[1];
    }
    const product = await getProductById(productId);
    if (product) {
      onChange({
        ...block,
        name: product.title,
        price: product.price,
        image: product.images[0] || '',
        description: product.description.slice(0, 150) + (product.description.length > 150 ? '...' : ''),
        pros: product.pros?.length ? product.pros : [''],
        affiliateLink: product.affiliateLink || (product.affiliateLinks?.[0]?.url || ''),
        smartChooseId: product.id
      });
    } else {
      alert('Product not found in SmartChoose database.');
    }
    setIsFetching(false);
  };

  const updateList = (key: 'pros', idx: number, val: string) => {
    const currentList = Array.isArray(block[key]) ? block[key] : [''];
    const arr = [...currentList];
    arr[idx] = val;
    onChange({ ...block, [key]: arr });
  };

  const addItem = (key: 'pros') => {
    const currentList = Array.isArray(block[key]) ? block[key] : [''];
    onChange({ ...block, [key]: [...currentList, ''] });
  };
  const removeItem = (key: 'pros', idx: number) => {
    const currentList = Array.isArray(block[key]) ? block[key] : [''];
    const arr = currentList.filter((_, i) => i !== idx);
    onChange({ ...block, [key]: arr.length ? arr : [''] });
  };

  return (
    <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 relative group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">{index + 1}</span>
          Product Block
        </span>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button onClick={() => onMove('up')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              <Icon name="chevron-up" size={16} />
            </button>
          )}
          {index < total - 1 && (
            <button onClick={() => onMove('down')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
              <Icon name="chevron-down" size={16} />
            </button>
          )}
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors">
            <Icon name="trash-2" size={16} />
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mb-2">
          <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Quick Fill from SmartChoose</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs" placeholder="Paste product URL or ID" value={fetchUrl} onChange={e => setFetchUrl(e.target.value)} />
            <button onClick={handleFetch} disabled={isFetching || !fetchUrl} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1">
              {isFetching ? <Icon name="loader-2" size={12} className="animate-spin" /> : <Icon name="zap" size={12} />}
              Fetch
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
          <input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" value={block.name} onChange={e => onChange({ ...block, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Price *</label>
          <input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" value={block.price} onChange={e => onChange({ ...block, price: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Product Image URL</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm" value={block.image} onChange={e => onChange({ ...block, image: e.target.value })} />
            <label className="cursor-pointer p-2 bg-slate-100 rounded-xl"><Icon name="upload" size={16} /><input type="file" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try {
                const storageRef = ref(storage, `blogs/products/${Date.now()}-${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                onChange({ ...block, image: url });
              } catch (err) { alert('Upload failed'); }
            }} /></label>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
          <textarea rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none" value={block.description} onChange={e => onChange({ ...block, description: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Affiliate Link *</label>
          <input className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-emerald-700" value={block.affiliateLink} onChange={e => onChange({ ...block, affiliateLink: e.target.value })} />
        </div>
        <div className="sm:col-span-2 space-y-3">
          <label className="block text-xs font-bold text-emerald-600 uppercase flex items-center gap-1"><Icon name="check-circle" size={14} /> Top Benefits</label>
          <div className="space-y-2">
            {(block.pros || ['']).map((pro, i) => (
              <div key={i} className="flex gap-2">
                <input className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm" value={pro} onChange={e => updateList('pros', i, e.target.value)} />
                {(block.pros || []).length > 1 && <button onClick={() => removeItem('pros', i)} className="text-rose-500"><Icon name="x" size={16} /></button>}
              </div>
            ))}
            <button onClick={() => addItem('pros')} className="text-xs font-bold text-emerald-600 flex items-center gap-1"><Icon name="plus" size={14} /> Add Benefit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogEditor({ initialPost, onSave, onCancel, isSaving }: any) {
  const [form, setForm] = useState<Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>>(() => {
    if (initialPost) return { ...initialPost };
    return emptyPost();
  });
  const [slugManual, setSlugManual] = useState(!!initialPost);

  const setField = (key: any, val: any) => setForm(f => ({ ...f, [key]: val }));
  const handleTitleChange = (val: string) => {
    setField('title', val);
    if (!slugManual) setField('slug', slugify(val));
    if (!form.seoTitle) setField('seoTitle', val);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><Icon name="arrow-left" size={20} /></button>
        <div><h2 className="text-xl font-bold">{initialPost ? 'Edit Blog Post' : 'New Blog Post'}</h2></div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5">Title *</label>
          <input className="w-full px-4 py-3 rounded-xl border border-slate-200 text-lg font-semibold" value={form.title} onChange={e => handleTitleChange(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Category</label>
            <select className="w-full px-3 py-2.5 rounded-xl border" value={form.category} onChange={e => setField('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Featured Image URL</label>
            <input className="w-full px-3 py-2 rounded-xl border" value={form.featuredImage} onChange={e => setField('featuredImage', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1.5">Intro Paragraph *</label>
          <textarea rows={3} className="w-full px-4 py-3 rounded-xl border resize-none" value={form.intro} onChange={e => setField('intro', e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Icon name="package" size={18} /> Product Blocks</h3>
          <button onClick={() => setField('products', [...form.products, emptyProduct()])} className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-200">+ Add Product</button>
        </div>
        <div className="space-y-4">
          {form.products.map((block, idx) => (
            <ProductBlockEditor key={block.id} block={block} index={idx} total={form.products.length} onChange={upd => setField('products', form.products.map((p,i)=>i===idx?upd:p))} onRemove={()=>setField('products', form.products.filter((_,i)=>i!==idx))} onMove={dir=>{
              const arr = [...form.products]; const swap = dir==='up'?idx-1:idx+1; [arr[idx], arr[swap]] = [arr[swap], arr[idx]]; setField('products', arr);
            }} />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pb-8">
        <button onClick={() => onSave({ ...form, status: 'draft' })} disabled={isSaving} className="px-8 py-3 rounded-xl border font-bold">Save as Draft</button>
        <button onClick={() => onSave({ ...form, status: 'published' })} disabled={isSaving} className="px-8 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-lg">Publish</button>
        <button onClick={onCancel} className="px-8 py-3 rounded-xl border text-slate-500">Cancel</button>
      </div>
    </div>
  );
}

export function AdminBlogPosts() {
  const { fetchAdminBlogs, addBlog, updateBlog, deleteBlog, broadcastBlog, siteStats } = useDatabase();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [toast, setToast] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const [localBlogs, setLocalBlogs] = useState<BlogPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<any[]>([null]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadBlogs = useCallback(async (page: number, isNext: boolean = true) => {
    setIsLoading(true);
    const lastVisible = pageHistory[page - 1];
    const result = await fetchAdminBlogs(PAGE_SIZE, lastVisible, debouncedSearch, filterStatus);
    setLocalBlogs(result.blogs);
    setTotalCount(result.totalCount);
    if (isNext && result.lastVisible && pageHistory.length <= page) {
      setPageHistory(prev => [...prev, result.lastVisible]);
    }
    setIsLoading(false);
  }, [fetchAdminBlogs, debouncedSearch, filterStatus, pageHistory]);

  useEffect(() => {
    setCurrentPage(1);
    setPageHistory([null]);
    loadBlogs(1);
  }, [debouncedSearch, filterStatus]);

  const handleNextPage = () => { if (localBlogs.length < PAGE_SIZE) return; const n = currentPage + 1; setCurrentPage(n); loadBlogs(n, true); };
  const handlePrevPage = () => { if (currentPage <= 1) return; const p = currentPage - 1; setCurrentPage(p); loadBlogs(p, false); };

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      if (editingPost) { await updateBlog(editingPost.id, data); }
      else { const id = await addBlog(data); if (data.status === 'published') broadcastBlog(id); }
      setView('list'); setEditingPost(null); loadBlogs(currentPage);
    } catch (e) { alert('Save failed'); } finally { setIsSaving(false); }
  };

  if (view === 'editor') return <BlogEditor initialPost={editingPost} onSave={handleSave} onCancel={()=>{setView('list'); setEditingPost(null);}} isSaving={isSaving} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Icon name="newspaper" size={26} className="text-emerald-500" /> Blog Posts</h1>
          <p className="text-slate-500 text-sm mt-0.5">High-performance editorial management ({siteStats.totalBlogs} total)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAIGenerator(true)} className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
            <Icon name="sparkles" size={18} />
            AI Generate
          </button>
          <button onClick={()=>{setEditingPost(null); setView('editor');}} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg">+ New Post</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm" placeholder="Search posts..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'published', 'draft'].map((s: string) => (
            <button key={s} onClick={()=>setFilterStatus(s as any)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold capitalize ${filterStatus === s ? 'bg-emerald-500 text-white' : 'bg-white border'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center"><Icon name="loader-2" size={40} className="animate-spin text-emerald-500 mx-auto" /></div>
        ) : localBlogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-bold uppercase text-xs">No posts found</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {localBlogs.map((post: any) => (
              <div key={post.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer group" onClick={()=>{setEditingPost(post); setView('editor');}}>
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img src={post.featuredImage || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${post.status==='published'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-400'}`}>{post.status}</span>
                    <span className="text-[10px] text-slate-400 font-mono">/blog/{post.slug}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{post.title}</h3>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e)=>{e.stopPropagation(); window.open(`/blog/${post.slug}`, '_blank');}} className="p-2 text-slate-400 hover:text-emerald-500"><Icon name="external-link" size={18} /></button>
                   <button onClick={(e)=>{e.stopPropagation(); if(confirm('Delete?')) deleteBlog(post.id).then(()=>loadBlogs(currentPage));}} className="p-2 text-slate-400 hover:text-red-500"><Icon name="trash-2" size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
           <span className="text-[10px] font-black text-slate-400 uppercase">Page {currentPage} &bull; {totalCount} total</span>
           <div className="flex gap-2">
             <button disabled={currentPage===1 || isLoading} onClick={handlePrevPage} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black uppercase disabled:opacity-30">Prev</button>
             <button disabled={localBlogs.length < PAGE_SIZE || isLoading} onClick={handleNextPage} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black uppercase disabled:opacity-30">Next</button>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showAIGenerator && (
          <AIBlogGenerator 
            onClose={() => setShowAIGenerator(false)}
            onGenerated={(data) => {
              setEditingPost(data as any);
              setView('editor');
              setShowAIGenerator(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminBlogPosts;
