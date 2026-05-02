import { useState, useMemo, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';
import type { DrillDownType } from './AnalyticsDetailModal';
import { formatShortTitle } from '@/lib/utils';

export function AdminAnalytics() {
  const { analytics, siteStats } = useDatabase();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [drillDownType, setDrillDownType] = useState<DrillDownType>(null);
  const [analyticsProductId, setAnalyticsProductId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'products'), orderBy('clicks', 'desc'), limit(10));
        const snap = await getDocs(q);
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error fetching analytics products:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopProducts();
  }, []);

  // Visitors Chart - GREEN theme
  const visitorsOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, animations: { enabled: true, speed: 800 } },
    colors: ['#10B981'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    tooltip: { theme: 'dark' }
  };
  const visitorsSeries = useMemo(() => [{ name: 'Visitors', data: analytics.dailyVisitors }], [analytics]);

  // Clicks Chart - GREEN theme
  const clicksOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: true, speed: 800 } },
    colors: ['#22C55E'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`), labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#94a3b8' } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    tooltip: { theme: 'dark' },
    states: { hover: { filter: { type: 'lighten' } } }
  };
  const clicksSeries = useMemo(() => [{ name: 'Clicks', data: analytics.dailyClicks }], [analytics]);

  // Traffic Sources Chart
  const sourcesOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: true, speed: 800 } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '50%', distributed: true } },
    colors: ['#10B981', '#3B82F6', '#8B5CF6'],
    dataLabels: { enabled: false },
    xaxis: { categories: ['Direct', 'Social', 'Search'], labels: { style: { colors: '#94a3b8' } } },
    yaxis: { labels: { style: { colors: '#475569', fontWeight: 500 } } },
    grid: { show: false },
    tooltip: { theme: 'dark' },
    legend: { show: false }
  };
  const sourcesSeries = useMemo(() => [{ name: 'Traffic', data: [analytics.trafficSources.direct, analytics.trafficSources.social, analytics.trafficSources.search] }], [analytics]);

  // Calculate stats using siteStats for accurate global numbers
  const totalClicks = siteStats.totalClicks || 0;
  const totalViews = siteStats.totalViews || 0;
  const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Analytics</h1>
        <p className="text-slate-500">Track your website performance and user engagement</p>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => setDrillDownType('views')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Icon name="eye" size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Views</p>
              <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setDrillDownType('clicks')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Icon name="mouse-pointer-click" size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Clicks</p>
              <p className="text-2xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setDrillDownType('ctr')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Icon name="activity" size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg CTR</p>
              <p className="text-2xl font-bold text-slate-900">{avgCtr}%</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setDrillDownType('conversion')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Icon name="trending-up" size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Conversion</p>
              <p className="text-2xl font-bold text-slate-900">{(parseFloat(avgCtr) * 0.8).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div
          onClick={() => setDrillDownType('views')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all group overflow-hidden"
        >
          <div className="flex items-center justify-between xl:mb-4">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Daily Visitors</h3>
            <Icon name="maximize-2" size={16} className="text-slate-400 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <div className="pointer-events-none mt-4">
            <ReactApexChart options={visitorsOptions} series={visitorsSeries} type="area" height={250} />
          </div>
        </div>

        <div
          onClick={() => setDrillDownType('clicks')}
          className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200 transition-all group overflow-hidden"
        >
          <div className="flex items-center justify-between xl:mb-4">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Click Analytics</h3>
            <Icon name="maximize-2" size={16} className="text-slate-400 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
          <div className="pointer-events-none mt-4">
            <ReactApexChart options={clicksOptions} series={clicksSeries} type="bar" height={250} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Traffic Sources</h3>
          <div className="mt-4">
            <ReactApexChart options={sourcesOptions} series={sourcesSeries} type="bar" height={200} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Product Performance</h3>
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="loader-2" size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : products.length > 0 ? (
              products
                .sort((a, b) => (b.clicks / Math.max(b.views, 1)) - (a.clicks / Math.max(a.views, 1)))
                .slice(0, 5)
                .map((product, idx) => {
                  const ctr = ((product.clicks / Math.max(product.views, 1)) * 100);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setAnalyticsProductId(product.id)}
                    >
                      <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </span>
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/100'}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <div className="flex-1 min-w-0" title={product.title}>
                        <p className="font-medium text-slate-900 text-sm truncate">{formatShortTitle(product.title)}</p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(ctr * 5, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">{ctr.toFixed(1)}%</span>
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
        </div>
      </div>
      {/* Modals */}
      {drillDownType && (
        <AnalyticsDetailModal
          type={drillDownType}
          onClose={() => setDrillDownType(null)}
        />
      )}

      {analyticsProductId && (
        <AnalyticsDetailModal
          type="product_performance"
          productId={analyticsProductId}
          onClose={() => setAnalyticsProductId(null)}
        />
      )}
    </div>
  );
}

export default AdminAnalytics;
