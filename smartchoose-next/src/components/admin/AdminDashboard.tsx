import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/custom/Icon';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminOverview } from './AdminOverview';
import { AdminProducts } from './AdminProducts';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminSocial } from './AdminSocial';
import { AdminSettings } from './AdminSettings';
import { AdminBlogPosts } from './AdminBlogPosts';
import { AdminJobs } from './AdminJobs';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user, role } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<{ timestamp?: string; totalUrls?: number; indexNowSubmitted?: number; googleIndexing?: { success: number }; error?: string } | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('✅ PWA Install Prompt detected');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Fetch last indexing status from Firestore via proxy
  useEffect(() => {
    fetch('https://smartchoose-proxy.vercel.app/api/cron/auto-index.js', {
      method: 'GET',
      headers: { 'x-admin-status-check': 'true' }
    }).catch(() => {});
    
    // Read last run from Firestore settings (via a quick fetch)
    import('@/lib/firebase').then(({ db: _db }) => {
      import('firebase/firestore').then(({ doc, getDoc }) => {
        getDoc(doc((_db as any), 'settings', 'lastIndexingRun')).then(snap => {
          if (snap.exists()) setIndexingStatus(snap.data() as any);
        }).catch(() => {});
      });
    });
  }, []);

  const handleRequestIndexing = async () => {
    setIsIndexing(true);
    try {
      const res = await fetch('https://smartchoose-proxy.vercel.app/api/cron/auto-index.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-trigger': 'true' }
      });
      const data = await res.json();
      if (data.success) {
        setIndexingStatus(data);
        alert(`✅ Indexing complete!\n\n• ${data.indexNowSubmitted} URLs → Bing/Yandex\n• ${data.googleIndexing?.success || 0} URLs → Google\n\nGoogle will crawl within hours!`);
      } else {
        alert('⚠️ Indexing had issues: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert('❌ Failed to trigger indexing. Check proxy server.');
    }
    setIsIndexing(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If prompt isn't ready or doesn't exist, show our custom guide
      setShowInstallGuide(true);
      return;
    }
    
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('Error triggering install prompt:', err);
      setShowInstallGuide(true);
    }
  };

  // Extract active tab from URL path
  const pathParts = pathname.split('/');
  const activeTab = pathParts[2] || 'overview';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'layout-dashboard' },
    { id: 'products', label: 'Products', icon: 'package' },
    { id: 'blog', label: 'Blog Posts', icon: 'newspaper' },
    { id: 'jobs', label: 'Job Alerts', icon: 'briefcase' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-3' },
    { id: 'social', label: 'Social Media', icon: 'share-2' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* PWA Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 mx-auto mb-6 flex items-center justify-center text-emerald-600">
              <Icon name="download" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-4">How to Install</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">1</div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Tap the <span className="font-bold text-slate-900 px-1 bg-slate-200 rounded">Share</span> icon (iPhone) or <span className="font-bold text-slate-900 px-1 bg-slate-200 rounded">3 dots ⋮</span> (Android) at the top right of your browser.
                </p>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">2</div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Select <span className="font-bold text-slate-900 px-1 bg-emerald-100 rounded text-emerald-700">Add to Home Screen</span> or <span className="font-bold text-slate-900 px-1 bg-emerald-100 rounded text-emerald-700">Install App</span>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full btn-primary py-4 rounded-2xl text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all"
            >
              Got it, let's go!
            </button>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fix responsiveness */}
      <aside className={`fixed inset-y-0 left-0 bg-white w-64 shadow-xl lg:shadow-none lg:border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* User Profile */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white ring-2 ring-emerald-50 shrink-0">
              <Icon name="user" size={20} />
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-slate-900 truncate block text-sm">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                  role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                  role === 'editor' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {role?.replace('_', ' ') || 'Guest'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 h-[calc(100vh-320px)] overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                router.push(`/admin/${tab.id}`);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id || (activeTab === 'products' && tab.id === 'products')
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
            >
              <Icon name={tab.icon} size={20} className={activeTab === tab.id ? 'text-white' : 'text-slate-500'} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white space-y-1">
          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all border border-emerald-200 mb-1"
            >
              <Icon name="download" size={18} />
              Install Admin App
            </button>
          )}

          {/* 🔍 Request Indexing Button */}
          <button
            onClick={handleRequestIndexing}
            disabled={isIndexing}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border mb-1 ${
              isIndexing
                ? 'bg-blue-50 text-blue-400 border-blue-100 cursor-not-allowed'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
            }`}
          >
            <Icon name={isIndexing ? 'loader-2' : 'search'} size={16} className={isIndexing ? 'animate-spin' : ''} />
            <div className="flex flex-col items-start min-w-0">
              <span>{isIndexing ? 'Indexing...' : 'Request Indexing'}</span>
              {indexingStatus?.timestamp && !isIndexing && (
                <span className="text-[9px] text-blue-400 font-normal">
                  Last: {new Date(indexingStatus.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => {
              onBack();
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-all"
          >
            <Icon name="arrow-left" size={20} />
            Back to Website
          </button>
          <button
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <Icon name="log-out" size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icon name="menu" size={24} />
          </button>
          <span className="font-bold text-slate-900 capitalize block truncate px-4">{activeTab}</span>
          <div className="w-10" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto w-full">
            {(() => { switch(activeTab) { case 'overview': return <AdminOverview />; case 'products': return <AdminProducts />; case 'blog': return <AdminBlogPosts />; case 'jobs': return <AdminJobs />; case 'analytics': return <AdminAnalytics />; case 'social': return <AdminSocial />; case 'settings': return <AdminSettings />; default: return <AdminOverview />; } })()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;

