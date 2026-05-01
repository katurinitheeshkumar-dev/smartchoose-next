"use client";
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAdmin } from '@/contexts/AdminContext';

import { Toast } from '@/components/ui/custom/Toast';
import { detectEcommercePlatform, parsePrice, formatPrice, getPlatformByName } from '@/lib/utils';
import { ImageSlider } from '@/components/ui/custom/ImageSlider';

interface ProductDetailProps {
  productId: string;
  onBack?: () => void;
  initialProduct?: any;
}

export function ProductDetail({ productId, onBack, initialProduct }: ProductDetailProps) {
  const { products, getProductById, recordClick, recordView, getProductUrl, isInitialLoading } = useDatabase();
  const { isAdmin } = useAdmin();
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as const });

  const productFromContext = getProductById(productId);
  const product = initialProduct || productFromContext;

  // Auto-detect platform from URL
  const platform = useMemo(() => {
    if (product?.affiliateLink) {
      return detectEcommercePlatform(product.affiliateLink);
    }
    return { name: 'Store', icon: 'Store', color: '#6B7280', iconFile: 'generic.svg', className: 'platform-generic' };
  }, [product?.affiliateLink]);

  useEffect(() => {
    const originalTitle = document.title;
    if (product) {
      recordView(product.id);
    }
    return () => {
      document.title = originalTitle;
    };
  }, [productId, product, recordView]);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-40 pb-12 flex flex-col items-center">
        <div className="spinner mb-4" />
        <p className="text-slate-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Icon name="package-x" size={64} className="mx-auto text-slate-300 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Product Not Found</h2>
          <p className="text-slate-500 mb-4">The product you're looking for doesn't exist.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="btn-primary px-6 py-3 rounded-xl text-white font-semibold"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    const url = getProductUrl(product.id);
    navigator.clipboard.writeText(url);
    setToast({ show: true, message: 'Link copied to clipboard!', type: 'success' });
  };

  const images = (product?.images && Array.isArray(product.images) && product.images.length > 0) 
    ? product.images 
    : ['https://via.placeholder.com/600?text=No+Image'];

  const siteUrl = 'https://smartchoose.in';
  const productUrl = `${siteUrl}/product/${product.id}`;
  const productImage = product.images?.[0] || `${siteUrl}/logo.png`;
  const seoTitle = product.seoTitle || `${product.title} | SmartChoose`;
  const seoDesc = product.seoDescription || `${product.description?.slice(0, 155)}...`;

  const priceValue = String(product?.price || '0').replace(/[^0-9.]/g, '') || '0';
  
  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.fullTitle || product.title,
    image: product.images || [productImage],
    description: product.description,
    brand: { '@type': 'Brand', name: product.brand || 'SmartChoose' },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'INR',
      price: priceValue,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    aggregateRating: product.reviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
    } : undefined,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: product.category, item: `${siteUrl}?category=${encodeURIComponent(product.category)}` },
      { '@type': 'ListItem', position: 3, name: product.fullTitle || product.title, item: productUrl }
    ]
  };

  // Fetch related products locally since global products is now deferred
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!product) return;

    // Use context products if available (admins)
    if (products && products.length > 0) {
      const filtered = products
        .filter(p => p.id !== product.id && p.category === product.category && p.published)
        .slice(0, 4);
      setRelatedProducts(filtered);
      return;
    }

    // Fetch for visitors
    const fetchRelated = async () => {
      try {
        const { collection, query, where, limit, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(
          collection(db, 'products'),
          where('published', '==', true),
          where('category', '==', product.category),
          limit(5)
        );
        const snap = await getDocs(q);
        const docs = snap.docs
          .map(d => d.data())
          .filter(p => p.id !== product.id)
          .slice(0, 4);
        setRelatedProducts(docs);
      } catch (e) {
        console.error('Related products fetch error:', e);
      }
    };
    fetchRelated();
  }, [productId, product?.category, products]);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-emerald-600 transition-colors">
            Home
          </Link>
          <Icon name="chevron-right" size={16} />
          <span>{product?.category || 'General'}</span>
          <Icon name="chevron-right" size={16} />
          <span className="text-slate-900 truncate max-w-xs">{product?.title || 'Unknown Product'}</span>
        </nav>

        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors mb-6"
          >
            <Icon name="arrow-left" size={20} />
            {isAdmin ? 'Back to Admin' : 'Back to Website'}
          </button>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <m.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ImageSlider images={images} title={product.fullTitle || product.title} />
          </m.div>

          {/* Product Info */}
          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Category & Badge */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                {product.category}
              </span>
              {product.trending && (
                <span className="px-3 py-1 bg-rose-100 text-rose-700 text-sm font-medium rounded-full flex items-center gap-1">
                  <Icon name="trending-up" size={14} />
                  Trending
                </span>
              )}
              {product.bestseller && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full flex items-center gap-1">
                  <Icon name="star" size={14} />
                  Bestseller
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
              {product.fullTitle || product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Icon name="star" size={20} className="text-amber-400 fill-amber-400" />
                <span className="font-bold text-lg text-slate-900">{product.rating}</span>
              </div>
              <span className="text-slate-400">|</span>
              <span className="text-slate-600">{product.reviews.toLocaleString()} reviews</span>
              {isAdmin && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">{product.views?.toLocaleString() || 0} views</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">{product.clicks?.toLocaleString() || 0} clicks</span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-slate-900">{product.price}</span>
              {product.originalPrice && (
                <span className="text-xl text-slate-400 line-through">{product.originalPrice}</span>
              )}
              {product.discount && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                  {product.discount}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-slate-600 text-lg leading-relaxed">
              {product.description}
            </p>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Key Features</h3>
                <ul className="space-y-2">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-600">
                      <Icon name="check" size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons - View on [Platform] */}
            <div className="flex flex-col gap-3 pt-4">
              {(() => {
                const links = (product?.affiliateLinks && Array.isArray(product.affiliateLinks) && product.affiliateLinks.length > 0)
                  ? [...product.affiliateLinks]
                  : [{ url: product?.affiliateLink, platform: platform.name, icon: platform.iconFile || 'generic.svg', price: product?.price }];
                
                const linkList = links.filter(l => l && (l.url || l.platform)).sort((a, b) => {
                  const pa = a?.price ? parsePrice(a.price) : Infinity;
                  const pb = b?.price ? parsePrice(b.price) : Infinity;
                  return (pa > 0 ? pa : Infinity) - (pb > 0 ? pb : Infinity);
                });

                const numericPrices = linkList.map(l => l.price ? parsePrice(l.price) : Infinity);
                const validPrices = numericPrices.filter(p => p !== Infinity && p > 0);
                const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : -1;

                return linkList.map((link, idx) => {
                  const numPrice = link.price ? parsePrice(link.price) : Infinity;
                  const isBest = numPrice === minPrice && minPrice !== -1;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        recordClick(product.id);
                        if (link.url) window.open(link.url, '_blank');
                      }}
                      className={`w-full sm:w-96 relative group overflow-hidden bg-white border transition-all rounded-2xl py-3.5 px-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 ${isBest
                        ? 'border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {/* Platform Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${isBest ? 'bg-white border-emerald-100' : 'bg-slate-50 border-slate-100 group-hover:bg-white'}`}>
                          <img src={`/assets/platform-icons/${getPlatformByName(link.platform).iconFile || 'generic.svg'}`} alt={link.platform} className="w-6 h-6 object-contain" />
                        </div>

                        {/* Platform Text */}
                        <div className="flex flex-col items-start min-w-0 translate-y-px flex-1">
                          <span className={`font-bold text-[15px] leading-tight ${isBest ? 'text-emerald-800' : 'text-slate-800'}`}>
                            Buy on {link.platform}
                          </span>
                        </div>

                        {/* Price and CTA */}
                        <div className="flex-1 shrink-0 flex items-center justify-end gap-3.5 ml-auto">
                          {link.price ? (
                            <span className={`font-black tracking-tight ${isBest ? 'text-xl text-emerald-600' : 'text-lg text-slate-800 group-hover:text-amber-600 transition-colors'}`}>
                              {formatPrice(parsePrice(link.price))}
                            </span>
                          ) : null}

                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isBest ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' : 'bg-slate-100 text-slate-400 group-hover:bg-amber-500 group-hover:text-white'}`}>
                            <Icon name="chevron-right" size={18} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
              {/* Affiliate Link Disclosure */}
              <div className="space-y-4 pt-2">
                <p className="text-[11px] text-slate-400 text-center px-4 leading-relaxed">
                  * As an affiliate, we may earn a commission from qualifying purchases made through our links. This helps support our site at no extra cost to you.
                </p>
              </div>
              {/* Share Buttons Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:w-auto px-5 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-base flex items-center justify-center gap-3 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors shadow-sm"
                >
                  <Icon name="link" size={18} />
                  Copy Link
                </button>
                <button
                  onClick={async () => {
                    const url = getProductUrl(product.id);
                    const title = product.title;
                    const text = `🛍️ Check this out on SmartChoose!\n\n*${product.title}*\n💰 ${product.price}\n\n`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({ title, text, url });
                      } catch (err) {
                        // Fallback to WhatsApp if share is cancelled or fails
                        if ((err as Error).name !== 'AbortError') {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
                        }
                      }
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
                    }
                  }}
                  className="flex-1 sm:w-auto px-5 py-3.5 rounded-xl border border-green-200 text-green-700 font-bold text-base flex items-center justify-center gap-3 hover:bg-green-50 hover:border-green-400 transition-colors shadow-sm"
                >
                  <Icon name="share-2" size={18} />
                  Share Product
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Icon name="shield-check" size={18} className="text-emerald-500" />
                Verified Product
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Icon name="lock" size={18} className="text-emerald-500" />
                Secure Payment
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Icon name="refresh-cw" size={18} className="text-emerald-500" />
                Easy Returns
              </div>
            </div>
          </m.div>
        </div>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Specifications</h2>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <tbody>
                  {Object.entries(product.specifications).map(([key, value], idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4 font-medium text-slate-500 w-1/3 bg-slate-50">
                        {key}
                      </td>
                      <td className="px-6 py-4 text-slate-900">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </m.div>
        )}

        {/* Pros Only - Cons Removed */}
        {product.pros && product.pros.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12"
          >
            <div className="bg-emerald-50 rounded-2xl p-6 max-w-2xl">
              <h3 className="font-bold text-emerald-900 mb-4 flex items-center gap-2">
                <Icon name="thumbs-up" size={20} />
                Why You'll Love It
              </h3>
              <ul className="space-y-2">
                {product.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-emerald-800">
                    <Icon name="check" size={16} className="mt-1 flex-shrink-0" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          </m.div>
        )}

        {/* FAQ */}
        {product.faq && product.faq.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {product.faq.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-2 flex items-start gap-2">
                    <Icon name="help-circle" size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    {item.q}
                  </h3>
                  <p className="text-slate-600 ml-7">{item.a}</p>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* Related Products Section */}
        {(() => {
          if (relatedProducts.length === 0) return null;

          return (
            <div className="mt-20 pt-12 border-t border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Similar Products You May Like</h2>
                  <p className="text-slate-500 text-sm mt-1">Based on this category</p>
                </div>
                <Link 
                  href="/"
                  className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1"
                >
                  View All <Icon name="arrow-right" size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {relatedProducts.map(rp => (
                  <Link 
                    key={rp.id} 
                    href={`/product/${rp.id}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-square bg-white relative overflow-hidden">
                      <img 
                        src={rp.images?.[0] || 'https://via.placeholder.com/400'} 
                        alt={rp.title}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                      />
                      {rp.discount && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                          {rp.discount}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-600 mb-1">{rp.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-600 font-black">{rp.price}</span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                          <Icon name="star" size={10} className="text-amber-400 fill-amber-400" />
                          {rp.rating}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <Toast
        message={toast.message}
        show={toast.show}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}

export default ProductDetail;
