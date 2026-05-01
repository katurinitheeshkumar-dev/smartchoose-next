import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Product, SocialLink, Settings, Analytics, DatabaseContextType, BlogPost, Job } from '@/types';
import { safeGetItem, safeSetItem, generateId, generateProductUrl, detectEcommercePlatform } from '@/lib/utils';
import { collection, onSnapshot, doc, setDoc, deleteDoc, increment, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdmin } from './AdminContext';

// Default Settings - Premium Product Discovery Platform
// NOTE: Admin credentials are NOT stored here - they are in secure AdminContext
const defaultSettings: Settings = {
  siteName: "SmartChoose",
  tagline: "Discover Premium Products | Compare & Shop Smart",
  logo: "/logo.png",
  favicon: "",
  primaryColor: "#10B981",
  secondaryColor: "#059669",
  accentColor: "#22C55E",
  phone: "+91 98765 43210",
  email: "hello@smartchoose.in",
  address: "Hyderabad, Telangana, India",
  aboutContent: "SmartChoose is India's premier product discovery platform. We curate the finest products from top e-commerce stores to help you make informed purchasing decisions. Compare prices, read reviews, and shop with confidence.",
  footerContent: "© 2024 SmartChoose. All rights reserved. Your trusted product discovery partner.",
  siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://smartchoose.in',
  footerLogo: "/logo-white.png",
  contactEmail: "hello@smartchoose.in",
  contactPhone: "+91 98765 43210",
  contactAddress: "Hyderabad, Telangana, India",
};

// Default Analytics
const emptyAnalyticsArray = Array.from({ length: 30 }, () => 0);
const defaultAnalytics: Analytics = {
  dailyVisitors: [...emptyAnalyticsArray],
  dailyClicks: [...emptyAnalyticsArray],
  trafficSources: { direct: 0, social: 0, search: 0 }
};

