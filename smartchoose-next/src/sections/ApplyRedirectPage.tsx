import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Icon } from '@/components/ui/custom/Icon';
import { ensureAbsoluteUrl } from '@/lib/utils';

export default function ApplyRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const { getJobById, recordJobApply } = useDatabase();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const performRedirect = async () => {
      try {
        const job = await getJobById(id);
        if (job && job.applyLink) {
          recordJobApply(job.id);
          const absoluteUrl = ensureAbsoluteUrl(job.applyLink);
          
          // Small delay for UX and tracking to fire
          setTimeout(() => {
            window.location.href = absoluteUrl;
          }, 1000);
        } else {
          setError('Job application link not found.');
        }
      } catch (err) {
        setError('Failed to load application link.');
      }
    };

    performRedirect();
  }, [id, getJobById, recordJobApply]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
          <Icon name="alert-circle" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Redirect Error</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button 
          onClick={() => window.location.href = '/jobs'}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold"
        >
          Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-emerald-500 text-white">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <Icon name="external-link" size={48} />
      </div>
      <h1 className="text-3xl font-black mb-2">Redirecting You...</h1>
      <p className="text-emerald-100 font-bold opacity-90">Taking you directly to the application page</p>
      
      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-progress origin-left" style={{ width: '100%' }}></div>
        </div>
        <p className="text-xs font-black uppercase tracking-widest opacity-60">SmartChoose Safe Link</p>
      </div>
    </div>
  );
}
