import { useState, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@/components/ui/custom/Icon';
import { ensureAbsoluteUrl } from '@/lib/utils';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useBookmarks } from '@/hooks/useBookmarks';
import { NotificationPopup } from '@/components/ui/custom/NotificationPopup';

export default function JobsPage() {
  const { jobs, isJobsLoading, settings } = useDatabase();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const { isSubscribed, subscribe, loading, isDismissed, dismiss } = useNotifications('jobs');

  const handleTurnOnNotifications = async () => {
    const success = await subscribe();
    if (success) {
      alert('System: Job alerts turned on successfully!');
      dismiss();
    } else {
      alert('System: Please enable notifications in your browser settings to receive job alerts.');
    }
  };

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(jobs.filter(j => j.status === 'active').map(j => j.category))];
    return cats;
  }, [jobs]);

  const quickFilters = [
    { id: 'recent', label: 'Recently Posted', icon: 'zap' },
    { id: 'remote', label: 'Remote Only', icon: 'home' },
    { id: 'high-salary', label: 'High Salary', icon: 'banknote' },
    { id: 'saved', label: 'My Saved Jobs', icon: 'bookmark' },
  ];

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchesSearch = j.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          j.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || j.category === selectedCategory;
      
      let matchesQuick = true;
      if (activeQuickFilter === 'recent') {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        matchesQuick = new Date(j.postedAt) > oneDayAgo;
      } else if (activeQuickFilter === 'remote') {
        matchesQuick = j.type === 'Remote' || j.location.toLowerCase().includes('remote');
      } else if (activeQuickFilter === 'high-salary') {
        matchesQuick = (j.salary || '').toLowerCase().includes('pa') || (j.salary || '').toLowerCase().includes('lakh');
      } else if (activeQuickFilter === 'saved') {
        matchesQuick = isBookmarked(j.id);
      }

      return j.status === 'active' && matchesSearch && matchesCategory && matchesQuick;
    });
  }, [jobs, searchTerm, selectedCategory, activeQuickFilter, isBookmarked]);

  if (isJobsLoading && jobs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <Helmet>
        <title>SmartChoose Jobs - Find Your Next Career Move</title>
        <meta name="description" content="Explore verified job openings and career opportunities on SmartChoose Jobs Portal. Verified alerts for engineering, remote, and high-salary roles." />
        <link rel="canonical" href={`${settings.siteUrl}/jobs`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${settings.siteUrl}/jobs`} />
        <meta property="og:title" content="SmartChoose Jobs - Find Your Next Career Move" />
        <meta property="og:description" content="Verified job alerts curated for the SmartChoose community. Find your next role today." />
        <meta property="og:image" content={`https://smartchoose-proxy.vercel.app/api/og-job?v=3.png`} />
        <meta property="og:image:secure_url" content={`https://smartchoose-proxy.vercel.app/api/og-job?v=3.png`} />
        <meta property="og:image:type" content="image/png" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${settings.siteUrl}/jobs`} />
        <meta property="twitter:title" content="SmartChoose Jobs - Find Your Next Career Move" />
        <meta property="twitter:description" content="Verified job alerts curated for the SmartChoose community. Find your next role today." />
        <meta property="twitter:image" content={`https://smartchoose-proxy.vercel.app/api/og-job?v=3.png`} />
      </Helmet>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            <Icon name="briefcase" size={14} />
            Verified Job Alerts
          </m.div>
          <m.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 leading-tight"
          >
            Find Your Next <span className="text-emerald-500">Career Move</span>
          </m.h1>
          <m.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 max-w-2xl mx-auto font-medium"
          >
            We curate the best job opportunities from top companies, specifically for the SmartChoose community.
          </m.p>
        </div>

        {/* Channels Banner */}
        <m.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold">Never Miss an Opening!</h2>
              <p className="text-emerald-100 opacity-90 max-w-lg">Get instant job alerts directly on your phone. Join our active communities today.</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                <a 
                  href={settings.whatsappWebhookUrl || '#'} 
                  target="_blank" 
                  className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all active:scale-95 shadow-lg shadow-black/10"
                >
                  <Icon name="message-circle" size={20} />
                  Join WhatsApp
                </a>
                <a 
                  href={`https://t.me/${settings.telegramChannelId?.replace('@', '') || 'smartchoose'}`} 
                  target="_blank" 
                  className="flex items-center gap-2 bg-emerald-500/30 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95"
                >
                  <Icon name="send" size={20} />
                  Join Telegram
                </a>
              </div>
            </div>
            <div className="hidden lg:block w-48 h-48 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                <Icon name="bell" size={80} className="text-white/20" />
            </div>
          </div>
          {/* Abstract blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />
        </m.div>

        {/* Job Notifications Popup */}
        <NotificationPopup
          show={!isSubscribed && !isDismissed}
          onClose={dismiss}
          onSubscribe={handleTurnOnNotifications}
          loading={loading}
          title="Never Miss a Job Again!"
          description="Turn on push notifications to get alerts direct to your device."
          color="emerald"
        />

        {/* Search & Filter */}
        <div className="sticky top-20 z-40 bg-slate-50/80 backdrop-blur-md py-4 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="Search jobs, companies, skills..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none shadow-sm transition-all text-slate-700 font-medium"
                />
                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-4 rounded-2xl font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2 whitespace-nowrap">Quick Filters:</span>
              {quickFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveQuickFilter(activeQuickFilter === filter.id ? null : filter.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    activeQuickFilter === filter.id 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Icon name={filter.icon as any} size={14} />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job, idx) => {
              const isNew = new Date(job.postedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
              const isHot = (job.views || 0) > 100;
              const bookmarked = isBookmarked(job.id);

              return (
                <m.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 group-hover:border-emerald-200 transition-all flex items-center justify-center">
                        <Icon name="briefcase" size={24} className="text-slate-400" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleBookmark(job.id); }}
                          className={`p-2 rounded-xl transition-all ${bookmarked ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`}
                        >
                          <Icon name={bookmarked ? "bookmark" : "bookmark"} size={18} fill={bookmarked ? "currentColor" : "none"} />
                        </button>
                        <div className="flex gap-1">
                          {isNew && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest">New</span>}
                          {isHot && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest">Hot</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-slate-500 font-medium">{job.company}</p>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {job.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-y-2 gap-x-4 pt-2">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                        <Icon name="map-pin" size={14} className="text-emerald-500" />
                        {job.location}
                      </div>
                      {job.salary && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                          <Icon name="banknote" size={14} className="text-emerald-500" />
                          {job.salary}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex items-center gap-3">
                      <Link 
                        to={`/jobs/${job.id}`}
                        className="flex-1 bg-slate-900 text-white rounded-2xl py-3 text-center font-bold text-sm hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-black/5"
                      >
                        View Details →
                      </Link>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          const salary = job.salary ? `💰 Salary: ${job.salary}\n` : '';
                          const text = `🚀 *Job Alert: ${job.title}*\n\n🏢 *Company:* ${job.company}\n📍 *Location:* ${job.location}\n${salary}\n🔗 *Apply & View Details:* \n${settings.siteUrl}/jobs/${job.id}\n\n#Jobs #Hiring #Careers #SmartChoose`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-2xl font-bold text-sm hover:bg-[#128C7E] transition-all active:scale-95 shadow-lg shadow-green-500/20 whitespace-nowrap"
                        title="Share to WhatsApp"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Share
                      </button>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
               <Icon name="search-x" size={48} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">No Jobs Found</h3>
              <p className="text-slate-500">Try adjusting your filters or search terms.</p>
            </div>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="text-emerald-600 font-bold hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
