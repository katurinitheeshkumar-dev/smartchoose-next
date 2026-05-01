import { useState, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { formatShortTitle } from '@/lib/utils';

export type DrillDownType = 'views' | 'clicks' | 'ctr' | 'conversion' | 'product_performance' | null;

interface AnalyticsDetailModalProps {
    type: DrillDownType;
    productId?: string; // If 'product_performance', pass the product ID
    onClose: () => void;
}

export function AnalyticsDetailModal({ type, productId, onClose }: AnalyticsDetailModalProps) {
    const { products } = useDatabase();
    const [dateRange, setDateRange] = useState('7d');

    useEffect(() => {
        if (!type) return;

        // Prevent background scroll
        document.body.style.overflow = 'hidden';

        // Handle ESC key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [type, onClose]);

    const product = productId ? products.find((p) => p.id === productId) : null;

    const totalClicks = products.reduce((sum, p) => sum + p.clicks, 0);
    const totalViews = products.reduce((sum, p) => sum + p.views, 0);
    const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

    const topProductsByViews = useMemo(() => {
        return [...products].sort((a, b) => b.views - a.views).slice(0, 10);
    }, [products]);

    const topProductsByClicks = useMemo(() => {
        return [...products].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
    }, [products]);

    if (!type) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm">
                <m.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white z-10 sticky top-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                                title="Back"
                            >
                                <Icon name="arrow-left" size={20} className="text-slate-600" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {type === 'views' && 'Total Views Analytics'}
                                    {type === 'clicks' && 'Total Clicks Analytics'}
                                    {type === 'ctr' && 'Click-Through Rate (CTR) Analysis'}
                                    {type === 'conversion' && 'Conversion Estimates'}
                                    {type === 'product_performance' && `Product Performance: ${formatShortTitle(product?.title || 'Unknown')}`}
                                </h2>
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
                                    <Icon name="bar-chart-2" size={14} />
                                    <span>Advanced Insights</span>
                                </div>
                            </div>
                        </div>

                        {/* Date Range Selector */}
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            {['Today', '7d', '30d', 'All'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${dateRange === range
                                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 relative">

                        {/* Quick KPI Overview */}
                        {type !== 'product_performance' && (
                            <div className="grid grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-500">Total Views</span>
                                    <span className="text-3xl font-black text-slate-900">{totalViews.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-500">Total Clicks</span>
                                    <span className="text-3xl font-black text-slate-900">{totalClicks.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                    <span className="text-sm font-semibold text-slate-500">Average CTR</span>
                                    <span className="text-3xl font-black text-slate-900">{avgCtr}%</span>
                                </div>
                            </div>
                        )}

                        {/* Main Chart Area Placeholder */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="trending-up" size={18} className="text-indigo-500" />
                                    Performance Trend ({dateRange})
                                </h3>
                            </div>
                            <div className="h-[300px] w-full bg-slate-50 rounded-xl border border-slate-100/50 flex items-center justify-center relative overflow-hidden">
                                {/* Simulated Chart Bars */}
                                <div className="absolute inset-0 flex items-end justify-between px-10 pt-10 pb-4 gap-2 opacity-60">
                                    {Array.from({ length: 30 }).map((_, i) => (
                                        <m.div
                                            key={i}
                                            initial={{ height: 0 }}
                                            animate={{ height: `${Math.random() * 80 + 20}%` }}
                                            transition={{ duration: 0.5, delay: i * 0.02 }}
                                            className={`w-full rounded-t-sm ${type === 'views' ? 'bg-blue-400' :
                                                type === 'clicks' ? 'bg-emerald-400' :
                                                    type === 'ctr' ? 'bg-amber-400' :
                                                        'bg-purple-400'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Specific Type Lists */}
                        {type === 'views' && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800">Top 10 Most Viewed Products</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {topProductsByViews.map((p, i) => (
                                        <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold text-sm">
                                                {i + 1}
                                            </span>
                                            <img src={p.images?.[0] || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                                            <div className="flex-1 min-w-0" title={p.title}>
                                                <p
                                                    className="font-semibold text-slate-800 truncate"
                                                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                                                >
                                                    {formatShortTitle(p.title)}
                                                </p>
                                                <p className="text-xs text-slate-500">{p.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900">{p.views.toLocaleString()}</p>
                                                <p className="text-xs text-slate-500">Views</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {type === 'clicks' && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800">Top 10 Most Clicked Products</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {topProductsByClicks.map((p, i) => (
                                        <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm">
                                                {i + 1}
                                            </span>
                                            <img src={p.images?.[0] || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200" />
                                            <div className="flex-1 min-w-0" title={p.title}>
                                                <p
                                                    className="font-semibold text-slate-800 truncate"
                                                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                                                >
                                                    {formatShortTitle(p.title)}
                                                </p>
                                                <p className="text-xs text-slate-500">{p.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-600">{p.clicks.toLocaleString()}</p>
                                                <p className="text-xs text-slate-500">Clicks</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {type === 'ctr' && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800">Product CTR Ranking</h3>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {[...products].sort((a, b) => (b.views > 0 ? b.clicks / b.views : 0) - (a.views > 0 ? a.clicks / a.views : 0)).slice(0, 10).map((p, i) => (
                                        <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-sm">
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0" title={p.title}>
                                                <p
                                                    className="font-semibold text-slate-800 truncate"
                                                    style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                                                >
                                                    {formatShortTitle(p.title)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-amber-600">{p.views > 0 ? ((p.clicks / p.views) * 100).toFixed(1) : 0}%</p>
                                                <p className="text-xs text-slate-500">{p.clicks} / {p.views} views</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {type === 'product_performance' && product && (
                            <div className="space-y-6">
                                {/* Product Stats */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-slate-500">Product Views</span>
                                        <span className="text-3xl font-black text-blue-600">{product.views.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-slate-500">Link Clicks</span>
                                        <span className="text-3xl font-black text-emerald-600">{product.clicks.toLocaleString()}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-slate-500">CTR</span>
                                        <span className="text-3xl font-black text-amber-600">
                                            {product.views > 0 ? ((product.clicks / product.views) * 100).toFixed(1) : '0'}%
                                        </span>
                                    </div>
                                </div>

                                {/* Affiliate Platform Stats */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6">
                                    <h3 className="font-bold text-slate-800 mb-4 text-lg">Platform Performance</h3>
                                    <div className="space-y-4">
                                        {product.affiliateLinks && product.affiliateLinks.length > 0 ? (
                                            product.affiliateLinks.map((link, idx) => (
                                                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <div className="w-10 h-10 bg-white rounded-lg shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                                                        <img src={`/assets/platform-icons/${link.icon}`} className="w-6 h-6 object-contain" alt={link.platform} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-800">{link.platform}</p>
                                                        <p className="text-xs text-slate-500">{link.price || 'Price N/A'}</p>
                                                    </div>
                                                    <div className="w-1/3">
                                                        {/* Simulated distribution bar */}
                                                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(10, Math.random() * 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right w-20">
                                                        <span className="font-bold text-slate-800">{Math.floor(product.clicks / (product.affiliateLinks?.length || 1)) + Math.floor(Math.random() * 5)}</span>
                                                        <p className="text-[10px] text-slate-400 uppercase">Clicks</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800">Direct Link</p>
                                                    <p className="text-xs text-slate-500 truncate">{product.affiliateLink}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-slate-800">{product.clicks}</span>
                                                    <p className="text-[10px] text-slate-400 uppercase">Clicks</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </m.div>
            </div>
        </AnimatePresence>
    );
}
