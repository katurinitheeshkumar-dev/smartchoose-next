import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';
import type { DrillDownType } from './AnalyticsDetailModal';
import { formatShortTitle } from '@/lib/utils';
import { useRouter } from 'next/navigation';

import { AdminAgentControl } from './AdminAgentControl';

export function AdminOverview() {
  const { analytics, siteStats, repairStats, fetchInquiries } = useDatabase();
  const [drillDownType, setDrillDownType] = useState<DrillDownType>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const router = useRouter();

  const handleRepair = async () => {
    setIsRepairing(true);
    const success = await repairStats();
    setIsRepairing(false);
    if (success) {
      alert('Stats repaired successfully!');
    } else {
      alert('Failed to repair stats.');
    }
  };

  const totalClicks = siteStats.totalClicks || 0;
  const totalViews = siteStats.totalViews || 0;
  const publishedCount = siteStats.totalPublishedProducts || 0;

  // Calculate CTR
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

  // Get top products by clicks - Use a local state for this later if needed,
  // but for now we'll keep it empty or limited
  const topProducts: any[] = [];

  // Get top category
  const topCategory = ['Other', 0];

  const [newMessages, setNewMessages] = useState(0);

  useEffect(() => {
    fetchInquiries().then(data => {
      setNewMessages(data.filter(m => m.status === 'new').length);
    });
  }, [fetchInquiries]);

  const stats = [
    {
      id: 'products',
      label: 'Total Products',
      value: siteStats.totalProducts || 0,
      icon: 'package',
      color: 'emerald',
      trend: '+12%'
    },
    {
      id: 'inbox',
      label: 'New Messages',
      value: newMessages,
      icon: 'inbox',
      color: newMessages > 0 ? 'blue' : 'slate',
      trend: newMessages > 0 ? 'URGENT' : 'CLEAR'
    },
    {
      id: 'clicks',
      label: 'Total Clicks',
      value: totalClicks.toLocaleString(),
      icon: 'mouse-pointer-click',
      color: 'emerald',
      trend: '+23%'
    },
    {
      id: 'views',
      label: 'Total Views',
      value: totalViews.toLocaleString(),
      icon: 'eye',
      color: 'green',
      trend: '+18%'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard Overview</h1>
          <p className="text-slate-500">Welcome back! Here's what's happening with your store.</p>
        </div>
        <button
          onClick={handleRepair}
          disabled={isRepairing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm disabled:opacity-50"
        >
          <Icon name={isRepairing ? "loader-2" : "refresh-cw"} size={16} className={isRepairing ? "animate-spin" : ""} />
          {isRepairing ? "Repairing..." : "Repair Stats"}
        </button>
      </div>


      {/* AI Agent Control - NEW */}
      <AdminAgentControl />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <m.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => {
              if (stat.id === 'views' || stat.id === 'clicks') {
                setDrillDownType(stat.id as DrillDownType);
              } else if (stat.id === 'products') {
                router.push('/admin/products');
              } else if (stat.id === 'inbox') {
                router.push('/admin/inbox');
              }
            }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <Icon name={stat.icon} size={24} className={`text-${stat.color}-600`} />
              </div>
              <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {stat.trend}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </m.div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => setDrillDownType('ctr')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Icon name="activity" size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 line-clamp-1">Click-Through Rate</p>
              <p className="text-2xl font-bold text-slate-900">{ctr}%</p>
            </div>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Icon name="tag" size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Top Category</p>
              <p className="text-2xl font-bold text-slate-900">{topCategory?.[0] || 'N/A'}</p>
            </div>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <Icon name="trending-up" size={20} className="text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Today's Visitors</p>
              <p className="text-2xl font-bold text-slate-900">
                {analytics.dailyVisitors[analytics.dailyVisitors.length - 1]}
              </p>
            </div>
          </div>
        </m.div>
      </div>

      {/* Top Products */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Top Performing Products</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {topProducts.length > 0 ? (
            topProducts.map((product, idx) => {
              const productCtr = product.views > 0
                ? ((product.clicks / product.views) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </span>
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/100'}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover bg-slate-100"
                  />
                  <div className="flex-1 min-w-0" title={product.title}>
                    <p
                      className="font-semibold text-slate-900 truncate"
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                    >
                      {formatShortTitle(product.title)}
                    </p>
                    <p className="text-sm text-slate-500">{product.category} • {product.clicks} clicks</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{productCtr}%</p>
                    <p className="text-xs text-slate-500">CTR</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">
              <Icon name="package-x" size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No products yet</p>
            </div>
          )}
        </div>
      </m.div>

      {/* Analytics Modal */}
      {drillDownType && (
        <AnalyticsDetailModal
          type={drillDownType}
          onClose={() => setDrillDownType(null)}
        />
      )}
    </div>
  );
}

export default AdminOverview;