// Context Type imported from '@/types'
const DatabaseContext = createContext<DatabaseContextType | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  
  const [products, setProducts] = useState<Product[]>(() => safeGetItem('sc_products_cache', []));
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => safeGetItem('sc_blog_cache', []));
  const [jobs, setJobs] = useState<Job[]>(() => safeGetItem('sc_jobs_cache', []));
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(() => {
    const saved = safeGetItem('sc_social', null);
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    return [];
  });
  const [analytics, setAnalytics] = useState<Analytics>(defaultAnalytics);
  
  // ONE-TIME EMERGENCY PURGE (Fixes existing QuotaExceededErrors for returning users)
  useEffect(() => {
    const lastPurge = localStorage.getItem('sc_last_purge_v3');
    if (!lastPurge) {
      console.warn('🚀 Performing One-Time Stability Purge...');
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sc_')) localStorage.removeItem(k);
      });
      localStorage.setItem('sc_last_purge_v3', new Date().toISOString());
      // Reload to ensure state is clean
      window.location.reload();
    }
  }, []);

  // Sync Site Settings - Visitors: getDoc (One-time), Admins: onSnapshot (Real-time)
  useEffect(() => {
    const syncSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'site_settings'));
        if (snap.exists()) {
          setSettings(snap.data() as Settings);
        }
        setIsInitialLoading(false);
      } catch (e) {
        setIsInitialLoading(false);
      }

      // Only maintain a real-time connection for Admins to avoid Firestore 400 errors for visitors
      if (isAdmin) {
        const unsub = onSnapshot(doc(db, 'settings', 'site_settings'), (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as Settings);
          }
        }, (err) => console.warn('Settings Sync Error (Ignored for visitor stability):', err));
        return unsub;
      }
    };
    
    let unsub: any;
    syncSettings().then(u => unsub = u);
    return () => unsub?.();
  }, [isAdmin]);

  // 1. Fetch Products (DEFERRED for performance)
  useEffect(() => {
    const fetchProducts = () => {
      const q = isAdmin 
        ? query(collection(db, 'products'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(500));

      if (isAdmin) {
        return onSnapshot(q, (snapshot) => {
          const fbProducts = snapshot.docs.map(doc => doc.data() as Product);
          setProducts(fbProducts);
          setIsProductsLoading(false);
        }, (err) => {
          console.error('❌ Products Listener Error:', err);
          setIsProductsLoading(false);
        });
      } else {
        getDocs(q).then(snapshot => {
          const fbProducts = snapshot.docs.map(doc => doc.data() as Product);
          setProducts(fbProducts);
          safeSetItem('sc_products_cache', fbProducts.slice(0, 10));
          setIsProductsLoading(false);
        }).catch(err => {
          console.warn('Products Fetch Error (Visitor):', err);
          setIsProductsLoading(false);
        });
      }
    };

    // Delay product fetching by 1s to allow FCP to complete first
    const timer = setTimeout(fetchProducts, 1000);
    return () => clearTimeout(timer);
  }, [isAdmin]);

  // 2. Sync Blog Posts (DEFERRED)
  useEffect(() => {
    const syncBlogs = async () => {
      if (isAdmin) {
        return onSnapshot(collection(db, 'blogPosts'), (snapshot) => {
          const fbBlogs = snapshot.docs.map(d => d.data() as BlogPost);
          const uniqueBlogs = Array.from(new Map(fbBlogs.filter(b => b.title && b.title.trim() !== "").map(item => [item.slug, item])).values());
          uniqueBlogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setBlogPosts(uniqueBlogs);
        });
      } else {
        const snap = await getDocs(query(collection(db, 'blogPosts'), limit(24)));
        const fbBlogs = snap.docs.map(d => d.data() as BlogPost);
        const uniqueBlogs = Array.from(new Map(fbBlogs.filter(b => b.title && b.title.trim() !== "").map(item => [item.slug, item])).values());
        uniqueBlogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBlogPosts(uniqueBlogs);
        safeSetItem('sc_blog_cache', uniqueBlogs.slice(0, 10));
      }
    };

    const timer = setTimeout(syncBlogs, 2000);
    return () => clearTimeout(timer);
  }, [isAdmin]);

  // 3. Sync Jobs (DEFERRED)
  useEffect(() => {
    const syncJobs = async () => {
      const q = isAdmin 
        ? query(collection(db, 'jobs'), orderBy('postedAt', 'desc'))
        : query(collection(db, 'jobs'), orderBy('postedAt', 'desc'), limit(12));

      if (isAdmin) {
        return onSnapshot(q, (snapshot) => {
          const fbJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
          // Deduplicate by Title + Company to fix UI issues with identical postings
          const uniqueJobs = Array.from(new Map(fbJobs.map(item => [`${item.title.toLowerCase()}|${item.company.toLowerCase()}`, item])).values());
          setJobs(uniqueJobs);
          setIsJobsLoading(false);
        }, (err) => {
          console.error('❌ Jobs Listener Error:', err);
          setIsJobsLoading(false);
        });
      } else {
        getDocs(q).then(snapshot => {
          const fbJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
          // Deduplicate by Title + Company
          const uniqueJobs = Array.from(new Map(fbJobs.map(item => [`${item.title.toLowerCase()}|${item.company.toLowerCase()}`, item])).values());
          setJobs(uniqueJobs);
          safeSetItem('sc_jobs_cache', uniqueJobs.slice(0, 5));
          setIsJobsLoading(false);
        }).catch(err => {
          console.warn('Jobs Fetch Error (Visitor):', err);
          setIsJobsLoading(false);
        });
      }
    };

    const timer = setTimeout(syncJobs, 2500);
    return () => clearTimeout(timer);
  }, [isAdmin]);

  // 4. Analytics (DEFERRED)
  useEffect(() => {
    if (!isAdmin) return;

    const unsub = onSnapshot(doc(db, 'settings', 'global_analytics'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Analytics;
        setAnalytics({
          dailyVisitors: data.dailyVisitors || [...defaultAnalytics.dailyVisitors],
          dailyClicks: data.dailyClicks || [...defaultAnalytics.dailyClicks],
          trafficSources: data.trafficSources || { direct: 0, social: 0, search: 0 }
        });
      } else {
        setDoc(doc(db, 'settings', 'global_analytics'), defaultAnalytics);
        setAnalytics(defaultAnalytics);
      }
    });

    // Track Global Session Visit Once
    const trackGlobalVisit = async () => {
      const hasVisited = safeGetItem('sc_has_visited_today', false);
      if (!hasVisited) {
        safeSetItem('sc_has_visited_today', true);
        try {
          const ref = doc(db, 'settings', 'global_analytics');
          const snap = await getDoc(ref);
          let visitors = [...defaultAnalytics.dailyVisitors];
          let currentData = defaultAnalytics;
          if (snap.exists()) {
            currentData = snap.data() as Analytics;
            visitors = [...(currentData.dailyVisitors || defaultAnalytics.dailyVisitors)];
          }
          visitors[visitors.length - 1] = (visitors[visitors.length - 1] || 0) + 1;
          setDoc(ref, {
            ...currentData,
            dailyVisitors: visitors
          }, { merge: true });
        } catch (e) {
          console.error(e);
        }
      }
    };
    trackGlobalVisit();

    return () => unsub();
  }, []);

  // Firebase automatically keeps products and settings up-to-date, so no need for localStorage

  useEffect(() => {
    safeSetItem('sc_social', socialLinks);
  }, [socialLinks]);

  // Settings updater - PERSISTS TO FIREBASE
  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      await setDoc(doc(db, 'settings', 'site_settings'), newSettings, { merge: true });
    } catch (e) {
      console.error("Failed to update settings in Firestore:", e);
    }
  }, []);

  // Product operations
  const addProduct = useCallback((product: Omit<Product, 'id' | 'clicks' | 'views' | 'createdAt'>): string => {
    const newProduct: Product = {
      ...product,
      id: generateId('sc'),
      clicks: 0,
      views: 0,
      createdAt: new Date().toISOString(),
    };
    setDoc(doc(db, 'products', newProduct.id), newProduct);
    return newProduct.id;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setDoc(doc(db, 'products', id), { ...product, ...updates }, { merge: true });
    }
  }, [products]);

  const deleteProduct = useCallback((id: string) => {
    deleteDoc(doc(db, 'products', id));
  }, []);

  const duplicateProduct = useCallback((id: string) => {
    const product = products.find(p => p.id === id);
    if (product) {
      const duplicated: Product = {
        ...product,
        id: generateId('sc'),
        title: `${product.title} (Copy)`,
        clicks: 0,
        views: 0,
        createdAt: new Date().toISOString(),
        published: false
      };
      // Fix: persist duplicate to Firebase (was missing before)
      setDoc(doc(db, 'products', duplicated.id), duplicated);
    }
  }, [products]);

  const getProductById = useCallback((productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  }, [products]);

  // Platform detection helper
  const getPlatformFromUrl = useCallback((url: string) => {
    return detectEcommercePlatform(url);
  }, []);

  // Analytics operations
  const recordClick = useCallback((productId: string) => {
    if (productId) {
      try {
        const productRef = doc(db, 'products', productId);
        setDoc(productRef, { clicks: increment(1) }, { merge: true });

        // Update global analytics clicks
        const globalRef = doc(db, 'settings', 'global_analytics');
        getDoc(globalRef).then(snap => {
          let clicks = [...defaultAnalytics.dailyClicks];
          let currentData = defaultAnalytics;
          if (snap.exists()) {
            currentData = snap.data() as Analytics;
            clicks = [...(currentData.dailyClicks || defaultAnalytics.dailyClicks)];
          }
          clicks[clicks.length - 1] = (clicks[clicks.length - 1] || 0) + 1;
          setDoc(globalRef, { ...currentData, dailyClicks: clicks }, { merge: true });
        });
      } catch (e) {
        console.error("Failed to record click", e);
      }
    }
  }, []);

  const recordView = useCallback((productId: string) => {
    if (productId) {
      // Track session view to avoid counting multiple times per session
      const viewedProducts = safeGetItem('sc_viewed_products', []);
      if (!viewedProducts.includes(productId)) {
        viewedProducts.push(productId);
        safeSetItem('sc_viewed_products', viewedProducts);

        try {
          const productRef = doc(db, 'products', productId);
          setDoc(productRef, { views: increment(1) }, { merge: true });
        } catch (e) {
          console.error("Failed to record view", e);
        }
      }
    }
  }, []);

  // Social link operations
  const addSocialLink = useCallback((link: Omit<SocialLink, 'id'>) => {
    const newLink: SocialLink = {
      ...link,
      id: generateId('soc')
    };
    setSocialLinks(prev => [...prev, newLink]);
  }, []);

  const updateSocialLink = useCallback((id: string, updates: Partial<SocialLink>) => {
    setSocialLinks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSocialLink = useCallback((id: string) => {
    setSocialLinks(prev => prev.filter(s => s.id !== id));
  }, []);

  // Utility
  const getProductUrl = useCallback((productId: string): string => {
    return generateProductUrl(settings.siteUrl, productId);
  }, [settings.siteUrl]);

  // ---- BLOG MANAGEMENT ----
  const addBlog = useCallback(async (blog: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const newBlog: BlogPost = {
      ...blog,
      id: generateId('blog'),
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'blogPosts', newBlog.id), newBlog);
    return newBlog.id;
  }, []);

  const updateBlog = useCallback(async (id: string, updates: Partial<BlogPost>): Promise<void> => {
    await setDoc(doc(db, 'blogPosts', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  }, []);

  const deleteBlog = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'blogPosts', id));
  }, []);

  const getBlogBySlug = useCallback((slug: string): BlogPost | undefined => {
    return blogPosts.find(b => b.slug === slug);
  }, [blogPosts]);


  // ---- JOB MANAGEMENT ----
  const addJob = useCallback(async (job: Omit<Job, 'id' | 'postedAt' | 'views'>): Promise<string> => {
    const newJob: Job = {
      ...job,
      id: generateId('job'),
      postedAt: new Date().toISOString(),
      views: 0,
      applies: 0
    };
    await setDoc(doc(db, 'jobs', newJob.id), newJob);
    return newJob.id;
  }, []);

  const updateJob = useCallback(async (id: string, updates: Partial<Job>): Promise<void> => {
    await setDoc(doc(db, 'jobs', id), updates, { merge: true });
  }, []);

  const deleteJob = useCallback(async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'jobs', id));
  }, []);

  const getJobById = useCallback(async (jobId: string): Promise<Job | undefined> => {
    // Check local state first
    const local = jobs.find(j => j.id === jobId);
    if (local) return local;

    // Fetch from Firebase directly for fast individual page loads
    try {
      const snap = await getDoc(doc(db, 'jobs', jobId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Job;
      }
    } catch (err) {
      console.warn('Job Fetch Error (Single):', err);
    }
    return undefined;
  }, [jobs]);

  const broadcastJob = useCallback(async (jobId: string): Promise<boolean> => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return false;

    try {
      const response = await fetch('https://smartchoose-proxy.vercel.app/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'job',
          id: jobId,
          settings: {
            telegramBotToken: settings.telegramBotToken,
            telegramChannelId: settings.telegramChannelId,
            whatsappWebhookUrl: settings.whatsappWebhookUrl,
            siteUrl: settings.siteUrl,
            siteName: settings.siteName
          }
        }),
      });
      
      if (response.ok) {
        await updateJob(jobId, { broadcasted: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Broadcast error:', error);
      return false;
    }
  }, [jobs, settings, updateJob]);

  const broadcastProduct = useCallback(async (productId: string): Promise<boolean> => {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    try {
      const response = await fetch('https://smartchoose-proxy.vercel.app/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product',
          id: productId,
          settings: {
            telegramBotToken: settings.telegramBotToken,
            telegramChannelId: settings.telegramChannelId,
            whatsappWebhookUrl: settings.whatsappWebhookUrl,
            instagramWebhookUrl: settings.instagramWebhookUrl,
            siteUrl: settings.siteUrl,
            siteName: settings.siteName
          }
        }),
      });
      
      if (response.ok) {
        // Optimistically update local context since backend updates its own flag
        updateProduct(productId, { broadcasted: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error broadcasting product:', error);
      return false;
    }
  }, [products, updateProduct, settings]);

  const broadcastBlog = useCallback(async (blogId: string): Promise<boolean> => {
    try {
      const response = await fetch('https://smartchoose-proxy.vercel.app/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'blog',
          id: blogId,
          settings: {
            telegramBotToken: settings.telegramBotToken,
            telegramChannelId: settings.telegramChannelId,
            siteUrl: settings.siteUrl,
          }
        }),
      });
      
      if (response.ok) {
        updateBlog(blogId, { broadcasted: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Blog Broadcast error:', error);
      return false;
    }
  }, [settings, updateBlog]);

  const recordJobApply = useCallback((jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setDoc(doc(db, 'jobs', jobId), { applies: increment(1) }, { merge: true });
    }
  }, [jobs]);

  const recordJobView = useCallback((jobId: string) => {
    if (jobId) {
      // Track session view to avoid counting multiple times per session
      const viewedJobs = safeGetItem('sc_viewed_jobs', []);
      if (!viewedJobs.includes(jobId)) {
        viewedJobs.push(jobId);
        safeSetItem('sc_viewed_jobs', viewedJobs);

        try {
          const jobRef = doc(db, 'jobs', jobId);
          setDoc(jobRef, { views: increment(1) }, { merge: true });
        } catch (e) {
          console.error("Failed to record job view", e);
        }
      }
    }
  }, []);

  const value = useMemo(() => ({
    settings,
    products,
    socialLinks,
    analytics,
    isInitialLoading,
    isProductsLoading,
    updateSettings,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    recordClick,
    recordView,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    getProductUrl,
    getProductById,
    getPlatformFromUrl,
    blogPosts,
    addBlog,
    updateBlog,
    deleteBlog,
    getBlogBySlug,
    jobs,
    isJobsLoading,
    addJob,
    updateJob,
    deleteJob,
    recordJobApply,
    recordJobView,
    getJobById,
    broadcastJob,
    broadcastProduct,
    broadcastBlog,
  }), [settings, products, socialLinks, analytics, isInitialLoading, updateSettings, addProduct, updateProduct, deleteProduct, duplicateProduct, recordClick, recordView, addSocialLink, updateSocialLink, deleteSocialLink, getProductUrl, getProductById, getPlatformFromUrl, blogPosts, addBlog, updateBlog, deleteBlog, getBlogBySlug, jobs, isJobsLoading, addJob, updateJob, deleteJob, broadcastJob, recordJobApply, recordJobView, broadcastProduct, broadcastBlog]);

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

