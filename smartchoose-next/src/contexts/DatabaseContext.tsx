"use client";
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Product, SocialLink, Settings, Analytics, DatabaseContextType, BlogPost, Job, SiteStats, Inquiry } from '@/types';
import { safeGetItem, safeSetItem, generateId, generateProductUrl, detectEcommercePlatform } from '@/lib/utils';
import { onSnapshot, doc, increment, getDoc, getDocs, query, orderBy, limit, where, startAfter, collection } from 'firebase/firestore';
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
  siteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://www.smartchoose.in',
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
  
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(defaultAnalytics);
  const [siteStats, setSiteStats] = useState<SiteStats>({
    totalProducts: 0,
    totalPublishedProducts: 0,
    totalClicks: 0,
    totalViews: 0,
    totalBlogs: 0,
    totalJobs: 0
  });
  
  // Initial Load from Cache
  useEffect(() => {
    setProducts(safeGetItem('sc_products_cache', []));
    setBlogPosts(safeGetItem('sc_blog_cache', []));
    setJobs(safeGetItem('sc_jobs_cache', []));
    
    const savedSocial = safeGetItem('sc_social', null);
    if (savedSocial && Array.isArray(savedSocial)) setSocialLinks(savedSocial);

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

  // 1. Fetch Products - REMOVED GLOBAL SYNC FOR 100K SCALE
  // Visitors use infinite scroll. Admins use paginated table.
  useEffect(() => {
    setIsProductsLoading(false);
  }, []);

  // 2. Sync Blog Posts (LIMITED)
  useEffect(() => {
    const syncBlogs = async () => {
      try {
        const q = query(collection(db, 'blogPosts'), orderBy('updatedAt', 'desc'), limit(10));
        const snap = await getDocs(q);
        const fbBlogs = snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
        setBlogPosts(fbBlogs);
        safeSetItem('sc_blog_cache', fbBlogs);
      } catch (err) {
        console.warn('Blog Sync Error:', err);
      }
    };
    
    const timer = setTimeout(syncBlogs, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 3. Sync Global Stats (Real-time for Dashboard)
  useEffect(() => {
    if (!isAdmin) return;
    return onSnapshot(doc(db, 'settings', 'site_stats'), (snap) => {
      if (snap.exists()) {
        setSiteStats(snap.data() as SiteStats);
      }
    });
  }, [isAdmin]);

  // 4. Sync Jobs (LIMITED)
  useEffect(() => {
    const syncJobs = async () => {
      try {
        const q = query(collection(db, 'jobs'), orderBy('postedAt', 'desc'), limit(12));
        const snapshot = await getDocs(q);
        const fbJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        // Deduplicate by Title + Company
        const uniqueJobs = Array.from(new Map(fbJobs.map(item => [`${item.title.toLowerCase()}|${item.company.toLowerCase()}`, item])).values());
        setJobs(uniqueJobs);
        safeSetItem('sc_jobs_cache', uniqueJobs.slice(0, 5));
        setIsJobsLoading(false);
      } catch (err) {
        console.warn('Jobs Fetch Error:', err);
        setIsJobsLoading(false);
      }
    };

    const timer = setTimeout(syncJobs, 2500);
    return () => clearTimeout(timer);
  }, []);

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
        import('firebase/firestore').then(({ setDoc, doc }) => {
          setDoc(doc(db, 'settings', 'global_analytics'), defaultAnalytics);
        });
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
          const { setDoc: setDocDyn } = await import('firebase/firestore');
          await setDocDyn(ref, {
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
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'site_settings'), newSettings, { merge: true });
    } catch (e) {
      console.error("Failed to update settings in Firestore:", e);
    }
  }, []);

  // Algolia Sync Helper
  const syncAlgolia = useCallback(async (action: 'sync_single' | 'delete_single', data: any) => {
    try {
      await fetch('/api/sync-algolia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
    } catch (e) {
      console.error('Algolia sync failed:', e);
    }
  }, []);

  const recordGlobalStat = useCallback(async (field: keyof SiteStats, val: number = 1) => {
    try {
      const ref = doc(db, 'settings', 'site_stats');
      const snap = await getDoc(ref);
      let currentVal = 0;
      if (snap.exists()) {
        currentVal = (snap.data() as any)[field] || 0;
      }
      
      // Prevent negative stats
      const newVal = Math.max(0, currentVal + val);
      const { setDoc } = await import('firebase/firestore');
      await setDoc(ref, { [field]: newVal }, { merge: true });
    } catch (e) {
      console.error('Failed to update global stat:', e);
    }
  }, []);

  // Recalculate all stats from scratch (Emergency Repair)
  const repairStats = useCallback(async () => {
    const { collection, getDocs, doc, setDoc } = await import('firebase/firestore');
    try {
      const productSnap = await getDocs(collection(db, 'products'));
      const blogSnap = await getDocs(collection(db, 'blogPosts'));
      const jobSnap = await getDocs(collection(db, 'jobs'));
      
      const products = productSnap.docs.map(d => d.data());
      
      const newStats: SiteStats = {
        totalProducts: products.length,
        totalPublishedProducts: products.filter(p => p.published).length,
        totalBlogs: blogSnap.size,
        totalJobs: jobSnap.size,
        totalClicks: siteStats.totalClicks, // Keep these as they are lifetime
        totalViews: siteStats.totalViews
      };
      
      await setDoc(doc(db, 'settings', 'site_stats'), newStats);
      setSiteStats(newStats);
      return true;
    } catch (e) {
      console.error('Repair stats failed:', e);
      return false;
    }
  }, [siteStats]);


  // Product operations
  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'clicks' | 'views' | 'createdAt'>): Promise<string> => {
    const { doc, setDoc } = await import('firebase/firestore');
    const newProduct: Product = {
      ...product,
      id: generateId('sc'),
      clicks: 0,
      views: 0,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'products', newProduct.id), newProduct);
    
    // Update Global Aggregates
    recordGlobalStat('totalProducts', 1);
    if (newProduct.published) recordGlobalStat('totalPublishedProducts', 1);
    
    syncAlgolia('sync_single', { product: newProduct });
    return newProduct.id;
  }, [syncAlgolia, recordGlobalStat]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const { doc, setDoc, getDoc } = await import('firebase/firestore');
    // For scalability, we update directly in Firestore even if not in local context
    await setDoc(doc(db, 'products', id), updates, { merge: true });
    
    // If it was in local context, we could update it, but mostly we use separate fetchers now
    // Still, let's try to sync Algolia
    const snap = await getDoc(doc(db, 'products', id));
    if (snap.exists()) {
      syncAlgolia('sync_single', { product: { id, ...snap.data() } });
    }
  }, [syncAlgolia]);

  const deleteProduct = useCallback(async (id: string) => {
    const { doc, getDoc, deleteDoc } = await import('firebase/firestore');
    // We need to check if it was published before deleting to update stats
    try {
      const snap = await getDoc(doc(db, 'products', id));
      if (snap.exists()) {
        const data = snap.data() as Product;
        recordGlobalStat('totalProducts', -1);
        if (data.published) recordGlobalStat('totalPublishedProducts', -1);
      }
      await deleteDoc(doc(db, 'products', id));
      syncAlgolia('delete_single', { productId: id });
    } catch (e) {
      console.error('Delete product failed:', e);
    }
  }, [syncAlgolia, recordGlobalStat]);

  const duplicateProduct = useCallback(async (id: string) => {
    const { doc, setDoc } = await import('firebase/firestore');
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
      await setDoc(doc(db, 'products', duplicated.id), duplicated);
      syncAlgolia('sync_single', { product: duplicated });
    }
  }, [products, syncAlgolia]);

  const getProductById = useCallback(async (productId: string): Promise<Product | undefined> => {
    // Check local state first (sync context)
    const local = products.find(p => p.id === productId);
    if (local) return local;

    // Fallback: Fetch from Firestore directly
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'products', productId));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Product;
      }
    } catch (err) {
      console.warn('Product Fetch Error (Direct):', err);
    }
    return undefined;
  }, [products]);

  // Platform detection helper
  const getPlatformFromUrl = useCallback((url: string) => {
    return detectEcommercePlatform(url);
  }, []);

  // Analytics operations
  const recordClick = useCallback(async (productId: string) => {
    if (productId) {
      const { doc, setDoc, increment, getDoc } = await import('firebase/firestore');
      try {
        const productRef = doc(db, 'products', productId);
        await setDoc(productRef, { clicks: increment(1) }, { merge: true });

        // Update global analytics clicks (Last 30 days)
        const globalRef = doc(db, 'settings', 'global_analytics');
        const snap = await getDoc(globalRef);
        let clicks = [...defaultAnalytics.dailyClicks];
        let currentData = defaultAnalytics;
        if (snap.exists()) {
          currentData = snap.data() as Analytics;
          clicks = [...(currentData.dailyClicks || defaultAnalytics.dailyClicks)];
        }
        clicks[clicks.length - 1] = (clicks[clicks.length - 1] || 0) + 1;
        await setDoc(globalRef, { ...currentData, dailyClicks: clicks }, { merge: true });

        // Update site-wide lifetime clicks
        recordGlobalStat('totalClicks', 1);
      } catch (e) {
        console.error("Failed to record click", e);
      }
    }
  }, [recordGlobalStat]);

  const recordView = useCallback(async (productId: string) => {
    if (productId) {
      // Track session view to avoid counting multiple times per session
      const viewedProducts = safeGetItem('sc_viewed_products', []);
      if (!viewedProducts.includes(productId)) {
        viewedProducts.push(productId);
        safeSetItem('sc_viewed_products', viewedProducts);

        const { doc, setDoc, increment } = await import('firebase/firestore');
        try {
          const productRef = doc(db, 'products', productId);
          await setDoc(productRef, { views: increment(1) }, { merge: true });
          
          // Update site-wide lifetime views
          recordGlobalStat('totalViews', 1);
        } catch (e) {
          console.error("Failed to record view", e);
        }
      }
    }
  }, [recordGlobalStat]);

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

  // ---- ADMIN SCALABILITY FUNCTIONS ----
  const fetchAdminProducts = useCallback(async (
    pageSize: number, 
    lastVisible: any = null, 
    searchTerm: string = '', 
    statusFilter: string = 'all'
  ) => {
    try {
      let q;
      const constraints: any[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
      
      if (statusFilter === 'published') {
        constraints.push(where('published', '==', true));
      }
      
      if (lastVisible && !searchTerm) {
        constraints.push(startAfter(lastVisible));
      }

      // If search term is provided, we might need a different approach 
      // but for now let's use the basic one with an improvement
      if (searchTerm) {
        // We use a broader query and filter client-side for better search experience 
        // since Firestore prefix search is very limited
        const searchQ = query(
          collection(db, 'products'),
          limit(100) // Fetch more to filter
        );
        const snap = await getDocs(searchQ);
        const term = searchTerm.toLowerCase();
        const filtered = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => 
            p.title?.toLowerCase().includes(term) || 
            p.brand?.toLowerCase().includes(term) || 
            p.category?.toLowerCase().includes(term)
          );
        
        return {
          products: filtered.slice(0, pageSize),
          lastVisible: null,
          totalCount: filtered.length
        };
      }

      q = query(collection(db, 'products'), ...constraints);
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Product));
      const lastDoc = snap.docs[snap.docs.length - 1];

      return {
        products: docs,
        lastVisible: lastDoc,
        totalCount: siteStats.totalProducts
      };
    } catch (e) {
      console.error('Admin fetch products failed:', e);
      return { products: [], lastVisible: null, totalCount: 0 };
    }
  }, [siteStats.totalProducts]);

  const fetchAdminBlogs = useCallback(async (
    pageSize: number, 
    lastVisible: any = null, 
    searchTerm: string = '', 
    statusFilter: string = 'all'
  ) => {
    try {
      
      
      let q;
      if (searchTerm) {
        q = query(
          collection(db, 'blogPosts'),
          where('title', '>=', searchTerm),
          where('title', '<=', searchTerm + '\uf8ff'),
          limit(pageSize)
        );
      } else {
        const constraints: any[] = [orderBy('updatedAt', 'desc'), limit(pageSize)];
        if (statusFilter !== 'all') constraints.unshift(where('status', '==', statusFilter));
        if (lastVisible) constraints.push(startAfter(lastVisible));
        
        q = query(collection(db, 'blogPosts'), ...(constraints as any));
      }

      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as BlogPost));
      const lastDoc = snap.docs[snap.docs.length - 1];

      return {
        blogs: docs,
        lastVisible: lastDoc,
        totalCount: siteStats.totalBlogs || blogPosts.length
      };
    } catch (e) {
      console.error('Admin fetch blogs failed:', e);
      return { blogs: [], lastVisible: null, totalCount: 0 };
    }
  }, [siteStats.totalBlogs, blogPosts.length]);

  const fetchAdminJobs = useCallback(async (
    pageSize: number, 
    lastVisible: any = null, 
    searchTerm: string = '', 
    statusFilter: string = 'all'
  ) => {
    try {
      
      
      let q;
      if (searchTerm) {
        q = query(
          collection(db, 'jobs'),
          where('title', '>=', searchTerm),
          where('title', '<=', searchTerm + '\uf8ff'),
          limit(pageSize)
        );
      } else {
        const constraints: any[] = [orderBy('postedAt', 'desc'), limit(pageSize)];
        if (statusFilter !== 'all') constraints.unshift(where('status', '==', statusFilter));
        if (lastVisible) constraints.push(startAfter(lastVisible));
        
        q = query(collection(db, 'jobs'), ...(constraints as any));
      }

      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Job));
      const lastDoc = snap.docs[snap.docs.length - 1];

      return {
        jobs: docs,
        lastVisible: lastDoc,
        totalCount: siteStats.totalJobs || jobs.length
      };
    } catch (e) {
      console.error('Admin fetch jobs failed:', e);
      return { jobs: [], lastVisible: null, totalCount: 0 };
    }
  }, [siteStats.totalJobs, jobs.length]);

  // Utility
  const getProductUrl = useCallback((productId: string): string => {
    return generateProductUrl(settings.siteUrl, productId);
  }, [settings.siteUrl]);

  // ---- BLOG MANAGEMENT ----
  const addBlog = useCallback(async (blog: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const { doc, setDoc } = await import('firebase/firestore');
    const now = new Date().toISOString();
    const newBlog: BlogPost = {
      ...blog,
      id: generateId('blog'),
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'blogPosts', newBlog.id), newBlog);
    recordGlobalStat('totalBlogs', 1);
    return newBlog.id;
  }, [recordGlobalStat]);

  const updateBlog = useCallback(async (id: string, updates: Partial<BlogPost>): Promise<void> => {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'blogPosts', id), { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  }, []);

  const deleteBlog = useCallback(async (id: string): Promise<void> => {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'blogPosts', id));
    recordGlobalStat('totalBlogs', -1);
  }, [recordGlobalStat]);

  const getBlogBySlug = useCallback(async (slug: string): Promise<BlogPost | undefined> => {
    // Check local cache first
    const local = blogPosts.find(b => b.slug === slug);
    if (local) return local;

    // Fallback: Direct Firestore query by slug
    try {
      const { query, collection, where, limit, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, 'blogPosts'), where('slug', '==', slug), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as BlogPost;
      }
    } catch (err) {
      console.warn('Blog Fetch Error (Direct):', err);
    }
    return undefined;
  }, [blogPosts]);


  // ---- JOB MANAGEMENT ----
  const addJob = useCallback(async (job: Omit<Job, 'id' | 'postedAt' | 'views'>): Promise<string> => {
    const { doc, setDoc } = await import('firebase/firestore');
    const newJob: Job = {
      ...job,
      id: generateId('job'),
      postedAt: new Date().toISOString(),
      views: 0,
      applies: 0
    };
    await setDoc(doc(db, 'jobs', newJob.id), newJob);
    recordGlobalStat('totalJobs', 1);
    return newJob.id;
  }, [recordGlobalStat]);

  const updateJob = useCallback(async (id: string, updates: Partial<Job>): Promise<void> => {
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'jobs', id), updates, { merge: true });
  }, []);

  const deleteJob = useCallback(async (id: string): Promise<void> => {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'jobs', id));
    recordGlobalStat('totalJobs', -1);
  }, [recordGlobalStat]);

  const getJobById = useCallback(async (jobId: string): Promise<Job | undefined> => {
    // Check local state first
    const local = jobs.find(j => j.id === jobId);
    if (local) return local;

    // Fetch from Firebase directly for fast individual page loads
    const { doc, getDoc } = await import('firebase/firestore');
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
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'jobs', jobId));
      if (!snap.exists()) return false;
      const job = { id: snap.id, ...snap.data() } as Job;

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
  }, [settings, updateJob]);

  const broadcastProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'products', productId));
      if (!snap.exists()) return false;
      const product = { id: snap.id, ...snap.data() } as Product;

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
  }, [updateProduct, settings]);

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

  const recordJobApply = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'jobs', jobId), { applies: increment(1) }, { merge: true });
    }
  }, [jobs]);

  const recordJobView = useCallback(async (jobId: string) => {
    if (jobId) {
      // Track session view to avoid counting multiple times per session
      const viewedJobs = safeGetItem('sc_viewed_jobs', []);
      if (!viewedJobs.includes(jobId)) {
        viewedJobs.push(jobId);
        safeSetItem('sc_viewed_jobs', viewedJobs);

        try {
          const { setDoc, doc } = await import('firebase/firestore');
          const jobRef = doc(db, 'jobs', jobId);
          await setDoc(jobRef, { views: increment(1) }, { merge: true });
        } catch (e) {
          console.error("Failed to record job view", e);
        }
      }
    }
  }, []);

  const requestInstantIndexing = useCallback(async (url: string): Promise<boolean> => {
    try {
      console.log('⚡ Triggering instant indexing for:', url);
      const response = await fetch('https://smartchoose-proxy.vercel.app/api/cron/auto-index.js', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-trigger': 'true' 
        },
        body: JSON.stringify({ url }),
      });
      return response.ok;
    } catch (error) {
      console.error('Instant indexing trigger error:', error);
      return false;
    }
  }, []);

  // ---- INBOX MANAGEMENT ----
  const addInquiry = useCallback(async (inquiry: Omit<Inquiry, 'id' | 'status' | 'createdAt'>) => {
    const id = generateId('msg');
    const newInquiry: Inquiry = {
      ...inquiry,
      id,
      status: 'new',
      createdAt: new Date().toISOString()
    };
    const { setDoc, doc } = await import('firebase/firestore');
    await setDoc(doc(db, 'inquiries', id), newInquiry);
  }, []);

  const fetchInquiries = useCallback(async () => {
    const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Inquiry));
  }, []);

  const updateInquiryStatus = useCallback(async (id: string, status: Inquiry['status']) => {
    const { setDoc, doc } = await import('firebase/firestore');
    await setDoc(doc(db, 'inquiries', id), { status }, { merge: true });
  }, []);

  const deleteInquiry = useCallback(async (id: string) => {
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'inquiries', id));
  }, []);

  const value = useMemo(() => ({
    settings,
    products,
    socialLinks,
    analytics,
    siteStats,
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
    repairStats,
    fetchAdminProducts,
    fetchAdminBlogs,
    fetchAdminJobs,

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

    addInquiry,
    fetchInquiries,
    updateInquiryStatus,
    deleteInquiry,
    requestInstantIndexing,
  }), [settings, products, socialLinks, analytics, siteStats, isInitialLoading, updateSettings, addProduct, updateProduct, deleteProduct, duplicateProduct, recordClick, recordView, addSocialLink, updateSocialLink, deleteSocialLink, getProductUrl, getProductById, getPlatformFromUrl, fetchAdminProducts, fetchAdminBlogs, fetchAdminJobs, blogPosts, addBlog, updateBlog, deleteBlog, getBlogBySlug, jobs, isJobsLoading, addJob, updateJob, deleteJob, broadcastJob, recordJobApply, recordJobView, broadcastProduct, broadcastBlog, addInquiry, fetchInquiries, updateInquiryStatus, deleteInquiry, requestInstantIndexing]);

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

