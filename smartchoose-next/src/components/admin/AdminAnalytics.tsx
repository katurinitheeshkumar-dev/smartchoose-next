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

  const stats = [
    { id: 'views', label: 'Platform Views', value: totalViews, icon: 'eye', color: 'emerald', sub: 'Site-wide' },
    { id: 'clicks', label: 'Total Conversions', value: totalClicks, icon: 'mouse-pointer-click', color: 'blue', sub: 'Affiliate Clicks' },
    { id: 'blogs', label: 'Article Engagement', value: siteStats.totalBlogs || 0, icon: 'newspaper', color: 'amber', sub: `${avgCtr}% Avg CTR` },
    { id: 'jobs', label: 'Job Responses', value: siteStats.totalJobs || 0, icon: 'briefcase', color: 'indigo', sub: 'High Intent' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Performance Intelligence</h1>
        <p className="text-slate-500 font-medium">Deep-dive into conversion metrics across all SmartChoose modules.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={() => stat.id === 'views' || stat.id === 'clicks' ? setDrillDownType(stat.id as any) : null}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-100 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon name={stat.icon} size={28} className={`text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stat.value.toLocaleString()}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500">{stat.sub}</span>
              <Icon name="trending-up" size={14} className="text-emerald-500" />
            </div>
          </div>
        ))}
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
