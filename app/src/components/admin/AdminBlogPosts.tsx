import { useState, useCallback, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

// ─── Empty templates ───────────────────────────────────────────────────────────
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

// ─── Character counter badge ───────────────────────────────────────────────────
function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const color = len > max ? 'text-red-500' : len > max * 0.85 ? 'text-amber-500' : 'text-slate-400';
  return <span className={`text-xs font-mono ${color}`}>{len}/{max}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Product Block Editor
// ═══════════════════════════════════════════════════════════════════════════════
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

  const handleFetch = () => {
    if (!fetchUrl) return;
    setIsFetching(true);

    // Extract ID from URL if full link provided
    let productId = fetchUrl.trim();
    if (productId.includes('/product/')) {
      const match = productId.match(/\/product\/([a-z0-9-]+)/i);
      if (match) productId = match[1];
    }

    const product = getProductById(productId);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">{index + 1}</span>
          Product Block
        </span>
        <div className="flex items-center gap-1">
          {index > 0 && (
            <button onClick={() => onMove('up')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors" title="Move up">
              <Icon name="chevron-up" size={16} />
            </button>
          )}
          {index < total - 1 && (
            <button onClick={() => onMove('down')} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors" title="Move down">
              <Icon name="chevron-down" size={16} />
            </button>
          )}
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors" title="Remove block">
            <Icon name="trash-2" size={16} />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Fetch from SmartChoose */}
        <div className="sm:col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mb-2">
          <label className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Quick Fill from SmartChoose</label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              placeholder="Paste product URL or ID (e.g. sc-xxxx)"
              value={fetchUrl}
              onChange={e => setFetchUrl(e.target.value)}
            />
            <button
              onClick={handleFetch}
              disabled={isFetching || !fetchUrl}
              className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isFetching ? <Icon name="loader-2" size={12} className="animate-spin" /> : <Icon name="zap" size={12} />}
              Fetch
            </button>
          </div>
        </div>

        {/* Product Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
          <input
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            placeholder="e.g. boAt Airdopes 141"
            value={block.name}
            onChange={e => onChange({ ...block, name: e.target.value })}
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Price *</label>
          <input
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            placeholder="e.g. ₹1,299"
            value={block.price}
            onChange={e => onChange({ ...block, price: e.target.value })}
          />
        </div>

        {/* Image URL */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Product Image URL</label>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              placeholder="https://..."
              value={block.image}
              onChange={e => onChange({ ...block, image: e.target.value })}
            />
            
            <div className="flex gap-2 shrink-0">
              <label className="cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors" title="Upload Image">
                <Icon name="upload" size={16} />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const storageRef = ref(storage, `blogs/products/${Date.now()}-${file.name}`);
                      await uploadBytes(storageRef, file);
                      const url = await getDownloadURL(storageRef);
                      onChange({ ...block, image: url });
                    } catch (err) {
                      alert('Upload failed');
                    }
                  }}
                />
              </label>
              {block.image && (
                <img src={block.image} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
          </div>
        </div>

        {/* Short Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
            placeholder="1-2 sentence summary of this product..."
            value={block.description}
            onChange={e => onChange({ ...block, description: e.target.value })}
          />
        </div>

        {/* Affiliate Link */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center justify-between">
            <span>Affiliate / Product Link *</span>
            <span className="text-[10px] text-slate-400 font-normal">Default: amazon.in/smartchoose</span>
          </label>
          <div className="relative group/link">
            <input
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent font-medium text-emerald-700"
              placeholder="Paste your affiliate link (Amazon, FlipKart, etc.)"
              value={block.affiliateLink}
              onChange={e => onChange({ ...block, affiliateLink: e.target.value })}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500">
              <Icon name="link" size={14} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Replace this with your custom affiliate link to earn commission. If empty, the original product link will be used.</p>
        </div>
        {/* Top Benefits (Pros) */}
        <div className="sm:col-span-2 space-y-3">
          <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <Icon name="check-circle" size={14} /> Top Benefits (Pros)
          </label>
          <div className="space-y-2">
            {(block.pros || ['']).map((pro, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex-1 relative">
                  <Icon name="check" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                    placeholder="e.g. Exceptional battery life"
                    value={pro}
                    onChange={e => updateList('pros', i, e.target.value)}
                  />
                </div>
                {(block.pros || []).length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem('pros', i)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Icon name="x" size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addItem('pros')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <Icon name="plus" size={14} /> Add Benefit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Blog Post Editor
// ═══════════════════════════════════════════════════════════════════════════════
function BlogEditor({
  initialPost,
  onSave,
  onCancel,
  isSaving,
}: {
  initialPost: BlogPost | null;
  onSave: (data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>>(() => {
    try {
      if (initialPost) {
        return {
          title: initialPost.title || '',
          slug: initialPost.slug || '',
          category: initialPost.category || 'Gadgets',
          type: initialPost.type || 'value',
          featuredImage: initialPost.featuredImage || '',
          intro: initialPost.intro || '',
          products: Array.isArray(initialPost.products) && initialPost.products.length 
            ? initialPost.products.map(p => ({
                ...p,
                pros: Array.isArray(p.pros) ? p.pros : [''],
              }))
            : [emptyProduct()],
          template: initialPost.template || 'standard',
          content: initialPost.content || '',
          seoTitle: initialPost.seoTitle || initialPost.title || '',
          seoDescription: initialPost.seoDescription || initialPost.metaDescription || (initialPost.intro ? initialPost.intro.substring(0, 157) + '...' : initialPost.title || ''),
          metaDescription: initialPost.metaDescription || initialPost.seoDescription || (initialPost.intro ? initialPost.intro.substring(0, 157) + '...' : initialPost.title || ''),
          tags: Array.isArray(initialPost.tags) ? initialPost.tags : [],
          status: initialPost.status || 'draft',
        };
      }
    } catch (e) {
      console.error("Failed to initialize blog form:", e);
    }
    return emptyPost();
  });
  const [slugManual, setSlugManual] = useState(!!initialPost);

  const setField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleTitleChange = (val: string) => {
    setField('title', val);
    if (!slugManual) setField('slug', slugify(val));
    if (!form.seoTitle) setField('seoTitle', val);
  };

  const updateProduct = (idx: number, updated: BlogProductBlock) =>
    setField('products', (form.products || []).map((p, i) => (i === idx ? updated : p)));

  const removeProduct = (idx: number) =>
    setField('products', (form.products || []).filter((_, i) => i !== idx));

  const moveProduct = (idx: number, dir: 'up' | 'down') => {
    const arr = [...form.products];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setField('products', arr);
  };

  const addProduct = () => setField('products', [...form.products, emptyProduct()]);

  const handleSubmit = async (status: 'draft' | 'published') => {
    await onSave({ ...form, status });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <Icon name="arrow-left" size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{initialPost ? 'Edit Blog Post' : 'New Blog Post'}</h2>
          <p className="text-sm text-slate-500">Create an SEO-optimized page that ranks on Google</p>
        </div>
      </div>

      {/* ── BASIC INFO ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Icon name="file-text" size={18} className="text-emerald-500" />Basic Info</h3>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title *</label>
          <input
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-lg font-semibold"
            placeholder="e.g. Best Earbuds Under ₹2000 in 2025"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-mono shrink-0">smartchoose.in/</span>
            <input
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              value={form.slug}
              onChange={e => { setSlugManual(true); setField('slug', slugify(e.target.value)); }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Auto-generated from title. Click to edit.</p>
        </div>

        {/* Blog Type + Template Selector */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blog Content Strategy *</label>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {(['value', 'product'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setField('type', t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.type === t ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t === 'value' ? '🚀 Value Content (Traffic)' : '💰 Product Review (Sales)'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {form.type === 'value' ? 'Focuses on tips, guides, and life hacks to drive organic Google traffic.' : 'Focuses on direct product comparisons and "Best Of" lists to drive sales.'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Page Template</label>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {(['standard', 'guide', 'minimal'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setField('template', t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.template === t ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {form.template === 'standard' && 'Standard layout with reviews.'}
              {form.template === 'guide' && 'Detailed article with body content.'}
              {form.template === 'minimal' && 'Informational/No review blocks.'}
            </p>
          </div>
        </div>

        {/* Category + Featured Image */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
            <select
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={form.category}
              onChange={e => setField('category', e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Featured Image URL</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="https://..."
                value={form.featuredImage}
                onChange={e => setField('featuredImage', e.target.value)}
              />
              
              <div className="flex gap-2 shrink-0">
                <label className="cursor-pointer px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-xl transition-all shadow-sm flex items-center justify-center" title="Upload Image">
                  <Icon name="upload" size={18} />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const storageRef = ref(storage, `blogs/featured/${Date.now()}-${file.name}`);
                        await uploadBytes(storageRef, file);
                        const url = await getDownloadURL(storageRef);
                        setField('featuredImage', url);
                      } catch (err) {
                        alert('Featured image upload failed');
                      }
                    }}
                  />
                </label>
                {form.featuredImage && (
                  <img src={form.featuredImage} alt="preview" className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-sm" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Intro */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Intro Paragraph *</label>
          <textarea
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Brief introduction to the blog post. This appears at the top of the page..."
            value={form.intro}
            onChange={e => setField('intro', e.target.value)}
          />
        </div>

        {/* Main Content (For Guide/Minimal) */}
        {(form.template === 'guide' || form.template === 'minimal') && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-700">Main Content (Body) *</label>
              <CharCount value={form.content || ''} max={5000} />
            </div>
            <textarea
              rows={12}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-sans leading-relaxed"
              placeholder="Write your main article content here. Use double newlines for paragraphs..."
              value={form.content}
              onChange={e => setField('content', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── PRODUCT BLOCKS ── */}
      {form.template !== 'minimal' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Icon name="package" size={18} className="text-emerald-500" />
              Product Blocks
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">{form.products.length}</span>
            </h3>
            <button
              onClick={addProduct}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              <Icon name="plus" size={16} />
              Add Product
            </button>
          </div>

          <div className="space-y-4">
            {form.products.map((block, idx) => (
              <ProductBlockEditor
                key={block.id}
                block={block}
                index={idx}
                total={form.products.length}
                onChange={updated => updateProduct(idx, updated)}
                onRemove={() => removeProduct(idx)}
                onMove={dir => moveProduct(idx, dir)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── SEO SETTINGS ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Icon name="search" size={18} className="text-emerald-500" />
          SEO Settings
        </h3>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">Meta Title</label>
            <CharCount value={form.seoTitle} max={60} />
          </div>
          <input
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="e.g. Best Earbuds Under ₹2000 [2025] | SmartChoose"
            value={form.seoTitle}
            onChange={e => setField('seoTitle', e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Optimal: 50–60 characters</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-700">Meta Description</label>
            <CharCount value={form.seoDescription} max={160} />
          </div>
          <textarea
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Describe what readers will find on this page. Include your main keyword..."
            value={form.seoDescription}
            onChange={e => setField('seoDescription', e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">Optimal: 120–160 characters</p>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Search Tags (Comma separated)</label>
          <input
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="e.g. android, tips, battery-life, deals"
            value={form.tags?.join(', ') || ''}
            onChange={e => setField('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          />
        </div>

        {/* Google Preview */}
        {form.seoTitle && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Google Preview</p>
            <p className="text-blue-600 text-base font-medium hover:underline cursor-pointer line-clamp-1">{form.seoTitle}</p>
            <p className="text-green-700 text-xs mt-0.5">smartchoose.in › {form.slug || 'your-slug'}</p>
            <p className="text-slate-600 text-sm mt-1 line-clamp-2">{form.seoDescription || 'No description set...'}</p>
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-8">
        <button
          onClick={() => handleSubmit('draft')}
          disabled={isSaving || !form.title || !form.slug}
          className="flex-1 sm:flex-none sm:w-48 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Icon name="loader-2" size={18} className="animate-spin" /> : <Icon name="save" size={18} />}
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit('published')}
          disabled={isSaving || !form.title || !form.slug}
          className="flex-1 sm:flex-none sm:w-48 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {isSaving ? <Icon name="loader-2" size={18} className="animate-spin" /> : <Icon name="globe" size={18} />}
          Publish
        </button>
        <button onClick={onCancel} className="flex-1 sm:flex-none sm:w-32 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Magic Progress Modal ─────────────────────────────────────────────────────
function MagicProgressModal({ 
  isOpen, 
  onClose, 
  logs, 
  title, 
  progress 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  logs: string[]; 
  title: string;
  progress: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Icon name="terminal" size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold leading-tight">{title}</h3>
              <p className="text-slate-500 text-xs mt-0.5">SmartChoose AI Editorial Brain is active</p>
            </div>
          </div>
          {progress === 100 && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
            >
              <Icon name="x" size={20} />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-800">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Console View */}
        <div className="p-6 bg-slate-950 font-mono text-xs overflow-y-auto max-h-[400px] space-y-2 custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
              <span className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('ERROR') ? 'text-rose-400' : 'text-slate-300'}>
                {log}
              </span>
            </div>
          ))}
          {progress < 100 && (
            <div className="flex items-center gap-2 text-emerald-500 animate-pulse">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Icon name="cpu" size={14} className="animate-spin" />
            Model: Groq Llama-3.3-70b
          </div>
          {progress === 100 && (
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomMagicModal({
  isOpen,
  onClose,
  onSubmit
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
}) {
  const [title, setTitle] = useState('');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <m.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                <Icon name="sparkles" size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Custom Title Magic</h2>
              <p className="text-sm text-slate-500 mb-6">Enter a specific title or niche topic. The AI will write a complete 1500-word guide perfectly tailored to it.</p>
              
              <input
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Best Smart Coffee Makers 2026"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-900 placeholder-slate-400 transition-shadow"
                onKeyDown={e => {
                  if (e.key === 'Enter' && title.trim()) {
                    onSubmit(title.trim());
                    setTitle('');
                  }
                }}
              />
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (title.trim()) {
                    onSubmit(title.trim());
                    setTitle('');
                  }
                }}
                disabled={!title.trim()}
                className="px-5 py-2.5 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-rose-500/20"
              >
                <Icon name="zap" size={16} />
                Generate
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main AdminBlogPosts Component
// ═══════════════════════════════════════════════════════════════════════════════
export function AdminBlogPosts() {
  const { blogPosts, addBlog, updateBlog, deleteBlog, broadcastBlog } = useDatabase();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [toast, setToast] = useState('');

  // Magic Progress State
  const [customTitleModalOpen, setCustomTitleModalOpen] = useState(false);
  const [magicProgress, setMagicProgress] = useState({
    isOpen: false,
    logs: [] as string[],
    title: '',
    current: 0
  });

  const addLog = (log: string) => setMagicProgress(p => ({ ...p, logs: [...p.logs, log] }));
  const updateProgress = (val: number) => setMagicProgress(p => ({ ...p, current: val }));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filtered = useMemo(() => {
    return (blogPosts || []).filter(b => {
      const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || b.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [blogPosts, search, filterStatus]);

  const handleSave = useCallback(async (data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSaving(true);
    try {
      if (editingPost) {
        await updateBlog(editingPost.id, data);
        showToast('Post updated successfully!');
      } else {
        const blogId = await addBlog(data);
        showToast(data.status === 'published' ? 'Post published! Broadcasting alerts...' : 'Draft saved!');
        
        // Auto-broadcast new published blogs
        if (data.status === 'published' && blogId) {
          broadcastBlog(blogId);
        }
      }
      setView('list');
      setEditingPost(null);
    } catch (e) {
      showToast('Error saving post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [editingPost, addBlog, updateBlog, broadcastBlog]);

  const handleDelete = async (post: BlogPost) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await deleteBlog(post.id);
    showToast('Post deleted.');
  };

  const handleToggleStatus = async (post: BlogPost) => {
    await updateBlog(post.id, { status: post.status === 'published' ? 'draft' : 'published' });
    showToast(post.status === 'published' ? 'Set to draft.' : 'Published!');
  };

  const runMagic = async (type: 'value' | 'product' | 'deals') => {
    const title = type === 'value' ? 'Traffic Magic (Trending)' : type === 'product' ? 'Conversion Magic (Product)' : 'Deals Magic (Trending Offers)';
    setMagicProgress({ isOpen: true, logs: [`[INFO] Initializing ${title}...`], title, current: 5 });

    try {
      // STEP 1: Research
      addLog('[INFO] Analyzing 2026 search trends and finding low-competition keywords...');
      const topicRes = await fetch(`https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=get-topic&type=${type}&ts=${Date.now()}`);
      const topicData = await topicRes.json();
      if (!topicData.success) throw new Error(topicData.error || 'Failed to fetch topic');
      const { topic } = topicData;
      if (!topic) throw new Error('Topic generation returned empty.');
      
      const { scores } = topic;
      if (scores) {
        addLog(`[SUCCESS] Smart Topic Selected: "${topic.title}"`);
        addLog(`[HUD] 📈 Traffic: ${scores.traffic}/10 | 🎯 Competition: ${scores.competition}/10 | 💰 Intent: ${scores.intent}/10`);
      } else {
        addLog(`[SUCCESS] Topic Found: "${topic.title}"`);
      }
      updateProgress(30);

      // STEP 2: Drafting
      addLog('[INFO] Drafting 1500-word professional editorial guide...');
      const draftRes = await fetch(`https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=get-draft&title=${encodeURIComponent(topic.title)}&type=${type}&ts=${Date.now()}`);
      const draftData = await draftRes.json();
      if (!draftData.success) throw new Error(draftData.error || 'Failed to generate draft');
      const { draft } = draftData;
      addLog(`[SUCCESS] Highly engaging 1200+ word content drafted.`);
      updateProgress(70);

      // STEP 3: SEO & Design
      addLog('[INFO] Optimizing for SEO and creating magazine layout...');
      const finalPost = {
        ...draft,
        type,
        featuredImage: `https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop&keywords=${encodeURIComponent(topic.title)}`,
        template: type === 'value' ? 'guide' : 'standard',
        products: (draft.products || []).map((p: any, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          name: p.name,
          price: p.price,
          image: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop&keywords=${encodeURIComponent(p.imageHint || p.name)}`,
          description: p.description,
          pros: p.pros || [],
          cons: p.cons || [],
          affiliateLink: 'https://smartchoose.in/go/amazon',
          smartChooseId: ''
        }))
      };
      
      // STEP 4: Save
      addLog('[INFO] Publishing to SmartChoose database...');
      const saveRes = await fetch(`https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=save-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPost)
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || 'Failed to save post');
      const { blogId } = saveData;
      addLog(`[SUCCESS] Blog live at: smartchoose.in/${blogId}`);
      updateProgress(100);
    } catch (e: any) {
      addLog(`[ERROR] ${e.message || 'AI Brain had an error. Please try again.'}`);
      updateProgress(100);
    }
  };

  const handleCustomMagicSubmit = async (customTitle: string) => {
    setCustomTitleModalOpen(false);
    setMagicProgress({ isOpen: true, logs: [`[INFO] Initializing Custom Magic Override...`], title: `Custom: ${customTitle}`, current: 5 });

    try {
      // Skips Step 1, goes straight to Drafting
      addLog(`[SUCCESS] Intercepted custom title: "${customTitle}". Enhancing for SEO...`);
      updateProgress(30);

      addLog('[INFO] Generating premium structured content. Injecting SEO power words...');
      const draftRes = await fetch(`https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=get-draft&title=${encodeURIComponent(customTitle)}&type=custom&ts=${Date.now()}`);
      const draftData = await draftRes.json();
      if (!draftData.success) throw new Error(draftData.error || 'Failed to generate draft');
      const { draft } = draftData;
      
      const enhancedTitle = draft.title || customTitle;
      addLog(`[SUCCESS] SEO Optimized Engine selected: "${enhancedTitle}"`);
      updateProgress(70);

      addLog('[INFO] Formatting document tree and locating high-res Unsplash imagery...');
      const finalPost = {
        ...draft,
        type: 'value',
        title: enhancedTitle,
        featuredImage: `https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop&keywords=${encodeURIComponent(enhancedTitle)}`,
        template: 'guide',
        products: (draft.products || []).map((p: any, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          name: p.name,
          price: p.price,
          image: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop&keywords=${encodeURIComponent(p.imageHint || p.name)}`,
          description: p.description,
          pros: p.pros || [],
          cons: p.cons || [],
          affiliateLink: 'https://smartchoose.in/go/amazon',
          smartChooseId: ''
        }))
      };
      
      addLog('[INFO] Publishing directly to SmartChoose Master Database...');
      const saveRes = await fetch(`https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=save-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPost)
      });
      const saveData = await saveRes.json();
      if (!saveData.success) throw new Error(saveData.error || 'Failed to save post');
      const { blogId } = saveData;
      addLog(`[SUCCESS] Blog live at: smartchoose.in/${blogId}`);
      updateProgress(100);
    } catch (e: any) {
      addLog(`[ERROR] ${e.message || 'AI Brain had an error. Please try again.'}`);
      updateProgress(100);
    }
  };

  const runAutoPilot = async () => {
    if (!window.confirm("This will trigger the 24/7 background AutoPilot directly across the cloud, instantly generating a new trending article natively. Proceed?")) return;
    setMagicProgress({ isOpen: true, logs: [`[INFO] Awakening 24/7 AI AutoPilot Engine...`], title: 'AutoPilot Sync', current: 10 });
    try {
      addLog('[INFO] Background process triggered...');
      // Fire and forget fetch request
      fetch(`https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=autopilot&ts=${Date.now()}`);
      await new Promise(r => setTimeout(r, 1500));
      addLog('[SUCCESS] Cloud AutoPilot successfully engaged. The blog will appear on your dashboard in roughly 60 seconds autonomously.');
      updateProgress(100);
    } catch (e: any) {
      addLog(`[ERROR] ${e.message || 'Network error triggering autopilot.'}`);
      updateProgress(100);
    }
  };

  const onNew = () => { setEditingPost(null); setView('editor'); };
  const totalViews = useMemo(() => (blogPosts || []).reduce((acc, b) => acc + (b.views || 0), 0), [blogPosts]);

  if (view === 'editor') {
    return (
      <BlogEditor
        initialPost={editingPost}
        onSave={handleSave}
        onCancel={() => { setView('list'); setEditingPost(null); }}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Icon name="check-circle" size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Icon name="eye" size={16} />
            </div>
            <span className="text-sm font-bold text-slate-500">Total Views</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Icon name="file-text" size={16} />
            </div>
            <span className="text-sm font-bold text-slate-500">Total Posts</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{(blogPosts || []).length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <Icon name="globe" size={16} />
            </div>
            <span className="text-sm font-bold text-slate-500">Published</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{(blogPosts || []).filter(b => b.status === 'published').length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Icon name="edit-3" size={16} />
            </div>
            <span className="text-sm font-bold text-slate-500">Drafts</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{(blogPosts || []).filter(b => b.status === 'draft').length}</div>
        </div>
      </div>

      {/* Magic Progress Modal */}
      <MagicProgressModal 
        isOpen={magicProgress.isOpen}
        onClose={() => setMagicProgress(p => ({ ...p, isOpen: false }))}
        logs={magicProgress.logs}
        title={magicProgress.title}
        progress={magicProgress.current}
      />

      {/* Custom Title Magic Modal */}
      <CustomMagicModal 
        isOpen={customTitleModalOpen}
        onClose={() => setCustomTitleModalOpen(false)}
        onSubmit={handleCustomMagicSubmit}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Icon name="newspaper" size={26} className="text-emerald-500" />
            Blog Posts
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Create SEO pages to rank on Google & drive affiliate sales</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runAutoPilot}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-all text-xs border border-indigo-100 hidden sm:flex"
            title="Trigger 24/7 AutoPilot Task"
          >
            <Icon name="cpu" size={14} />
            AutoPilot 24/7
          </button>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto max-w-[calc(100vw-32px)] sm:max-w-none">
            <button
              onClick={() => setCustomTitleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-all text-xs shrink-0"
            >
              <Icon name="edit-2" size={14} />
              Custom Magic
            </button>
            <button
              onClick={() => runMagic('product')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all text-xs border border-emerald-100 shrink-0"
            >
              <Icon name="shopping-bag" size={14} />
              Conversion Magic
            </button>
            <button
              onClick={() => runMagic('deals')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-all text-xs shrink-0"
            >
              <Icon name="tag" size={14} />
              Deals Magic
            </button>
            <button
              onClick={() => runMagic('value')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all text-xs shrink-0"
            >
              <Icon name="zap" size={14} />
              Traffic Magic
            </button>
          </div>
          <button
            onClick={onNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-green-600 transition-all text-sm shrink-0"
          >
            <Icon name="plus" size={18} />
            New Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Posts', value: (blogPosts || []).length, icon: 'file-text', color: 'slate' },
          { label: 'Published', value: (blogPosts || []).filter(b => b.status === 'published').length, icon: 'globe', color: 'emerald' },
          { label: 'Drafts', value: (blogPosts || []).filter(b => b.status === 'draft').length, icon: 'pencil', color: 'amber' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : stat.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
              <Icon name={stat.icon} size={16} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Search posts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'published', 'draft'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${filterStatus === s ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Posts Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Icon name="newspaper" size={36} />
          </div>
          <h3 className="text-slate-700 font-bold text-lg mb-1">{search ? 'No posts found' : 'No blog posts yet'}</h3>
          <p className="text-slate-400 text-sm mb-6">{search ? 'Try a different search term.' : 'Create your first SEO blog post to start ranking on Google!'}</p>
          {!search && (
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 transition-colors"
            >
              <Icon name="plus" size={16} />
              Create First Post
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <div 
              key={post.id} 
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all p-4 flex items-center gap-4 cursor-pointer group/card"
              onClick={() => { setEditingPost(post); setView('editor'); }}
            >
              {/* Featured Image */}
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {post.featuredImage ? (
                  <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Icon name="image" size={24} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${post.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {post.status}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Icon name="eye" size={10} />
                    {(post.views || 0).toLocaleString()} views
                  </span>
                  <span className="text-[10px] text-slate-400">• {post.category}</span>
                  <span className="text-[10px] text-slate-400">• {(post.products || []).length} products</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm truncate group-hover/card:text-emerald-600 transition-colors">{post.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">/{post.slug}</p>
              </div>

              {/* Date */}
              <div className="shrink-0 text-right hidden sm:block">
                <p className="text-xs text-slate-400">{new Date(post.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="View post"
                >
                  <Icon name="external-link" size={16} />
                </a>
                <button
                  onClick={() => handleToggleStatus(post)}
                  className={`p-2 rounded-lg transition-colors ${post.status === 'published' ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-500'}`}
                  title={post.status === 'published' ? 'Set to draft' : 'Publish'}
                >
                  <Icon name={post.status === 'published' ? 'eye-off' : 'globe'} size={16} />
                </button>
                <button
                  onClick={() => { setEditingPost(post); setView('editor'); }}
                  className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Edit"
                >
                  <Icon name="pencil" size={16} />
                </button>
                <button
                  onClick={() => handleDelete(post)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Icon name="trash-2" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBlogPosts;
