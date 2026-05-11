import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { AnalyticsDetailModal } from './AnalyticsDetailModal';
import type { DrillDownType } from './AnalyticsDetailModal';
import { formatShortTitle } from '@/lib/utils';
import { useRouter } from 'next/navigation';

import { AdminAgentControl } from './AdminAgentControl';
import { db } from '@/lib/firebase';
import { AIBlogGenerator } from './AIBlogGenerator';

export function AdminOverview() {
  const { analytics, siteStats, repairStats, fetchInquiries } = useDatabase();
  const [drillDownType, setDrillDownType] = useState<DrillDownType>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [showAIBlogGen, setShowAIBlogGen] = useState(false);
  const router = useRouter();
  const [daysSinceLastBlog, setDaysSinceLastBlog] = useState<number | null>(null);
  const [lastBlogTitle, setLastBlogTitle] = useState<string>('');

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

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topCategory, setTopCategory] = useState<[string, number]>(['Other', 0]);
  const [newMessages, setNewMessages] = useState(0);

  useEffect(() => {
    fetchInquiries().then(data => {
      setNewMessages(data.filter(m => m.status === 'new').length);
    });

    const fetchDashboardData = async () => {
      try {
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        
        // 1. Fetch Top Products
        const qTop = query(collection(db, 'products'), orderBy('clicks', 'desc'), limit(5));
        const snapTop = await getDocs(qTop);
        const products = snapTop.docs.map(d => ({ id: d.id, type: 'product', ...d.data() }));
        setTopProducts(products);

        // 2. Fetch Recent Activity (Mixed)
        const qRecentProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(5));
        const qRecentBlogs = query(collection(db, 'blogPosts'), orderBy('updatedAt', 'desc'), limit(5));
        const qRecentJobs = query(collection(db, 'jobs'), orderBy('postedAt', 'desc'), limit(5));

        const [snapProd, snapBlog, snapJob] = await Promise.all([
          getDocs(qRecentProducts),
          getDocs(qRecentBlogs),
          getDocs(qRecentJobs)
        ]);

        const combined = [
          ...snapProd.docs.map(d => ({ id: d.id, type: 'product', timestamp: d.data().createdAt, title: d.data().title, icon: 'package', color: 'emerald' })),
          ...snapBlog.docs.map(d => ({ id: d.id, type: 'blog', timestamp: d.data().updatedAt || d.data().createdAt, title: d.data().title, icon: 'newspaper', color: 'blue' })),
          ...snapJob.docs.map(d => ({ id: d.id, type: 'job', timestamp: d.data().postedAt, title: d.data().title, icon: 'briefcase', color: 'amber' }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

        setRecentActivity(combined);

        if (products.length > 0) {
          const cats: Record<string, number> = {};
          products.forEach((p: any) => {
            cats[p.category] = (cats[p.category] || 0) + 1;
          });
          const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
          if (top) setTopCategory([top[0], top[1]]);
        }

        // 3. Fetch Last Blog Post Date
        const qLastBlog = query(collection(db, 'blogPosts'), orderBy('updatedAt', 'desc'), limit(1));
        const snapLastBlog = await getDocs(qLastBlog);
        if (!snapLastBlog.empty) {
          const lastBlog = snapLastBlog.docs[0].data();
          const lastDate = lastBlog.updatedAt || lastBlog.createdAt;
          if (lastDate) {
            const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
            setDaysSinceLastBlog(diff);
            setLastBlogTitle(lastBlog.title || '');
          }
        } else {
          setDaysSinceLastBlog(999); // No blogs at all
        }
      } catch (e) {
        console.warn('Dashboard Data Fetch Error:', e);
      }
    };
    fetchDashboardData();
  }, [fetchInquiries]);

  const stats = [
    { id: 'products', label: 'Products', value: siteStats.totalProducts || 0, icon: 'package', color: 'emerald', sub: `${siteStats.totalPublishedProducts} live` },
    { id: 'blogs', label: 'Articles', value: siteStats.totalBlogs || 0, icon: 'newspaper', color: 'blue', sub: 'Editorial Hub' },
    { id: 'jobs', label: 'Job Alerts', value: siteStats.totalJobs || 0, icon: 'briefcase', color: 'amber', sub: 'Career Portal' },
    { id: 'inbox', label: 'Messages', value: newMessages, icon: 'inbox', color: newMessages > 0 ? 'rose' : 'slate', sub: newMessages > 0 ? 'Needs attention' : 'All clear' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Platform Overview</h1>
          <p className="text-slate-500">Real-time performance across all SmartChoose modules.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/products')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"><Icon name="plus" size={16} /> New Product</button>
          <button onClick={handleRepair} disabled={isRepairing} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-emerald-600 transition-all shadow-sm"><Icon name={isRepairing ? "loader-2" : "refresh-cw"} size={18} className={isRepairing ? "animate-spin" : ""} /></button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <m.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => router.push(`/admin/${stat.id === 'blogs' ? 'blog' : stat.id}`)}
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all cursor-pointer hover:shadow-xl group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-100 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon name={stat.icon} size={28} className={`text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">{stat.sub}</span>
              <Icon name="arrow-right" size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
          </m.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Performance & Activity */}
        <div className="lg:col-span-2 space-y-8">
           <div className="grid sm:grid-cols-2 gap-6">
              <div onClick={() => setDrillDownType('views')} className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-900/20 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
                 <Icon name="eye" size={120} className="absolute -bottom-4 -right-4 text-white/10 rotate-[-15deg]" />
                 <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Total Impressions</p>
                 <p className="text-4xl font-black">{totalViews.toLocaleString()}</p>
                 <div className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
                   <Icon name="trending-up" size={14} /> +18% this month
                 </div>
              </div>
              <div onClick={() => setDrillDownType('clicks')} className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-900/20 cursor-pointer hover:scale-[1.02] transition-all relative overflow-hidden group">
                 <Icon name="mouse-pointer-click" size={120} className="absolute -bottom-4 -right-4 text-white/10 rotate-[-15deg]" />
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Affiliate Clicks</p>
                 <p className="text-4xl font-black">{totalClicks.toLocaleString()}</p>
                 <div className="mt-6 flex items-center gap-2 text-xs font-bold bg-emerald-500 w-fit px-3 py-1.5 rounded-full">
                   <Icon name="activity" size={14} /> {ctr}% conversion rate
                 </div>
              </div>
           </div>

           {/* Recent Activity */}
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Icon name="history" className="text-emerald-500" />
                  Recent Activity
                </h2>
                <button className="text-[10px] font-black uppercase text-emerald-600 hover:underline">View All Logs</button>
             </div>
             <div className="divide-y divide-slate-50">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="p-6 flex items-center gap-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className={`w-12 h-12 rounded-2xl bg-${activity.color}-100 flex items-center justify-center text-${activity.color}-600 shrink-0`}>
                      <Icon name={activity.icon} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-${activity.color}-100 text-${activity.color}-700`}>{activity.type}</span>
                        <span className="text-[10px] text-slate-400">{new Date(activity.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{activity.title}</p>
                    </div>
                    <Icon name="chevron-right" size={18} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                ))}
             </div>
           </div>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-8">
           <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
              <Icon name="sparkles" size={100} className="absolute -top-4 -right-4 text-white/10 rotate-12" />
              <h3 className="text-lg font-black mb-6">AI Insights</h3>
              <div className="space-y-4">
                 <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                   <p className="text-[10px] font-black uppercase text-indigo-200 mb-1">Engagement Tip</p>
                   <p className="text-xs font-medium leading-relaxed">Your "{topCategory[0]}" category has top performance. Consider adding more products in this niche.</p>
                 </div>
                 <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                   <p className="text-[10px] font-black uppercase text-indigo-200 mb-1">Content Gap</p>
                   {daysSinceLastBlog === null ? (
                     <p className="text-xs font-medium leading-relaxed opacity-60">Checking blog activity...</p>
                   ) : daysSinceLastBlog >= 3 ? (
                     <div>
                       <p className="text-xs font-medium leading-relaxed mb-3">
                         {daysSinceLastBlog === 999
                           ? "No blogs posted yet! Start building your content library."
                           : `You haven't posted a blog in ${daysSinceLastBlog} days. AI suggests a "Top 5 Smartphones" guide.`
                         }
                       </p>
                       <button
                         onClick={() => setShowAIBlogGen(true)}
                         className="w-full py-2 px-4 bg-white text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                       >
                         <Icon name="zap" size={12} />
                         Generate &amp; Publish Now
                       </button>
                     </div>
                   ) : (
                     <p className="text-xs font-medium leading-relaxed">
                       ✅ Great! Last blog posted {daysSinceLastBlog === 0 ? 'today' : `${daysSinceLastBlog} day(s) ago`}. Keep the momentum going!
                     </p>
                   )}
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                Performance
                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg">Top Content</span>
              </h3>
              <div className="space-y-6">
                 {topProducts.slice(0, 3).map((p, i) => (
                   <div key={i} className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border p-1 overflow-hidden shrink-0">
                        <img src={p.images?.[0]} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{p.title}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">{p.clicks} clicks</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Analytics Modal */}
      {drillDownType && (
        <AnalyticsDetailModal
          type={drillDownType}
          onClose={() => setDrillDownType(null)}
        />
      )}

      {/* AI Blog Generator Modal */}
      {showAIBlogGen && (
        <AIBlogGenerator
          onClose={() => setShowAIBlogGen(false)}
          onGenerated={async (data, autoPublish) => {
            setShowAIBlogGen(false);
            if (autoPublish) {
              try {
                const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
                const now = new Date().toISOString();
                await addDoc(collection(db, 'blogPosts'), { ...data, status: 'published', createdAt: now, updatedAt: now });
                alert('✅ Blog auto-published! Refresh to see it in the list.');
                setDaysSinceLastBlog(0);
              } catch (e) {
                alert('Auto-publish failed. Go to Blog Posts section to publish manually.');
              }
            } else {
              router.push('/admin/blog');
            }
          }}
        />
      )}
    </div>
  );
}

export default AdminOverview;
