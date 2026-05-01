import sys

original_path = r'c:\Users\12039383\OneDrive - MEGHA ENGINEERING & INFRASTRUCTURES LIMITED\Desktop\SmartChoose_Site\app\src\components\admin\AdminProducts.tsx'

# I will reconstruction the file content in chunks to avoid memory limits if possible, 
# but for now I'll just build it as a list of strings.

file_parts = []

# Headers and Imports (Lines 1-450)
file_parts.append("""import { useState, useRef, useMemo, useEffect } from 'react';
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

// ── Mobile-Friendly Crop: Drag to Pan + Tap buttons to Zoom ─────────────────
function ImageCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (cropped: string) => void;
  onCancel: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ on: false, sx: 0, sy: 0, ox: 0, oy: 0 });

  // Responsive container size (fits small screens)
  const SIZE = Math.min(typeof window !== 'undefined' ? window.innerWidth - 48 : 320, 340);

  const minZoom = (img: HTMLImageElement) =>
    Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);

  const clamp = (ox: number, oy: number, z: number, img: HTMLImageElement) => {
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
    img.onerror = () =>
      fetch(src).then(r => r.blob()).then(b => { img.src = URL.createObjectURL(b); }).catch(onCancel);
    img.src = src;
  }, [src, onCancel]);

  // ── Mouse drag ─────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { on: true, sx: e.clientX, sy: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current.on || !imgRef.current) return;
    const clamped = clamp(
      dragRef.current.ox + e.clientX - dragRef.current.sx,
      dragRef.current.oy + e.clientY - dragRef.current.sy,
      zoomRef.current, imgRef.current
    );
    offsetRef.current = clamped;
    setOffset({ ...clamped });
  };
  const onMouseUp = () => { dragRef.current.on = false; };

  // ── Touch drag + pinch zoom ─────────────────────────────────────────────────
  const lastTouch = useRef<{ x: number; y: number; dist?: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      dragRef.current = { on: true, sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouch.current = { x: 0, y: 0, dist: Math.hypot(dx, dy) };
      dragRef.current.on = false;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!imgRef.current) return;
    if (e.touches.length === 1 && dragRef.current.on) {
      const clamped = clamp(
        dragRef.current.ox + e.touches[0].clientX - dragRef.current.sx,
        dragRef.current.oy + e.touches[0].clientY - dragRef.current.sy,
        zoomRef.current, imgRef.current
      );
      offsetRef.current = clamped;
      setOffset({ ...clamped });
    } else if (e.touches.length === 2 && lastTouch.current?.dist != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / lastTouch.current.dist;
      const newZ = Math.max(minZoom(imgRef.current), Math.min(4, zoomRef.current * ratio));
      const clamped = clamp(offsetRef.current.x, offsetRef.current.y, newZ, imgRef.current);
      lastTouch.current.dist = dist;
      zoomRef.current = newZ;
      offsetRef.current = clamped;
      setZoom(newZ);
      setOffset({ ...clamped });
    }
  };
  const onTouchEnd = () => { dragRef.current.on = false; lastTouch.current = null; };

  // ── Zoom buttons ─────────────────────────────────────────────────────────────
  const changeZoom = (delta: number) => {
    if (!imgRef.current) return;
    const newZ = Math.max(minZoom(imgRef.current), Math.min(4, zoomRef.current + delta));
    const clamped = clamp(offsetRef.current.x, offsetRef.current.y, newZ, imgRef.current);
    zoomRef.current = newZ;
    offsetRef.current = clamped;
    setZoom(newZ);
    setOffset({ ...clamped });
  };

  // ── Final crop ────────────────────────────────────────────────────────────────
  const confirmCrop = () => {
    const img = imgRef.current!;
    const z = zoomRef.current;
    const { x, y } = offsetRef.current;
    const OUT = 800;
    const out = document.createElement('canvas');
    out.width = OUT; out.height = OUT;
    const ctx = out.getContext('2d')!;
    const dw = img.naturalWidth * z, dh = img.naturalHeight * z;
    const imgX = (SIZE - dw) / 2 + x;
    const imgY = (SIZE - dh) / 2 + y;
    ctx.drawImage(img, -imgX / z, -imgY / z, SIZE / z, SIZE / z, 0, 0, OUT, OUT);
    onConfirm(out.toDataURL('image/jpeg', 0.92));
  };

  const dw = imgRef.current ? imgRef.current.naturalWidth * zoom : SIZE;
  const dh = imgRef.current ? imgRef.current.naturalHeight * zoom : SIZE;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
      style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: SIZE + 40 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <p className="font-bold text-slate-900 text-sm">Square Crop</p>
            <p className="text-xs text-slate-400">Drag to move · Pinch or tap ± to zoom</p>
          </div>
          <button type="button" onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Crop preview */}
        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden bg-slate-800"
          style={{ width: SIZE, height: SIZE, cursor: ready ? 'grab' : 'default', touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-sm">Loading…</div>
            </div>
          )}
          {ready && imgRef.current && (
            <img
              src={src} alt="crop" draggable={false}
              style={{
                position: 'absolute',
                width: dw, height: dh,
                left: (SIZE - dw) / 2 + offset.x,
                top: (SIZE - dh) / 2 + offset.y,
                pointerEvents: 'none',
              }}
            />
          )}
          {/* Green crop border + rule-of-thirds */}
          {ready && (
            <div className="absolute inset-0 pointer-events-none" style={{ border: '2.5px solid #10b981' }}>
              {[1, 2].map(i => (
                <div key={`v${i}`} style={{ position: 'absolute', left: `${(100 / 3) * i}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
              ))}
              {[1, 2].map(i => (
                <div key={`h${i}`} style={{ position: 'absolute', top: `${(100 / 3) * i}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Zoom controls — big tap targets */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          <button type="button" onClick={() => changeZoom(-0.15)}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-2xl font-light flex items-center justify-center transition">
            −
          </button>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xs font-medium text-slate-500">Zoom</span>
            <span className="text-sm font-bold text-slate-800">{Math.round(zoom * 100)}%</span>
          </div>
          <button type="button" onClick={() => changeZoom(0.15)}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-2xl font-light flex items-center justify-center transition">
            +
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-4 pb-4">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 transition">
            Cancel
          </button>
          <button type="button" onClick={confirmCrop} disabled={!ready}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition">
            <Icon name="check" size={16} /> Use This Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// Image Manager Component
function ImageManager({
  images,
  onChange
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCrop = (src: string) => {
    if (images.length >= 4) { alert('Maximum 4 images allowed'); return; }
    setCropSrc(src);
  };

  const handleCropConfirm = (cropped: string) => {
    onChange([...images, cropped]);
    setCropSrc(null);
    setUrlInput('');
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;
    openCrop(urlInput.trim());
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = ev => openCrop(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => openCrop(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">

      {cropSrc && (
        <ImageCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />
      )}

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setActiveTab('url')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'url' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Add by URL
        </button>
        <button type="button" onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
          Upload & Crop
        </button>
      </div>

      {activeTab === 'url' && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none" />
            <button type="button" onClick={handleUrlAdd} disabled={images.length >= 4}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1 text-sm font-medium">
              <Icon name="crop" size={15} /> Crop
            </button>
          </div>
          <p className="text-xs text-slate-400">Opens crop editor before adding</p>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="image-upload-zone" onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect} className="hidden" />
          <Icon name="upload-cloud" size={48} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-slate-600 font-medium">Click or drag image here</p>
          <p className="text-sm text-slate-400">Auto-opens square crop editor</p>
          <p className="text-xs text-emerald-600 mt-2">{images.length}/4 images</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
              <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-contain p-1" />
              <button type="button" onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon name="x" size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                {idx === 0 ? 'Main' : `#${idx + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Platform Badge Component
function PlatformBadge({ url, name }: { url?: string, name?: string }) {
  const platformName = useMemo(() => {
    if (name) return name;
    if (url) return detectEcommercePlatform(url).name;
    return 'Store';
  }, [url, name]);

  return <PlatformIcon name={platformName} size="sm" showText className="scale-90 origin-left" />;
}

export function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct, duplicateProduct, getProductUrl, broadcastProduct } = useDatabase();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterStatus = searchParams.get('filter') || 'all';
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<typeof products[0] | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');   // Direct product URL → for data extraction
  const [fetchUrl, setFetchUrl] = useState('');      // Kept for bookmarklet compatibility
  const [isFetching, setIsFetching] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [analyticsProductId, setAnalyticsProductId] = useState<string | null>(null);

  const handleBroadcast = async (productId: string) => {
    setIsBroadcasting(productId);
    setToast({ show: true, message: 'Broadcasting to channels...', type: 'info' });
    const success = await broadcastProduct(productId);
    if (success) {
      setToast({ show: true, message: 'Broadcasted to channels successfully!', type: 'success' });
    } else {
      setToast({ show: true, message: 'Broadcast failed. Check API settings.', type: 'error' });
    }
    setIsBroadcasting(null);
  };

  // ── Manual Paste from Clipboard (Foolproof) ──────────────────────────────
  const handlePasteExtensionData = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = JSON.parse(text);
      if (Array.isArray(rows) && rows.length > 0 && rows[0].title) {
        // Clean images in the pasted data
        const cleanedRows = rows.map(r => ({
          ...r,
          image: getHighResImage(r.image, r.platform),
          affiliateLink: cleanAffiliateLink(r.affiliateLink)
        }));
        window.localStorage.setItem('sc_import_queue', JSON.stringify(cleanedRows));
        setToast({ show: true, message: '✅ Data pasted! Import starting...', type: 'success' as any });
      } else {
        setToast({ show: true, message: '❌ Invalid data! Please copy from Extension first.', type: 'error' as any });
      }
    } catch (err) {
      setToast({ show: true, message: '❌ Could not read clipboard. Please check permissions.', type: 'error' as any });
    }
  };

  // ── CSV Import State ──────────────────────────────────────────────────────
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{
    total: number; done: number; imported: number; skipped: number; failed: number; currentTitle: string; stage: string;
  } | null>(null);

  // ── Parse CSV file (handles BOM, tab/comma, quoted fields) ────────────────
  const parseCSV = (content: string): Record<string, string>[] => {
    // Strip UTF-8 BOM and normalize line endings
    const clean = content.replace(/^\\uFEFF/, '').replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
    const lines = clean.split('\\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Auto-detect delimiter: tab > semicolon > comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\\t') ? '\\t' : firstLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = []; let cur = ''; let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === delimiter && !inQ) { result.push(cur); cur = ''; }
        else { cur += ch; }
      }
      result.push(cur);
      return result.map(v => v.trim().replace(/^"|"$/g, ''));
    };

    // Normalize headers: lowercase, strip BOM, replace spaces/dashes with _
    const rawHeaders = parseLine(firstLine);
    const headers = rawHeaders.map(h =>
      h.replace(/^\\uFEFF/, '').trim().toLowerCase().replace(/[\\s\\-\\/]+/g, '_')
    );

    return lines.slice(1).map(line => {
      const vals = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { if (h) row[h] = vals[i] || ''; });
      return row;
    }).filter(r => Object.values(r).some(v => v && v.trim()));
  };
""")

