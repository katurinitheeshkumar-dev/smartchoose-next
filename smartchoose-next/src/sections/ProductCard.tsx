"use client";
import { useRef, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/custom/Icon';
import { ProductImage } from '@/components/ui/custom/ProductImage';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAdmin } from '@/contexts/AdminContext';
import { formatPrice, parsePrice, getPlatformByName, detectEcommercePlatform } from '../lib/utils';
import { PlatformIcon } from '@/components/ui/custom/PlatformIcon';

import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    fullTitle?: string;
    description: string;
    price: string;
    originalPrice?: string;
    discount?: string;
    images: string[];
    category: string;
    affiliateLink: string;
    affiliateLinks?: { platform: string; url: string; icon: string; price?: string }[];
    rating: number;
    reviews: number;
    clicks: number;
    views: number;
    fetchPriority?: 'high' | 'low' | 'auto';
  };
  highlighted?: boolean;
  onCopy?: () => void;
  onClick?: () => void;
}

import Link from 'next/link';

export function ProductCard({ product, highlighted = false, onCopy }: ProductCardProps) {
  const { recordClick, getProductUrl } = useDatabase();
  const { isAdmin } = useAdmin();
  const cardRef = useRef<HTMLDivElement>(null);
  const mainImage = product.images?.[0] || 'https://via.placeholder.com/600?text=No+Image';

  // Auto-detect platform from URL
  const platform = useMemo(() => {
    return detectEcommercePlatform(product.affiliateLink);
  }, [product.affiliateLink]);

  // Scroll to highlighted product
  useEffect(() => {
    if (highlighted && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlighted]);

  const handleStoreClick = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    recordClick(product.id);
    if (url) window.open(url, '_blank');
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getProductUrl(product.id);
    navigator.clipboard.writeText(url);
    onCopy?.();
  };

  // Pre-calculate Affiliate Links to avoid doing it during render phase over and over
  const processedLinks = useMemo(() => {
    const list = (product.affiliateLinks && product.affiliateLinks.length > 0
      ? [...product.affiliateLinks]
      : [{ url: product.affiliateLink, platform: getPlatformByName(platform.name).name, icon: getPlatformByName(platform.name).iconFile || 'generic.svg', price: product.price }]
    ).sort((a, b) => {
      const pa = a.price ? parsePrice(a.price) : Infinity;
      const pb = b.price ? parsePrice(b.price) : Infinity;
      return (pa > 0 ? pa : Infinity) - (pb > 0 ? pb : Infinity);
    }).slice(0, 3);

    const numericPrices = list.map(l => l.price ? parsePrice(l.price) : Infinity);
    const validPrices = numericPrices.filter(p => p !== Infinity && p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : -1;

    return list.map(link => ({
      ...link,
      isBest: (link.price ? parsePrice(link.price) : Infinity) === minPrice && minPrice !== -1,
      numPrice: link.price ? parsePrice(link.price) : Infinity
    }));
  }, [product.affiliateLinks, product.affiliateLink, product.price, platform.name]);

  return (
    <Link
      href={`/product/${product.id}`}
      prefetch={true}
      className={`group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover-lift cursor-pointer transition-all duration-500 gpu-accelerate ${highlighted ? 'product-highlight ring-2 ring-emerald-500 border-emerald-500' : ''
        }`}
    >
      <div ref={cardRef}>
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-white border-b border-slate-100">
        <ProductImage
          src={mainImage}
          alt={product.title}
          fetchPriority={product.fetchPriority}
          className="w-full h-full transition-all duration-700"
        />

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2.5 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg hover:bg-emerald-50 transition-all duration-300 z-10 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
          title="Copy product link"
        >
          <Icon name="link" size={14} className="text-emerald-600 sm:hidden" />
          <Icon name="link" size={18} className="text-emerald-600 hidden sm:block" />
        </button>

        {/* WhatsApp Share Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const url = getProductUrl(product.id);
            const msg = `🛍️ Check this out on SmartChoose!\n\n*${product.title}*\n💰 ${product.price}\n\n${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          }}
          className="absolute top-2 right-12 sm:top-3 sm:right-14 p-1.5 sm:p-2.5 bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg hover:bg-green-50 transition-all duration-300 z-10 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
          title="Share on WhatsApp"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366" className="sm:hidden"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" className="hidden sm:block"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>

        {/* Single Discount Badge - No Duplication */}
        {product.discount && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-emerald-700 to-green-700 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-lg">
            {product.discount}
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/95 backdrop-blur-sm text-slate-700 text-[10px] sm:text-xs font-medium rounded-full">
          {product.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5">
        <h3
          className="font-bold text-slate-900 text-[13px] sm:text-lg leading-tight line-clamp-2 group-hover:text-emerald-600 transition-colors mb-1 sm:mb-2"
          title={product.fullTitle || product.title}
        >
          {product.fullTitle || product.title}
        </h3>


        {/* Rating */}
        <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
          <Icon name="star" size={12} className="text-amber-400 fill-amber-400" />
          <span className="font-semibold text-xs sm:text-sm text-slate-700">{product.rating || 0}</span>
          <span className="text-slate-600 text-xs sm:text-sm hidden sm:inline">({(product.reviews || 0).toLocaleString()})</span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-end justify-between mb-1 sm:mb-2">
          <div>
            <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
              <span className="text-base sm:text-2xl font-bold text-slate-900">{formatPrice(parsePrice(product.price))}</span>
              {product.originalPrice && (
                <span className="text-[11px] sm:text-sm text-slate-600 line-through">{formatPrice(parsePrice(product.originalPrice))}</span>
              )}
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Icon name="eye" size={12} />
                  {(product.views || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="mouse-pointer-click" size={12} />
                  {(product.clicks || 0).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Affiliate Link Buttons */}
        <div className="flex flex-col gap-1.5 sm:gap-2 w-full mt-2 sm:mt-3">
          {processedLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={(e) => handleStoreClick(e, link.url)}
              className="w-full relative group overflow-hidden bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all rounded-lg sm:rounded-xl py-2 px-2.5 sm:py-3 sm:px-3.5 flex items-center justify-between shadow-sm hover:shadow hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
                <PlatformIcon name={link.platform} size="md" />

                {/* Platform Text */}
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="font-bold text-[11px] sm:text-[13px] leading-tight text-slate-800">
                    <span className="sm:hidden">{link.platform}</span>
                    <span className="hidden sm:inline">Go to {link.platform}</span>
                  </span>
                </div>

                {/* Price and CTA */}
                <div className="shrink-0 flex items-center justify-end gap-1 sm:gap-3 ml-auto">
                  {link.price ? (
                    <span className="font-black tracking-tight text-xs sm:text-base text-slate-800 group-hover:text-emerald-600 transition-colors">
                      {formatPrice(link.numPrice)}
                    </span>
                  ) : null}

                  <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all shrink-0 bg-slate-100 text-slate-600 group-hover:bg-emerald-500 group-hover:text-white">
                    <Icon name="chevron-right" size={12} className="sm:hidden" />
                    <Icon name="chevron-right" size={16} className="hidden sm:block" />
                  </div>
                </div>
              </div>
            </button>
          ))}

          {(product.affiliateLinks && product.affiliateLinks.length > 3) && (
            <div className="text-center mt-1">
              <span className="text-xs font-medium text-slate-500">View more options</span>
            </div>
          )}
        </div>
      </div>
    </div>
  </Link>
  );
}

export function ProductSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse h-full">
      {/* Image Skeleton */}
      <div className="aspect-square bg-slate-100 w-full border-b border-slate-50" />
      
      {/* Content Skeleton */}
      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* Title Lines */}
        <div className="space-y-2">
          <div className="h-4 sm:h-5 bg-slate-100 rounded-md w-full" />
          <div className="h-4 sm:h-5 bg-slate-100 rounded-md w-2/3" />
        </div>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-3 bg-slate-100 rounded-md w-12" />
          <div className="h-3 bg-slate-100 rounded-md w-16 hidden sm:block" />
        </div>
        
        {/* Price & Views */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="h-6 sm:h-8 bg-slate-100 rounded-md w-1/2" />
          <div className="h-3 bg-slate-100 rounded-md w-1/4" />
        </div>
        
        {/* Buttons Skeleton (Match the 1-3 buttons in real card) */}
        <div className="space-y-2 mt-4 pt-2">
          <div className="h-10 sm:h-12 bg-slate-100 rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
