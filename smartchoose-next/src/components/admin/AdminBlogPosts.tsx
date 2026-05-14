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

import { useSearchParams, useRouter } from 'next/navigation';

export function AdminBlogPosts() {
  const { fetchAdminBlogs, addBlog, updateBlog, deleteBlog, broadcastBlog, requestInstantIndexing, siteStats } = useDatabase();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>((searchParams.get('filter') as any) || 'all');
  const [toast, setToast] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const { settings, updateSettings } = useDatabase();
  const [isResearching, setIsResearching] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Countdown timer for Deep Research
  useEffect(() => {
    if (!settings.deepResearchActive || !settings.deepResearchStart) return;
    
    const interval = setInterval(() => {
      const start = new Date(settings.deepResearchStart!).getTime();
      const end = start + (24 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const diff = end - now;
      
      if (diff <= 0) {
        setTimeLeft('Finishing...');
        clearInterval(interval);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [settings.deepResearchActive, settings.deepResearchStart]);

  const handleDeepResearch = async () => {
    if (settings.deepResearchActive) return;
    if (!confirm('Start 24h Deep Research? AI will generate 3 premium drafts throughout the next 24 hours.')) return;
    
    setIsResearching(true);
    try {
      await fetch('/api/workflows/generate-blog-deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: settings.geminiApiKey,
          openaiApiKey: settings.openaiApiKey
        })
      });
      // The workflow will update Firestore, which DatabaseContext will sync back to us
    } catch (e) {
      alert('Failed to start deep research');
    } finally {
      setIsResearching(false);
    }
  };


  // Sync state to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) params.set('q', searchTerm); else params.delete('q');
      if (filterStatus !== 'all') params.set('filter', filterStatus); else params.delete('filter');
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus]);

  // Handle back button for editor view
  useEffect(() => {
    if (view === 'editor') {
      window.history.pushState({ view: 'editor' }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (view === 'editor') {
        setView('list');
        setEditingPost(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [view]);

  const [localBlogs, setLocalBlogs] = useState<BlogPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<any[]>([null]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

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
      if (editingPost) { 
        await updateBlog(editingPost.id, data); 
        if (data.status === 'published') {
          requestInstantIndexing(`https://www.smartchoose.in/blog/${data.slug}`);
        }
      }
      else { 
        const id = await addBlog(data); 
        if (data.status === 'published') {
          broadcastBlog(id);
          requestInstantIndexing(`https://www.smartchoose.in/blog/${data.slug}`);
        }
      }
      setView('list'); setEditingPost(null); loadBlogs(currentPage);
    } catch (e) { alert('Save failed'); } finally { setIsSaving(false); }
  };

  if (view === 'editor') return <BlogEditor initialPost={editingPost} onSave={handleSave} onCancel={()=>{setView('list'); setEditingPost(null);}} isSaving={isSaving} />;

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Icon name="newspaper" size={32} className="text-emerald-500" />
            Editorial Hub
          </h1>
          <p className="text-slate-500 mt-1 font-bold text-xs uppercase tracking-widest opacity-60">High-Performance Content Engine ({siteStats.totalBlogs} articles)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {settings.deepResearchActive ? (
            <div className="bg-amber-50 border border-amber-200 px-6 py-2 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-amber-600 tracking-tighter flex items-center gap-1">
                   <Icon name="brain" size={10} className="animate-pulse" />
                   AI Deep Research Active
                </span>
                <span className="text-sm font-black text-slate-900 font-mono">{timeLeft}</span>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
            </div>
          ) : (
            <button 
              onClick={handleDeepResearch} 
              disabled={isResearching}
              className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 shadow-xl shadow-amber-500/20"
            >
              <Icon name="brain" size={16} className={isResearching ? 'animate-spin' : ''} />
              {isResearching ? 'Starting...' : '24h Deep Research'}
            </button>
          )}
          <button onClick={() => setShowAIGenerator(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-900/20">
            <Icon name="sparkles" size={16} className="text-amber-400" /> AI Generate
          </button>
          <button onClick={() => {setEditingPost(null); setView('editor');}} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/30">
            <Icon name="plus" size={18} /> New Post
          </button>
        </div>

      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shrink-0">
          {['all', 'published', 'draft'].map((s) => (
            <button 
              key={s} 
              onClick={() => setFilterStatus(s as any)} 
              className={`px-4 py-2 text-xs font-bold uppercase rounded-lg transition-colors ${filterStatus === s ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-24 text-center">
            <Icon name="loader-2" size={48} className="animate-spin text-emerald-500 mx-auto mb-4 opacity-20" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Loading Editorial Content...</p>
          </div>
        ) : localBlogs.length === 0 ? (
          <div className="py-24 text-center">
            <Icon name="newspaper" size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No articles found in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {localBlogs.map((post: any) => (
              <div key={post.id} className="p-6 flex items-center gap-6 hover:bg-slate-50/50 cursor-pointer group transition-colors" onClick={() => {setEditingPost(post); setView('editor');}}>
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-sm ring-4 ring-white transition-all group-hover:scale-105">
                  <img src={post.featuredImage || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ring-1 ${post.status === 'published' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{post.status}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{post.category}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight line-clamp-1">{post.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono opacity-60">/blog/{post.slug}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                   <button onClick={(e) => { e.stopPropagation(); window.open(`/blog/${post.slug}`, '_blank'); }} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Icon name="external-link" size={20} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this article forever?')) deleteBlog(post.id).then(() => loadBlogs(currentPage)); }} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icon name="trash-2" size={20} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Page {currentPage} &bull; {totalCount} total articles</span>
           <div className="flex gap-2">
             <button disabled={currentPage === 1 || isLoading} onClick={handlePrevPage} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all">Prev</button>
             <button disabled={localBlogs.length < PAGE_SIZE || isLoading} onClick={handleNextPage} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all">Next</button>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showAIGenerator && (
          <AIBlogGenerator 
            onClose={() => setShowAIGenerator(false)}
            onGenerated={async (data, autoPublish) => {
              setShowAIGenerator(false);
              if (autoPublish) {
                // Auto-publish: save directly to Firebase as 'published'
                setIsSaving(true);
                try {
                  const publishData = { ...data, status: 'published' };
                  const id = await addBlog(publishData);
                  broadcastBlog(id);
                  requestInstantIndexing(`https://www.smartchoose.in/blog/${publishData.slug}`);
                  setToast('✅ Blog published successfully!');
                  setTimeout(() => setToast(''), 3000);
                  loadBlogs(1);
                } catch (e) {
                  alert('Auto-publish failed. Please try saving manually.');
                  setEditingPost(data as any);
                  setView('editor');
                } finally {
                  setIsSaving(false);
                }
              } else {
                // Draft mode: open in editor
                setEditingPost(data as any);
                setView('editor');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminBlogPosts;
