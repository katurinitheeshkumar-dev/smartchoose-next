"use client";
import type { BlogProductBlock } from '@/types';

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < full ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-bold text-slate-600">{rating.toFixed(1)}</span>
    </div>
  );
}

// Badge config
const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  "Editor's Choice":   { label: "🏆 Editor's Choice", bg: "bg-amber-500",   text: "text-white" },
  "Best Value":        { label: "💰 Best Value",       bg: "bg-emerald-500", text: "text-white" },
  "Budget Pick":       { label: "✨ Budget Pick",      bg: "bg-blue-500",    text: "text-white" },
  "Best for Gaming":   { label: "🎮 Best for Gaming",  bg: "bg-purple-600",  text: "text-white" },
  "Top Pick":          { label: "⭐ Top Pick",         bg: "bg-rose-500",    text: "text-white" },
  "Premium Choice":    { label: "👑 Premium Choice",   bg: "bg-slate-800",   text: "text-white" },
};

function AffiliateBadge({ label }: { label: string }) {
  const cfg = BADGE_CONFIG[label] || { label, bg: "bg-slate-600", text: "text-white" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

interface UpgradedProductCardProps {
  block: BlogProductBlock;
  rank: number; // 1-indexed rank
}

export function UpgradedProductCard({ block, rank }: UpgradedProductCardProps) {
  const isTopPick = rank === 1;
  const amazonLink = block.amazonLink || (block.affiliateLink?.includes('amazon') ? block.affiliateLink : null);
  const flipkartLink = block.flipkartLink || (block.affiliateLink?.includes('flipkart') ? block.affiliateLink : null);
  const fallbackLink = block.affiliateLink || (block.smartChooseId ? `https://smartchoose.in/product/${block.smartChooseId}` : '#');

  return (
    <div className={`relative rounded-2xl border overflow-hidden bg-white transition-all hover:shadow-lg ${
      isTopPick
        ? 'border-emerald-300 shadow-md shadow-emerald-100 ring-1 ring-emerald-200'
        : 'border-slate-200 shadow-sm'
    }`}>
      {/* Rank ribbon */}
      <div className={`absolute top-0 left-0 w-10 h-10 flex items-center justify-center text-white font-black text-sm rounded-br-2xl ${
        rank === 1 ? 'bg-emerald-500' : rank === 2 ? 'bg-slate-700' : 'bg-slate-400'
      }`}>
        #{rank}
      </div>

      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-56 sm:shrink-0 aspect-square sm:aspect-auto overflow-hidden bg-slate-50 relative">
          {block.image ? (
            <img
              src={block.image}
              alt={block.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Product'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2 pt-1 pl-8 sm:pl-0">
            {block.bestFor && <AffiliateBadge label={block.bestFor} />}
            {isTopPick && !block.bestFor && <AffiliateBadge label="Editor's Choice" />}
          </div>

          {/* Name + Price */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight flex-1">{block.name}</h3>
            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-emerald-600">{block.price}</span>
            </div>
          </div>

          {/* Rating */}
          {block.rating && <StarRating rating={block.rating} />}

          {/* Description */}
          {block.description && (
            <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">{block.description}</p>
          )}

          {/* Specs table */}
          {block.specifications && Object.keys(block.specifications).length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-slate-50 rounded-xl p-3 text-xs">
              {Object.entries(block.specifications).slice(0, 6).map(([key, val]) => (
                <div key={key} className="flex gap-1.5">
                  <span className="text-slate-400 font-semibold shrink-0">{key}:</span>
                  <span className="text-slate-700 font-bold truncate">{val}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pros + Cons */}
          <div className="grid sm:grid-cols-2 gap-3">
            {block.pros && block.pros.filter(Boolean).length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Pros
                </p>
                <ul className="space-y-1">
                  {block.pros.filter(Boolean).slice(0, 3).map((p, i) => (
                    <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                      <svg className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {block.cons && block.cons.filter(Boolean).length > 0 && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  Cons
                </p>
                <ul className="space-y-1">
                  {block.cons.filter(Boolean).slice(0, 3).map((c, i) => (
                    <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                      <svg className="w-3 h-3 mt-0.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Affiliate Buttons */}
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
            {amazonLink ? (
              <a
                href={amazonLink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF9900] hover:bg-[#e68900] text-white rounded-xl font-black text-xs shadow-sm transition-all active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705c-.209.189-.512.201-.745.075-1.052-.872-1.238-1.276-1.814-2.106-1.734 1.767-2.962 2.297-5.209 2.297-2.66 0-4.731-1.641-4.731-4.925 0-2.565 1.391-4.309 3.37-5.164 1.715-.754 4.11-.891 5.942-1.095V6.41c0-.548.044-1.197-.281-1.67-.285-.424-.83-.599-1.317-.599-1.431 0-2.686.736-2.993 2.258-.064.323-.315.639-.643.656L6.29 6.765c-.287-.06-.604-.296-.519-.737C6.535 2.625 9.56 1.9 12.266 1.9c1.388 0 3.201.371 4.297 1.42 1.387 1.297 1.254 3.024 1.254 4.906v4.439c0 1.333.554 1.919 1.076 2.639.183.257.222.564-.013.752l-1.736 1.739h.0z"/>
                </svg>
                Buy on Amazon
              </a>
            ) : null}

            {flipkartLink ? (
              <a
                href={flipkartLink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2874F0] hover:bg-[#1a5fd8] text-white rounded-xl font-black text-xs shadow-sm transition-all active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3z"/>
                  <path fill="white" d="M9 8h6v1.5H9zm0 3h6v1.5H9zm0 3h4v1.5H9z"/>
                </svg>
                Buy on Flipkart
              </a>
            ) : null}

            {!amazonLink && !flipkartLink && fallbackLink !== '#' && (
              <a
                href={fallbackLink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all active:scale-95 ${
                  isTopPick
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Deal — {block.price}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradedProductCard;
