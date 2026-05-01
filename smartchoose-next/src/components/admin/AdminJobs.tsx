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

export function AdminJobs() {
  const { fetchAdminJobs, addJob, updateJob, deleteJob, broadcastJob, siteStats } = useDatabase();
  const [showEditor, setShowEditor] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [isHunting, setIsHunting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [huntTerm, setHuntTerm] = useState('');
  
  const [localJobs, setLocalJobs] = useState<Job[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageHistory, setPageHistory] = useState<any[]>([null]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Icon name="briefcase" size={26} className="text-emerald-500" /> Job Alerts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage high-traffic job opportunities ({siteStats.totalJobs} total)</p>
        </div>
        <button onClick={()=>{setEditingJob(null); setFormData(initialForm); setShowEditor(true);}} className="px-5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl shadow-lg">+ New Job</button>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
        <div className="flex gap-4">
           <div className="flex-1 relative">
             <Icon name="target" className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
             <input className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white" placeholder="Keyword hunt (e.g. Hyderabad Fresher)..." value={huntTerm} onChange={e=>setHuntTerm(e.target.value)} onKeyDown={e=>e.key==='Enter' && performHunt(huntTerm)} />
           </div>
           <button onClick={()=>performHunt(huntTerm)} disabled={isHunting} className="px-8 bg-emerald-500 text-white rounded-2xl font-bold disabled:opacity-50 flex items-center gap-2">
             {isHunting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="zap" />} Hunt
           </button>
        </div>
      </div>

      <div className="relative">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl" placeholder="Search jobs..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center"><Icon name="loader-2" size={40} className="animate-spin text-emerald-500 mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Job</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {localJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{job.title}</p>
                      <p className="text-xs text-slate-500">{job.company} &bull; {job.location}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${job.status==='active'?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{job.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                       <button onClick={()=>handleEdit(job)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"><Icon name="edit" size={18} /></button>
                       <button onClick={()=>{if(confirm('Delete?')) deleteJob(job.id).then(()=>loadJobs(currentPage));}} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Icon name="trash-2" size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
           <span className="text-[10px] font-black text-slate-400 uppercase">Page {currentPage} &bull; {totalCount} total</span>
           <div className="flex gap-2">
             <button disabled={currentPage===1 || isLoading} onClick={handlePrevPage} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black uppercase disabled:opacity-30">Prev</button>
             <button disabled={localJobs.length < PAGE_SIZE || isLoading} onClick={handleNextPage} className="px-4 py-2 bg-white border rounded-xl text-[10px] font-black uppercase disabled:opacity-30">Next</button>
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
