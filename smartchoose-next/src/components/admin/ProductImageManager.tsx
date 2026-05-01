import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/custom/Icon';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full" style={{ maxWidth: SIZE + 40 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <p className="font-bold text-slate-900 text-sm">Square Crop</p>
            <p className="text-xs text-slate-400">Drag to move · Tap ± to zoom</p>
          </div>
          <button type="button" onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Crop preview */}
        <div
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
          {/* Green crop border */}
          {ready && (
            <div className="absolute inset-0 pointer-events-none" style={{ border: '2.5px solid #10b981' }}>
              <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.2)' }} />
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          <button type="button" onClick={() => changeZoom(-0.15)}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xl flex items-center justify-center transition">
            −
          </button>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-xs font-medium text-slate-500">Zoom</span>
            <span className="text-sm font-bold text-slate-800">{Math.round(zoom * 100)}%</span>
          </div>
          <button type="button" onClick={() => changeZoom(0.15)}
            className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xl flex items-center justify-center transition">
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
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition">
            <Icon name="check" size={16} /> Use Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// Image Manager Component
export function ProductImageManager({
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
    if (images.length >= 12) { return; }
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
    const reader = new FileReader();
    reader.onload = ev => openCrop(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-4">
      {cropSrc && (
        <ImageCropModal src={cropSrc} onConfirm={handleCropConfirm} onCancel={() => setCropSrc(null)} />
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => setActiveTab('url')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'url' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
          ADD BY URL
        </button>
         <button type="button" onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'upload' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
          UPLOAD
        </button>
      </div>

      {activeTab === 'url' && (
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-sm" />
          <button type="button" onClick={handleUrlAdd} disabled={images.length >= 12}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 text-sm font-bold">
            Crop
          </button>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <Icon name="upload-cloud" size={32} className="mx-auto text-emerald-400 mb-2" />
          <p className="text-slate-500 text-sm font-bold lowercase">Click to Upload</p>
        </div>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-3 mt-4">
        {images.map((img, idx) => (
          <div key={idx} className="relative aspect-square border-2 border-slate-100 rounded-xl overflow-hidden group bg-white shadow-sm">
            <img src={img} className="w-full h-full object-contain p-1" />
            <button type="button" onClick={() => handleRemove(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="x" size={10} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/80 text-white text-[8px] font-black uppercase text-center py-0.5">
              {idx === 0 ? 'Main' : `Img ${idx + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