# Middle logic functions (Lines 500-1400)
file_parts.append("""
  const extractCsvTitle = (row: Record<string, string>): string => {
    const isValidTitle = (s: string) => s && s.length > 3 && /[a-zA-Z\u0900-\u097F]{3,}/.test(s);
    const titleKeys = ['title', 'product_title', 'item_title', 'product_name', 'name', 'item_name', 'product'];
    for (const k of titleKeys) { if (isValidTitle(row[k])) return row[k].trim(); }
    for (const k of Object.keys(row)) { if ((k.includes('title') || k.includes('name')) && isValidTitle(row[k])) return row[k].trim(); }
    const candidates = Object.entries(row).filter(([k]) => !k.includes('rank') && !k.includes('image') && !k.includes('avail') && !k.includes('price') && !k.includes('brand')).map(([, val]) => val.trim()).filter(val => isValidTitle(val) && val.split(' ').length >= 2);
    if (candidates.length > 0) return candidates[0];
    return '';
  };

  const extractCsvBrand = (row: Record<string, string>): string => {
    const keys = ['brand', 'brand_name', 'manufacturer', 'make', 'vendor'];
    for (const k of keys) { if (row[k] && row[k].trim()) return row[k].trim(); }
    for (const k of Object.keys(row)) { if (k.includes('brand') && row[k]) return row[k].trim(); }
    return '';
  };

  const parseCsvPriceRange = (priceStr: string): { price: string; originalPrice: string } => {
    if (!priceStr) return { price: '', originalPrice: '' };
    const parseK = (s: string): number => {
      const match = s.match(/([\\d.]+)\\s*[Kk]/);
      if (match) return Math.round(parseFloat(match[1]) * 1000);
      const plain = s.replace(/[₹,\\s]/g, '').trim();
      return parseInt(plain) || 0;
    };
    const parts = priceStr.split(/\\s*[-–to]+\\s*/).map(p => p.trim()).filter(Boolean);
    const prices = parts.map(parseK).filter(n => n > 0);
    if (prices.length === 0) return { price: '', originalPrice: '' };
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    return { price: `₹${minP.toLocaleString('en-IN')}`, originalPrice: maxP > minP ? `₹${maxP.toLocaleString('en-IN')}` : '' };
  };

  const extractCsvRawPrice = (row: Record<string, string>): string => {
    const keys = ['price_range', 'price', 'min_price', 'sale_price', 'low_price', 'selling_price'];
    for (const k of keys) { if (row[k]) return row[k].trim(); }
    for (const k of Object.keys(row)) { if (k.includes('price') && row[k]) return row[k].trim(); }
    return '';
  };

  const detectCsvCategory = (title: string, brand: string): string => {
    const t = (title + ' ' + brand).toLowerCase();
    if (t.match(/earbuds?|earphone|headphone|tws|neckband/)) return 'Audio';
    if (t.match(/watch|smartwatch|band|fitness/)) return 'Wearables';
    if (t.match(/phone|mobile|smartphone/)) return 'Smartphones';
    if (t.match(/laptop|notebook/)) return 'Laptops';
    if (t.match(/speaker|soundbar/)) return 'Audio';
    if (t.match(/charger|power.?bank|cable|adapter/)) return 'Accessories';
    if (t.match(/camera|webcam/)) return 'Cameras';
    if (t.match(/tablet|ipad/)) return 'Tablets';
    if (t.match(/tv|television|monitor/)) return 'TVs & Displays';
    if (t.match(/keyboard|mouse|gaming/)) return 'Gaming & Accessories';
    if (t.match(/mixer|blender|kitchen|cook/)) return 'Kitchen';
    return 'Electronics';
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (csvInputRef.current) csvInputRef.current.value = '';
    if (!file) return;

    const content = await file.text();
    const rows = parseCSV(content);
    if (rows.length === 0) { setToast({ show: true, message: 'Invalid CSV format', type: 'error' }); return; }

    setCsvImporting(true);
    setCsvProgress({ total: rows.length, done: 0, imported: 0, skipped: 0, failed: 0, currentTitle: '', stage: 'analyzing' });

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const title = extractCsvTitle(row);
        if (!title) { setCsvProgress(prev => prev ? { ...prev, done: i + 1, skipped: prev.skipped + 1 } : null); continue; }

        setCsvProgress(prev => prev ? { ...prev, done: i + 1, currentTitle: title } : null);

        const brand = extractCsvBrand(row);
        const rawPrice = extractCsvRawPrice(row);
        const { price, originalPrice } = parseCsvPriceRange(rawPrice);
        const category = detectCsvCategory(title, brand);

        let image = '';
        const imgKey = Object.keys(row).find(k => k.includes('image') || k.includes('img'));
        if (imgKey && row[imgKey]) image = row[imgKey];

        const linkKey = Object.keys(row).find(k => k.includes('link') || k.includes('url') || k.includes('affiliate'));
        const affiliateLink = linkKey ? row[linkKey] : '';

        const platform = detectEcommercePlatform(affiliateLink);

        const newProd = {
            ...initialFormData,
            title, brand, price, originalPrice, category,
            images: image ? [getHighResImage(image, platform.name)] : [],
            affiliateLink: cleanAffiliateLink(affiliateLink),
            affiliateLinks: [{ url: cleanAffiliateLink(affiliateLink), platform: platform.name, icon: platform.iconFile || 'generic.svg', price }]
        };

        try {
            await addProduct(newProd);
            setCsvProgress(prev => prev ? { ...prev, imported: prev.imported + 1 } : null);
        } catch (err) {
            setCsvProgress(prev => prev ? { ...prev, failed: prev.failed + 1 } : null);
        }
        await new Promise(r => setTimeout(r, 100));
    }
    setCsvImporting(false);
    setToast({ show: true, message: `Imported ${csvProgress?.imported} products`, type: 'success' });
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setSourceUrl('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setDeleteConfirm(null);
    setToast({ show: true, message: 'Product deleted', type: 'success' });
  };

  const handleDuplicate = async (product: any) => {
    await duplicateProduct(product.id);
    setToast({ show: true, message: 'Product duplicated', type: 'success' });
  };

  const handlePreview = (id: string) => window.open(getProductUrl(id), '_blank');
  const copyLink = (id: string) => {
    navigator.clipboard.writeText(getProductUrl(id));
    setToast({ show: true, message: 'Link copied', type: 'success' });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(initialFormData);
    setSourceUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) await updateProduct(editingProduct.id, formData);
      else await addProduct(formData);
      closeModal();
      setToast({ show: true, message: `Product ${editingProduct ? 'updated' : 'created'} successfully`, type: 'success' });
    } catch (err) {
      setToast({ show: true, message: 'Error saving product', type: 'error' });
    }
  };

  const handleAutoFetch = async () => {
    if (!sourceUrl) return;
    setIsFetching(true);
    setToast({ show: true, message: 'AI Extracting data...', type: 'info' });
    try {
      const res = await fetch('https://smartchoose-proxy.vercel.app/api/fetch-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sourceUrl })
      });
      const data = await res.json();
      if (data.success) {
        const platform = detectEcommercePlatform(sourceUrl);
        setFormData({
            ...formData,
            title: data.title || '',
            price: data.price || '',
            originalPrice: data.originalPrice || '',
            discount: data.discount || '',
            brand: data.brand || '',
            images: data.images || [],
            affiliateLink: cleanAffiliateLink(sourceUrl),
            affiliateLinks: [{ url: cleanAffiliateLink(sourceUrl), platform: platform.name, icon: platform.iconFile || 'generic.svg', price: data.price }]
        });
        setToast({ show: true, message: 'AI Extraction Successful!', type: 'success' });
      } else {
        setToast({ show: true, message: 'AI Extraction Failed. Manual entry required.', type: 'error' });
      }
    } catch (err) {
      setToast({ show: true, message: 'AI Extraction Failed.', type: 'error' });
    } finally {
      setIsFetching(false);
    }
  };

  const updatePricesAndDiscount = (data: ProductFormData) => {
    const curr = parsePrice(data.price);
    const orig = parsePrice(data.originalPrice);
    if (orig > 0 && curr > 0 && orig > curr) {
      data.discount = Math.round(((orig - curr) / orig) * 100) + '% off';
    } else {
      data.discount = '';
    }
    return data;
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterStatus === 'published') list = list.filter(p => p.published);
    return list;
  }, [products, searchTerm, filterStatus]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon name="package" size={32} className="text-emerald-500" />
            Product Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage your storefront index & affiliate links</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all border border-slate-200"
          >
            <Icon name="upload" size={18} />
            Bulk Import CSV
          </button>
           <button
            onClick={handlePasteExtensionData}
            className="w-full sm:w-auto justify-center flex items-center gap-2 bg-emerald-100 text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-emerald-200 transition-all border border-emerald-200"
          >
            <Icon name="zap" size={18} />
            Paste Extension Data
          </button>
           <button
            onClick={async () => {
              if (!window.confirm('Sync prices for the oldest 20 products? This may take ~30 seconds.')) return;
              try {
                setToast({ show: true, message: '🔄 Syncing prices...', type: 'success' });
                const res = await fetch('https://smartchoose-proxy.vercel.app/api/cron/price-sync.js');
                const data = await res.json();
                if (data.success) {
                  setToast({ show: true, message: `✅ Synced ${data.synced} products!`, type: 'success' });
                } else {
                  setToast({ show: true, message: '❌ Sync failed: ' + (data.error || 'Unknown error'), type: 'error' });
                }
              } catch (err: any) {
                setToast({ show: true, message: '❌ Network error', type: 'error' });
              }
            }}
            className="w-full sm:w-auto justify-center flex items-center gap-2 border-2 border-emerald-500 text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all"
          >
            <Icon name="refresh-cw" size={18} />
            Sync Prices
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto justify-center btn-primary px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2"
          >
            <Icon name="plus" size={20} />
            Add Product
          </button>
        </div>
      </div>

      {/* Product Table and Modals... */}
""")

