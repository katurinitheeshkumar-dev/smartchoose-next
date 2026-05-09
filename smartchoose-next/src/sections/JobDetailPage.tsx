"use client";
import { useEffect, useState, useMemo } from 'react';
import { ensureAbsoluteUrl } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useBookmarks } from '@/hooks/useBookmarks';

export default function JobDetailPage({ initialJob }: { initialJob?: any }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { jobs, getJobById, recordJobView, recordJobApply, settings } = useDatabase();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [job, setJob] = useState<any>(initialJob);
  const [isFetching, setIsFetching] = useState(!initialJob);

  useEffect(() => {
    if (!id || initialJob) return;

    const loadJob = async () => {
      const found = await getJobById(id);
      if (found) {
        setJob(found);
        recordJobView(found.id);
      }
      setIsFetching(false);
    };

    loadJob();
  }, [id, getJobById, recordJobView, initialJob]);

  const similarJobs = useMemo(() => {
    if (!job) return [];
    return jobs
      .filter(j => j.id !== job.id && j.status === 'active' && (j.category === job.category || j.company === job.company))
      .slice(0, 3);
  }, [job, jobs]);

  const jobSchemaData = job ? {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": job.postedAt,
    "validThrough": job.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    "employmentType": job.type === 'Full-time' ? 'FULL_TIME' : job.type === 'Part-time' ? 'PART_TIME' : job.type === 'Contract' ? 'CONTRACTOR' : 'OTHER',
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company,
      "sameAs": settings.siteUrl,
      "logo": settings.logo
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location,
        "addressCountry": "IN"
      }
    },
    ... (job.salary ? {
      "baseSalary": {
        "@type": "MonetaryAmount",
        "currency": "INR",
        "value": {
          "@type": "QuantitativeValue",
          "value": job.salary,
          "unitText": "YEAR"
        }
      }
    } : {})
  } : null;

  if (isFetching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-14 h-14 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <p className="text-slate-500 font-semibold">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen py-32 text-center px-4">
        <h2 className="text-2xl font-bold text-slate-900">Job Not Found</h2>
        <p className="text-slate-500 mt-2 mb-4">This job may have been removed or the link is incorrect.</p>
        <Link href="/jobs" className="text-emerald-600 font-bold hover:underline">← Back to All Jobs</Link>
      </div>
    );
  }

  const shareText = `🚀 *Job Alert: ${job.title}*\n\n🏢 *Company:* ${job.company}\n📍 *Location:* ${job.location}\n${job.salary ? `💰 *Salary:* ${job.salary}\n` : ''}\n🔗 *Apply & View Details:* \n${settings.siteUrl}/jobs/${job.id}\n\n#Jobs #Hiring #Careers #SmartChoose`;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4">
      <Helmet>
        <title>{`${job.title} at ${job.company} | ${settings.siteName} Jobs`}</title>
        <meta name="description" content={`Apply for ${job.title} at ${job.company} in ${job.location}. ${job.salary ? `Salary: ${job.salary}.` : ''} Latest job alert on ${settings.siteName}.`} />
        <link rel="canonical" href={`${settings.siteUrl}/jobs/${job.id}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${settings.siteUrl}/jobs/${id}`} />
        <meta property="og:title" content={`${job.title} | ${settings.siteName} Jobs`} />
        <meta property="og:description" content={`Hiring at ${job.company}! Apply now for ${job.title}.`} />
        <meta property="og:image" content={`${settings.siteUrl}/jobs-og.png`} />
        <meta property="og:image:secure_url" content={`${settings.siteUrl}/jobs-og.png`} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${settings.siteUrl}/jobs/${id}`} />
        <meta property="twitter:title" content={`${job.title} | ${settings.siteName} Jobs`} />
        <meta property="twitter:description" content={`Hiring at ${job.company}! Apply now for ${job.title}.`} />
        <meta property="twitter:image" content={`${settings.siteUrl}/jobs-og.png`} />
        
        {jobSchemaData && (
          <script type="application/ld+json">
            {JSON.stringify(jobSchemaData)}
          </script>
        )}
      </Helmet>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back Link */}
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-colors py-2 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm group"
        >
          <Icon name="arrow-left" size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Job Header */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500">
                <Icon name="briefcase" size={40} />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-slate-900 leading-tight">{job.title}</h1>
                <div className="flex items-center gap-2 text-lg font-bold text-slate-500">
                  <Icon name="building-2" size={18} className="text-indigo-500" />
                  {job.company}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider">
                {job.type}
              </span>
              <span className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider">
                {job.category}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-50">
            <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Icon name="map-pin" size={14} className="text-emerald-500" />
                {job.location}
              </div>
            </div>
            <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salary</p>
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Icon name="banknote" size={14} className="text-emerald-500" />
                {job.salary || 'Best in Industry'}
              </div>
            </div>
            <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posted</p>
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Icon name="calendar" size={14} className="text-emerald-500" />
                {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'Recently'}
              </div>
            </div>
            <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Icon name="tag" size={14} className="text-emerald-500" />
                {job.category}
              </div>
            </div>
          </div>
          
          {/* Abstract backdrop */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 blur-2xl opacity-50" />
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 border-b border-slate-50 pb-4">Job Description</h2>
              <div className="prose prose-slate max-w-none prose-p:font-medium prose-li:font-medium whitespace-pre-wrap text-slate-600 leading-relaxed">
                {job.description}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Clean Icon-based Header (Removed Banner) */}
            <div className="mb-8 rounded-3xl bg-slate-50 border border-slate-100 p-6 flex items-center gap-4">
               <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-500 shadow-sm">
                  <Icon name="briefcase" size={32} />
               </div>
               <div>
                  <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
                  <p className="text-slate-500 font-medium">{job.company}</p>
               </div>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-emerald-500/10 mb-8 overflow-hidden relative">
              <div className="space-y-4">
                <a 
                  href={ensureAbsoluteUrl(job.applyLink)}
                  target="_blank"
                  onClick={() => recordJobApply(job.id)}
                  className="block w-full bg-emerald-500 text-white rounded-2xl py-4 text-center font-black text-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-xl shadow-emerald-500/30 group border-b-4 border-emerald-700 hover:border-b-2 hover:translate-y-[2px]"
                >
                  APPLY NOW
                  <Icon name="external-link" size={22} className="inline-block ml-2 group-hover:scale-110 transition-transform" />
                </a>
                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleBookmark(job.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all border ${
                      isBookmarked(job.id)
                      ? 'bg-amber-50 border-amber-200 text-amber-600'
                      : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon name="bookmark" size={18} fill={isBookmarked(job.id) ? "currentColor" : "none"} />
                    {isBookmarked(job.id) ? 'Saved' : 'Save Job'}
                  </button>
                  <button 
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#128C7E] transition-all active:scale-95 shadow-lg shadow-green-500/20"
                    title="Share to WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Share on WhatsApp
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center animate-pulse">
                    <Icon name="zap" size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Apply quickly</p>
                    <p className="text-xs font-black text-orange-600">{job.applies > 50 ? '50+ applicants' : 'High interest'} recently</p>
                  </div>
                </div>
                {job.expiresAt && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-wider bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                    <Icon name="clock" size={14} />
                    Expiring in {Math.ceil((new Date(job.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </div>
                )}
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-4 text-center space-y-2">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Join our community</p>
                   <div className="flex gap-2 justify-center">
                      <a href={`https://t.me/${settings.telegramChannelId?.replace('@', '') || 'smartchoose'}`} target="_blank" className="p-2 bg-white rounded-xl text-emerald-500 shadow-sm hover:scale-110 hover:bg-emerald-500 hover:text-white transition-all border border-slate-100">
                        <Icon name="send" size={20} />
                      </a>
                      <a href={`https://whatsapp.com/channel/your-channel-id`} target="_blank" className="p-2 bg-white rounded-xl text-emerald-500 shadow-sm hover:scale-110 hover:bg-emerald-500 hover:text-white transition-all border border-slate-100">
                        <Icon name="message-circle" size={20} />
                      </a>
                   </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Similar Jobs Section */}
        {similarJobs.length > 0 && (
          <div className="pt-16 pb-8 space-y-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Handpicked for You</h2>
                <p className="text-sm font-medium text-slate-500">Related job alerts based on your interest</p>
              </div>
              <Link href="/jobs" 
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
              >
                Explore All <Icon name="arrow-right" size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarJobs.slice(0, 6).map(sj => (
                <Link 
                  key={sj.id} 
                  href={`/jobs/${sj.id}`}
                  className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
                >
                  {/* Subtle Background Pattern */}
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Icon name="briefcase" size={120} className="-mr-10 -mt-10" />
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                        <Icon name="briefcase" size={24} />
                      </div>
                      <div className="text-right">
                         <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg tracking-wider group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                           {sj.type || 'Full Time'}
                         </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-6 flex-1">
                      <h3 className="font-extrabold text-slate-900 text-lg leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                        {sj.title}
                      </h3>
                      <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                        <span className="truncate">{sj.company}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>{sj.location}</span>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Salary</p>
                        <p className="text-sm font-black text-slate-900">{sj.salary || 'Best in Industry'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Icon name="arrow-right" size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="sm:hidden">
              <Link href="/jobs" 
                className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-sm font-bold shadow-sm"
              >
                Explore All Jobs <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
