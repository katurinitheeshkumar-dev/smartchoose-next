/**
 * SERVER-ONLY DATA FETCHERS
 * Uses Firebase REST API for reliable server-side fetching (avoids QUIC/WebSocket SSR issues).
 */

import type { Product, BlogPost, Settings, SiteStats } from '@/types';

const PROJECT_ID = 'smartchoose-official';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Convert a Firestore REST document value to a JavaScript value.
 */
function parseValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue?.values || []).map(parseValue);
  if ('mapValue' in val) return parseDoc(val.mapValue?.fields || {});
  return null;
}

function parseDoc(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = parseValue(value);
  }
  return result;
}

async function firestoreQuery(collectionPath: string, filters: any[], orderFields: string[] = [], limitCount = 10): Promise<any[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const structuredQuery: any = {
      from: [{ collectionId: collectionPath }],
      limit: limitCount,
    };

    if (filters.length > 0) {
      structuredQuery.where = filters.length === 1 ? filters[0] : {
        compositeFilter: {
          op: 'AND',
          filters: filters,
        },
      };
    }

    if (orderFields.length > 0) {
      structuredQuery.orderBy = orderFields.map(f => ({
        field: { fieldPath: f.startsWith('-') ? f.slice(1) : f },
        direction: f.startsWith('-') ? 'DESCENDING' : 'ASCENDING',
      }));
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) throw new Error(`Firestore query failed: ${res.status}`);
    
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    
    return data
      .filter((item: any) => item.document)
      .map((item: any) => {
        const name: string = item.document.name;
        const id = name.split('/').pop();
        return { id, ...parseDoc(item.document.fields || {}) };
      });
  } catch (e) {
    console.error(`Firestore REST query error for ${collectionPath}:`, e);
    return [];
  }
}

async function firestoreGet(docPath: string): Promise<any | null> {
  try {
    const url = `${FIRESTORE_BASE}/${docPath}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return parseDoc(data.fields || {});
  } catch (e) {
    return null;
  }
}

function makeFilter(field: string, op: string, value: any, valueType = 'stringValue'): any {
  return {
    fieldFilter: {
      field: { fieldPath: field },
      op,
      value: { [valueType]: value },
    },
  };
}

export async function getSettings(): Promise<Settings> {
  const data = await firestoreGet('settings/site_settings');
  return (data || {}) as Settings;
}

export async function getHeroProducts(): Promise<Product[]> {
  // Fetch a larger pool of published products to filter in-memory (avoids composite index errors)
  const products = await firestoreQuery(
    'products',
    [makeFilter('published', 'EQUAL', true, 'booleanValue')],
    [], 
    50
  ) as Product[];

  if (products.length === 0) return [];

  const selected: Product[] = [];
  const selectedIds = new Set<string>();

  const addProduct = (p: Product | undefined, badge: string, icon: string) => {
    if (p && !selectedIds.has(p.id)) {
      selected.push({ ...p, sliderBadge: badge, sliderIcon: icon } as any);
      selectedIds.add(p.id);
    }
  };

  // 1. Newly uploaded product (sort by createdAt descending)
  const newest = [...products].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  })[0];
  addProduct(newest, 'New Arrival', 'sparkles');

  // 2. Trending product (highest views)
  const trending = [...products].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  addProduct(trending, 'Most Viewed', 'eye');

  // 3. Most clicked product
  const mostClicked = [...products].sort((a, b) => (b.clicks || 0) - (a.clicks || 0))[0];
  addProduct(mostClicked, 'Hot Deal', 'flame');

  // 4. One product from each main category
  const categories = [
    'Smartphones & Accessories', 
    'Laptops & Computers', 
    'Home Appliances', 
    'Electronics',
    'Fashion', 
    'Home & Kitchen'
  ];

  for (const cat of categories) {
    const catProd = products.find(p => p.category === cat && !selectedIds.has(p.id));
    if (catProd) addProduct(catProd, 'Top Choice', 'star');
  }

  // Fill the rest with other random products if we have less than 6
  let i = 0;
  while (selected.length < 6 && i < products.length) {
    addProduct(products[i], 'Featured', 'award');
    i++;
  }

  return selected;
}

export async function getFeaturedProducts(count: number = 12): Promise<Product[]> {
  // Fetch a larger pool to sort in-memory (avoids composite index requirements)
  const products = await firestoreQuery(
    'products',
    [makeFilter('published', 'EQUAL', true, 'booleanValue')],
    [], 
    50
  ) as Product[];

  // Sort by newest first
  products.sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da; // Descending order (newest first)
  });

  return products.slice(0, count);
}

export async function getLatestBlogs(count: number = 4): Promise<BlogPost[]> {
  const blogs = await firestoreQuery(
    'blogPosts',
    [makeFilter('status', 'EQUAL', 'published')],
    [], // No orderBy — avoids composite index requirement
    count
  );
  return blogs as BlogPost[];
}

export async function getSiteStats(): Promise<SiteStats> {
  const data = await firestoreGet('settings/site_stats');
  return (data || {}) as SiteStats;
}

export async function getProductById(id: string): Promise<Product | null> {
  const data = await firestoreGet(`products/${id}`);
  return data ? ({ id, ...data } as Product) : null;
}

export async function getJobById(id: string): Promise<any | null> {
  const data = await firestoreGet(`jobs/${id}`);
  return data ? ({ id, ...data }) : null;
}

export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  const blogs = await firestoreQuery(
    'blogPosts',
    [
      makeFilter('slug', 'EQUAL', slug),
      makeFilter('status', 'EQUAL', 'published'),
    ],
    [],
    1
  );
  return blogs.length > 0 ? (blogs[0] as BlogPost) : null;
}
