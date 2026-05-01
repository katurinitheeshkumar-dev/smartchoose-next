import { useState, useMemo } from 'react';
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
  'IT & Software',
  'Marketing & Sales',
  'Healthcare',
  'Education',
  'Finance',
  'Govt Jobs',
  'Engineering',
  'Remote / Freelance',
  'Others'
];

const PROXY_URL = 'https://smartchoose-proxy.vercel.app';

export function AdminJobs() {
  const { jobs, addJob, updateJob, deleteJob, broadcastJob } = useDatabase();
  const [showEditor, setShowEditor] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState<string | null>(null);
  const [isHunting, setIsHunting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [searchTerm, setSearchTerm] = useState('');
  const [huntTerm, setHuntTerm] = useState('');


  const filteredJobs = useMemo(() => {
    // 1. Search filter
    const searchFiltered = jobs.filter(j => 
       j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       j.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Visual de-duplication (Keep only the first/newest occurrence in the list)
    const seen = new Set();
    return searchFiltered.filter(job => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [jobs, searchTerm]);

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
        setToast({ show: true, message: 'Job updated successfully!', type: 'success' });
      } else {
        const jobId = await addJob(formData);
        setToast({ show: true, message: 'Job posted successfully!', type: 'success' });
        
        // Auto-broadcast new active jobs
        if (formData.status === 'active' && jobId) {
          handleBroadcast(jobId);
        }
      }
      setShowEditor(false);
      setEditingJob(null);
      setFormData(initialForm);
    } catch (error) {
      setToast({ show: true, message: 'Failed to save job.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBroadcast = async (jobId: string) => {
    setIsBroadcasting(jobId);
    const success = await broadcastJob(jobId);
    if (success) {
      setToast({ show: true, message: 'Broadcasted to channels!', type: 'success' });
    } else {
      setToast({ show: true, message: 'Broadcast failed. Check settings.', type: 'error' });
    }
    setIsBroadcasting(null);
  };

  const handleAutoHunt = async () => {
    if (!confirm("AI will now search for 5-10 new jobs and post them LIVE immediately. Continue?")) return;
    performHunt();
  };

  const handleKeywordHunt = async () => {
    if (!huntTerm.trim()) return;
    performHunt(huntTerm);
  };

  const performHunt = async (query?: string) => {
    setIsHunting(true);
    setToast({ 
      show: true, 
      message: query ? `AI is hunting for "${query}"...` : 'AI is hunting for new jobs...', 
      type: 'success' 
    });
    
    try {
      const url = query 
        ? `${PROXY_URL}/api/cron/job-hunter?mode=instant&q=${encodeURIComponent(query)}`
        : `${PROXY_URL}/api/cron/job-hunter?mode=instant`;
        
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setToast({ 
          show: true, 
          message: `Success! Added ${data.added} new live jobs.`, 
          type: 'success' 
        });
        if (query) setHuntTerm('');
      } else {
        setToast({ show: true, message: 'Hunt failed or found no new jobs.', type: 'error' });
      }
    } catch (e) {
      setToast({ show: true, message: 'Network error during hunt.', type: 'error' });
    } finally {
      setIsHunting(false);
    }
  };


  const handleMagicFill = async () => {
    const text = prompt("Paste the job description or text here, and AI will fill the form for you:");
    if (!text) return;

    setToast({ show: true, message: 'AI is analyzing text...', type: 'success' });
    
    try {
      const response = await fetch(`${PROXY_URL}/api/ai-blog-helper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract-job-details',
          text: text
        })
      });
      
      const data = await response.json();
      if (data.success && data.jobDetails) {
        setFormData(prev => ({
          ...prev,
          ...data.jobDetails
        }));
        setToast({ show: true, message: 'Magic Fill complete!', type: 'success' });
      } else {
        setToast({ show: true, message: 'AI failed to extract details.', type: 'error' });
      }
    } catch (e) {
      setToast({ show: true, message: 'Network error with AI.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Alerts</h1>
          <p className="text-slate-500">Manage high-traffic job opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoHunt}
            disabled={isHunting}
            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-500/20 hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {isHunting ? <Icon name="loader-2" size={20} className="animate-spin" /> : <Icon name="zap" size={20} className="text-amber-400" />}
            AI Auto-Hunt Now
          </button>
          <button
            onClick={() => {
              setEditingJob(null);
              setFormData(initialForm);
              setShowEditor(true);
            }}
            className="btn-primary px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Icon name="plus" size={20} />
            Post New Job
          </button>
        </div>
      </div>

      {/* Manual Hunt Bar */}
      <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-900/10 border border-slate-800">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              placeholder="Identify specific jobs (e.g. Hyderabad fresher jobs, 35k jobs, Btech jobs...)"
              value={huntTerm}
              onChange={(e) => setHuntTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleKeywordHunt()}
              className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
            <Icon name="target" className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
          </div>
          <button
            onClick={handleKeywordHunt}
            disabled={isHunting || !huntTerm.trim()}
            className="w-full md:w-auto px-8 py-4 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            {isHunting ? <Icon name="loader-2" size={20} className="animate-spin" /> : <Icon name="zap" size={20} />}
            Hunt Now
          </button>
        </div>
        <p className="mt-3 text-[10px] text-slate-500 font-medium px-1 flex items-center gap-2">
          <Icon name="info" size={12} />
          Type keywords for location, salary, or technology. AI will fetch and post matching jobs instantly.
        </p>
      </div>

      {/* Search & Stats */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Search jobs or companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          />
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <Icon name="briefcase" size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-600">Total Active</p>
              <p className="text-xl font-black text-emerald-900">{jobs.filter(j => j.status === 'active').length}</p>
            </div>
          </div>
          <Icon name="trending-up" className="text-emerald-400" size={24} />
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Job Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Location/Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Stats</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                        <Icon name="briefcase" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{job.title}</p>
                        <p className="text-xs text-slate-500 font-medium">{job.company}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-700">{job.location}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{job.type}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block min-w-[70px] ${
                      job.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      job.status === 'expired' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-slate-400">
                      <div className="flex items-center gap-1" title="Views">
                        <Icon name="eye" size={14} />
                        <span className="text-xs font-bold">{job.views || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.status === 'draft' && (
                        <button
                          onClick={async () => {
                            try {
                              await updateJob(job.id, { ...job, status: 'active' });
                              setToast({ show: true, message: 'Published! Broadcasting...', type: 'success' });
                              handleBroadcast(job.id);
                            } catch (e) {
                              setToast({ show: true, message: 'Failed to publish.', type: 'error' });
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                          title="Publish & Broadcast Now"
                        >
                          <Icon name="zap" size={14} />
                          Quick Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleBroadcast(job.id)}
                        disabled={isBroadcasting === job.id || job.status !== 'active'}
                        className={`p-2 rounded-xl transition-all ${
                          job.broadcasted 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-slate-100 text-slate-400 hover:bg-blue-500 hover:text-white disabled:opacity-30'
                        }`}
                        title={job.status !== 'active' ? 'Publish first to broadcast' : 'Broadcast to Channels'}
                      >
                        {isBroadcasting === job.id ? <Icon name="loader-2" size={18} className="animate-spin" /> : <Icon name="share-2" size={18} />}
                      </button>
                      <button
                        onClick={() => handleEdit(job)}
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all"
                        title="Edit Job"
                      >
                        <Icon name="edit" size={18} />
                      </button>
                      <button
                        onClick={() => { if(confirm('Delete this job?')) deleteJob(job.id); }}
                        className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                        title="Delete Job"
                      >
                        <Icon name="trash-2" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="py-20 text-center">
              <Icon name="search-x" size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No jobs found matching your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowEditor(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Icon name="briefcase" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{editingJob ? 'Edit Job' : 'Post New Job'}</h2>
                    <p className="text-xs text-slate-500">All fields marked with * are required</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleMagicFill}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  <Icon name="sparkles" size={14} />
                  Magic Fill
                </button>
                <button onClick={() => setShowEditor(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                  <Icon name="x" size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Title *</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Senior React Developer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Company Name *</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. Google India"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Location *</label>
                    <input
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Hyderabad, Telangana"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Category</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Type</label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Apply Link *</label>
                    <input
                      required
                      type="url"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono text-xs"
                      value={formData.applyLink}
                      onChange={e => setFormData({ ...formData, applyLink: e.target.value })}
                      placeholder="https://career.google.com/jobs/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Salary (Optional)</label>
                    <input
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.salary}
                      onChange={e => setFormData({ ...formData, salary: e.target.value })}
                      placeholder="e.g. ₹15 LPA - ₹25 LPA"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      value={formData.expiresAt || ''}
                      onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Description *</label>
                    <textarea
                      required
                      rows={6}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Write job details, requirements, etc..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      {(['draft', 'active', 'expired'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            formData.status === s ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEditor(false)}
                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Icon name="loader-2" size={20} className="animate-spin" /> : <Icon name="save" size={20} />}
                    {editingJob ? 'Update Job' : 'Publish Job'}
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}
export default AdminJobs;