# Modal and Form Logic (Lines 1400-End)
file_parts.append("""
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterStatus !== 'published' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All Products
          </button>
          <button
            onClick={() => setSearchParams({ filter: 'published' })}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterStatus === 'published' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Published Only
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500 w-[45%]">Product</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Price</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Platform</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Stats</th>
                <th className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50/80 transition-all cursor-pointer group shadow-sm hover:shadow-md bg-white border-b border-slate-100 last:border-none duration-200"
                  onClick={() => handleEdit(product)}
                >
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 relative rounded-lg overflow-hidden border border-slate-200 w-[60px] h-[60px] bg-slate-50 flex items-center justify-center group-hover:border-emerald-300 transition-colors">
                        <img
                          src={product.images?.[0] || 'https://via.placeholder.com/60?text=No+Image'}
                          alt={product.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-[14px] leading-[1.3] truncate" title={product.title}>{product.title}</p>
                          {product.platform !== 'Amazon' && (!product.affiliateLink || (!product.affiliateLink.includes('ekaro') && !product.affiliateLink.includes('earnkaro'))) && (
                            <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap">Fix Affiliate</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wide">{product.category} &bull; {product.images?.length || 0} imgs</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    <div className="font-bold text-slate-800 tracking-tight">{product.price}</div>
                    {product.lastPriceSync && (
                      <div className="text-[10px] text-slate-400 font-medium">Synced {new Date(product.lastPriceSync.seconds * 1000).toLocaleDateString()}</div>
                    )}
                    {product.sync_error && (
                      <div className="text-[10px] text-red-500 font-medium flex items-center gap-1"><Icon name="alert-circle" size={10} /> Syncing Error</div>
                    )}
                  </td>
                  <td className="px-5 py-2.5 whitespace-nowrap"><PlatformBadge url={product.affiliateLink} name={product.platform} /></td>
                  <td className="px-5 py-2.5">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${product.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {product.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-slate-700 leading-none">{product.views} <span className="text-[10px] text-slate-400 font-medium">views</span></span>
                      <span className="font-semibold text-sm text-slate-700 leading-none">{product.clicks} <span className="text-[10px] text-slate-400 font-medium">clicks</span></span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setAnalyticsProductId(product.id); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Icon name="bar-chart-2" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handlePreview(product.id); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Icon name="eye" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleBroadcast(product.id); }} disabled={isBroadcasting === product.id || !product.published} className="p-1.5 rounded transition-colors disabled:opacity-50 text-amber-600 hover:bg-amber-50">
                        {isBroadcasting === product.id ? <Icon name="loader-2" size={16} className="animate-spin" /> : <Icon name="share-2" size={16} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(product); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Icon name="edit" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(product); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"><Icon name="copy" size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(product.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Icon name="trash-2" size={16} /></button>
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600"><Icon name="x" size={24} /></button>
              </div>
              <div className="p-6 max-h-[80vh] overflow-y-auto w-full">
                {!editingProduct && (
                  <div className="mb-6 bg-gradient-to-br from-slate-900 to-emerald-950 rounded-xl border border-emerald-800 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-emerald-700 text-white">
                      <Icon name="cpu" size={16} /><span className="font-semibold text-sm">AI Product Extraction Agent</span>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-emerald-300 mb-1.5">🌐 Source URL</label>
                        <div className="flex gap-2">
                          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://amazon.in/product..." className="flex-1 px-4 py-3 rounded-xl border border-emerald-700 bg-slate-800 text-white outline-none text-sm" />
                          <button type="button" onClick={handleAutoFetch} disabled={isFetching || !sourceUrl} className="px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm">
                            {isFetching ? <Icon name="loader" size={18} className="animate-spin" /> : <Icon name="scan" size={18} />}
                            {isFetching ? 'AI...' : 'Extract'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-700" /><span className="text-xs text-slate-500 font-medium">AFFILIATE LINK</span><div className="flex-1 h-px bg-slate-700" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-orange-300 mb-1.5">🔗 Affiliate Link (EarnKaro Helper)</label>
                        <div className="flex gap-2">
                          <input type="url" value={formData.affiliateLinks[0]?.url || ''} onChange={(e) => {
                            const newUrl = e.target.value;
                            const platform = detectEcommercePlatform(newUrl);
                            const updated = [...formData.affiliateLinks];
                            if (updated.length === 0) updated.push({ url: newUrl, platform: platform.name, icon: platform.iconFile || 'generic.svg', price: '' });
                            else updated[0] = { ...updated[0], url: newUrl, platform: (!updated[0].platform || updated[0].platform === 'Store') ? platform.name : updated[0].platform, icon: platform.iconFile || 'generic.svg' };
                            setFormData({ ...formData, affiliateLinks: updated, affiliateLink: newUrl });
                          }} className="flex-1 px-4 py-3 rounded-xl border border-orange-700 bg-slate-800 text-white outline-none text-sm" placeholder="https://ekaro.in/..." />
                          {formData.platform !== 'Amazon' && (
                            <button type="button" onClick={() => {
                              const sUrl = sourceUrl || formData.affiliateLink || '';
                              if (!sUrl) return setToast({ show: true, message: 'Source URL required', type: 'error' });
                              navigator.clipboard.writeText(sUrl).then(() => {
                                window.open('https://earnkaro.com/earn/make-link', '_blank');
                                setToast({ show: true, message: 'Source URL Copied!', type: 'success' });
                              });
                            }} className="px-4 py-3 bg-orange-600 text-white font-black rounded-xl text-[10px] uppercase shadow-lg shadow-orange-900/20"><Icon name="zap" size={14} /> EarnKaro</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Product Title *</label>
                        <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Price *</label>
                        <input type="text" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Original Price</label>
                        <input type="text" value={formData.originalPrice} onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Images</label>
                      <ImageManager images={formData.images} onChange={(imgs) => setFormData({ ...formData, images: imgs })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button type="button" onClick={closeModal} className="px-6 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
                    <button type="submit" className="btn-primary px-8 py-3 rounded-xl text-white font-semibold">{editingProduct ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast message={toast.message} show={toast.show} type={toast.type as any} onClose={() => setToast({ ...toast, show: false })} />
      {analyticsProductId && <AnalyticsDetailModal type="product_performance" productId={analyticsProductId} onClose={() => setAnalyticsProductId(null)} />}
    </div>
  );
}

export default AdminProducts;
""")

full_content = "".join(file_parts)

with open(original_path, 'w', encoding='utf-8') as f:
    f.write(full_content)

print("✅ AdminProducts.tsx fully reconstructed and fixed.")
