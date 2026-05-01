import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/custom/Icon';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Helmet>
        <title>404 - Page Not Found | SmartChoose</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-emerald-600">
          <Icon name="search-x" size={48} />
        </div>
        
        <h1 className="text-6xl font-black text-slate-900 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Page Not Found</h2>
        
        <p className="text-slate-500 mb-10 leading-relaxed text-lg">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
          >
            <Icon name="home" size={20} />
            Go Home
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 bg-white text-slate-900 font-bold py-4 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="arrow-left" size={20} />
            Go Back
          </button>
        </div>
        
        <div className="mt-12 text-slate-400 text-sm">
          Think this is a mistake? <a href="/contact" className="text-emerald-600 font-semibold hover:underline">Contact Support</a>
        </div>
      </m.div>
    </div>
  );
}
