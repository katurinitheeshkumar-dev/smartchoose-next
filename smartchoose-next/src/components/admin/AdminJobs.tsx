import { useState, useMemo, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Toast } from '@/components/ui/custom/Toast';
import type { Job } from '@/types';

type JobFormData = Omit<Job, 'id' | 'postedAt' | 'views' | 'broadcasted'>;

const initialForm: JobFormData = {
  title: '',
  company: '',
  location: '',
  type: 'Full-time',
  category: 'IT & Software',
  description: '',
  applyLink: '',
  salary: '',
  status: 'draft',
};

const CATEGORIES = [
  'IT & Software', 'Marketing & Sales', 'Healthcare', 'Education', 'Finance', 'Govt Jobs', 'Engineering', 'Remote / Freelance', 'Others'
];

const PROXY_URL = 'https://smartchoose-proxy.vercel.app';

import { useSearchParams, useRouter } from 'next/navigation';

export function AdminJobs() {
  const { fetchAdminJobs, addJob, updateJob, deleteJob, broadcastJob, siteStats } = useDatabase();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [showEditor, setShowEditor] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [isHunting, setIsHunting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [huntTerm, setHuntTerm] = useState('');

  // Sync state to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      const params = new URLSearchParams(searchParams.toString());
      if (searchTerm) params.set('q', searchTerm); else params.delete('q');
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle back button for editor
  useEffect(() => {
    if (showEditor) {
      window.history.pushState({ modalOpen: true }, '');
    }

    const handlePopState = (e: PopStateEvent) => {
      if (showEditor) {
        setShowEditor(false);
        setEditingJob(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showEditor]);

  const [localJobs, setLocalJobs] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<any[]>([null]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  const loadJobs = useCallback(async (page: number, isNext: boolean = true) => {
    setIsLoading(true);
    const lastVisible = pageHistory[page - 1];
    const result = await fetchAdminJobs(PAGE_SIZE, lastVisible, debouncedSearch, 'all');
    setLocalJobs(result.jobs);
    setTotalCount(result.totalCount);
    if (isNext && result.lastVisible && pageHistory.length <= page) {
      setPageHistory(prev => [...prev, result.lastVisible]);
    }
    setIsLoading(false);
  }, [fetchAdminJobs, debouncedSearch, pageHistory]);

  useEffect(() => {
    setCurrentPage(1);
    setPageHistory([null]);
    loadJobs(1);
  }, [debouncedSearch]);

  const handleNextPage = () => { if (localJobs.length < PAGE_SIZE) return; const n = currentPage + 1; setCurrentPage(n); loadJobs(n, true); };
  const handlePrevPage = () => { if (currentPage <= 1) return; const p = currentPage - 1; setCurrentPage(p); loadJobs(p, false); };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      category: job.category,
      description: job.description,
      applyLink: job.applyLink,
      salary: job.salary || '',
      status: job.status,
      expiresAt: job.expiresAt,
    });
    setShowEditor(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingJob) {
        await updateJob(editingJob.id, formData);
        setToast({ show: true, message: 'Job updated!', type: 'success' });
      } else {
        const id = await addJob(formData);
        setToast({ show: true, message: 'Job posted!', type: 'success' });
        if (formData.status === 'active') handleBroadcast(id);
      }
      setShowEditor(false); setEditingJob(null); setFormData(initialForm); loadJobs(currentPage);
    } catch (error) {
      setToast({ show: true, message: 'Failed to save job.', type: 'error' });
    } finally { setIsSubmitting(false); }
  };

  const handleBroadcast = async (jobId: string) => {
    setIsBroadcasting(jobId);
    const success = await broadcastJob(jobId);
    setToast({ show: true, message: success ? 'Broadcasted!' : 'Broadcast failed.', type: success ? 'success' : 'error' });
    setIsBroadcasting(null);
  };

  const performHunt = async (query?: string) => {
    setIsHunting(true);
    setToast({ show: true, message: query ? `Hunting for "${query}"...` : 'Hunting...', type: 'success' });
    try {
      const url = query ? `${PROXY_URL}/api/cron/job-hunter?mode=instant&q=${encodeURIComponent(query)}` : `${PROXY_URL}/api/cron/job-hunter?mode=instant`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setToast({ show: true, message: `Added ${data.added} new jobs!`, type: 'success' });
        loadJobs(1);
      } else { setToast({ show: true, message: 'Hunt failed.', type: 'error' }); }
    } catch (e) { setToast({ show: true, message: 'Error during hunt.', type: 'error' }); }
    finally { setIsHunting(false); }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <Icon name="briefcase" size={32} className="text-emerald-500" />
            Career Portal
          </h1>
          <p className="text-slate-500 mt-1 font-bold text-xs uppercase tracking-widest opacity-60">High-Traffic Job Management ({siteStats.totalJobs} alerts)</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {setEditingJob(null); setFormData(initialForm); setShowEditor(true);}} className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/30">
            <Icon name="plus" size={18} /> New Alert
          </button>
        </div>
      </div>

      {/* AI Job Hunter Panel */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl mb-8 relative overflow-hidden group">
        <Icon name="target" size={120} className="absolute -bottom-8 -right-8 text-white/5 rotate-[-15deg] group-hover:scale-110 transition-transform duration-700" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Icon name="zap" size={20} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-widest">AI Job Hunter Engine</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
             <div className="flex-1 relative">
               <Icon name="search" className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
               <input 
                  className="w-full pl-14 pr-6 py-5 bg-white/5 border-2 border-white/10 rounded-2xl text-white font-bold placeholder:text-slate-600 focus:border-emerald-500 focus:bg-white/10 outline-none transition-all" 
                  placeholder="Target keyword hunt (e.g. Hyderabad Software Engineer)..." 
                  value={huntTerm} 
                  onChange={e => setHuntTerm(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && performHunt(huntTerm)} 
               />
             </div>
             <button 
                onClick={() => performHunt(huntTerm)} 
                disabled={isHunting} 
                className="px-10 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3 h-[68px]"
             >
               {isHunting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="satellite" />} 
               {isHunting ? 'Scanning Market...' : 'Initiate Hunt'}
             </button>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4 ml-1 opacity-60">Pro Tip: Leaving search empty triggers a global market scan for trending vacancies.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search active alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-24 text-center">
            <Icon name="loader-2" size={48} className="animate-spin text-emerald-500 mx-auto mb-4 opacity-20" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Synchronizing Job Feed...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opportunity Details</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {localJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => handleEdit(job)}>
                    <td className="px-8 py-5">
                      <h3 className="font-black text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tight text-base mb-1">{job.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{job.company}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{job.location}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ring-1 ${job.status === 'active' ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{job.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); window.open(job.applyLink, '_blank'); }} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Icon name="external-link" size={20} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(job); }} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Icon name="edit" size={20} /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this job alert?')) deleteJob(job.id).then(() => loadJobs(currentPage)); }} className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Icon name="trash-2" size={20} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Page {currentPage} &bull; {totalCount} active alerts</span>
           <div className="flex gap-2">
             <button disabled={currentPage === 1 || isLoading} onClick={handlePrevPage} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all">Prev</button>
             <button disabled={localJobs.length < PAGE_SIZE || isLoading} onClick={handleNextPage} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all">Next</button>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={()=>!isSubmitting && setShowEditor(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <m.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-6 border-b flex items-center justify-between">
                 <h2 className="text-lg font-bold">Post New Job</h2>
                 <button onClick={()=>setShowEditor(false)} className="p-2 text-slate-400"><Icon name="x" size={20} /></button>
               </div>
               <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                  <input required className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl" placeholder="Job Title" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
                  <input required className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl" placeholder="Company" value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} />
                  <input required className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl" placeholder="Location" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
                  <textarea required rows={5} className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl" placeholder="Job Description" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
                  <input required type="url" className="w-full px-4 py-2.5 bg-slate-50 border rounded-xl" placeholder="Apply Link" value={formData.applyLink} onChange={e=>setFormData({...formData, applyLink: e.target.value})} />
                  <div className="flex gap-3">
                    <button type="button" onClick={()=>setShowEditor(false)} className="flex-1 py-3 font-bold border rounded-2xl">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-2xl">Save Job</button>
                  </div>
               </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={()=>setToast({...toast, show: false})} />
    </div>
  );
}

export default AdminJobs;
