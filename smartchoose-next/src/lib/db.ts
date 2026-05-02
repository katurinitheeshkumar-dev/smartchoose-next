import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Product, BlogPost, Settings, SiteStats } from '@/types';

/**
 * SERVER-ONLY DATA FETCHERS
 * These functions run on the server to provide initial data for LCP and SEO.
 */

export async function getSettings(): Promise<Settings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'site_settings'));
    return snap.exists() ? (snap.data() as Settings) : {} as Settings;
  } catch (e) {
    console.error('getSettings error:', e);
    return {} as Settings;
  }
}

export async function getHeroProducts(): Promise<Product[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  } catch (e) {
    console.error('getHeroProducts error:', e);
    // Fallback without orderBy if index is missing
    const q = query(collection(db, 'products'), where('published', '==', true), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  }
}

export async function getFeaturedProducts(count: number = 12): Promise<Product[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  } catch (e) {
    const q = query(collection(db, 'products'), where('published', '==', true), limit(count));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  }
}

export async function getLatestBlogs(count: number = 4): Promise<BlogPost[]> {
  try {
    const q = query(
      collection(db, 'blogPosts'),
      where('status', '==', 'published'),
      orderBy('updatedAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BlogPost));
  } catch (e) {
    return [];
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'site_stats'));
    return snap.exists() ? (snap.data() as SiteStats) : {} as SiteStats;
  } catch (e) {
    return {} as SiteStats;
  }
}
