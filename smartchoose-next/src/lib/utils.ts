import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple hash function for passwords (not cryptographically secure but better than plain text)
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate product URL
export function generateProductUrl(siteUrl: string, productId: string): string {
  return `${siteUrl}/product/${productId}`;
}

// Parse price string to number
export function parsePrice(priceStr: any): number {
  if (priceStr === null || priceStr === undefined) return 0;
  if (typeof priceStr === 'number') return priceStr;
  const str = String(priceStr);
  const num = parseInt(str.replace(/[^0-9]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Format number as price
export function formatPrice(num: number): string {
  return '₹' + num.toLocaleString('en-IN');
}

// Calculate discount percentage
export function calculateDiscount(originalPrice: string, currentPrice: string): string {
  const original = parsePrice(originalPrice);
  const current = parsePrice(currentPrice);
  if (original === 0 || current === 0) return '0%';
  const discount = Math.round(((original - current) / original) * 100);
  return `${discount}% off`;
}

// E-commerce Platform Detection
export interface PlatformInfo {
  name: string;
  icon: string;
  iconFile?: string;
  color: string;
  className: string;
}

export function getPlatformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'amazon': return 'ShoppingBag';
    case 'flipkart': return 'ShoppingBag';
    case 'myntra': return 'Shirt';
    case 'meesho': return 'Users';
    case 'ajio': return 'Shirt';
    case 'nykaa': return 'Heart';
    case 'croma': return 'Cpu';
    case 'reliance digital': return 'Monitor';
    case 'tata cliq': return 'Briefcase';
    case 'snapdeal': return 'Package';
    case 'jiomart': return 'ShoppingBag';
    default: return 'ShoppingCart';
  }
}

export function getPlatformByName(name: any): PlatformInfo {
  const safeName = String(name || 'Store').trim();
  const normName = safeName.toLowerCase();
  const found = Object.values(platformConfigs).find(
    p => p.name.toLowerCase() === normName
  );
  return found || {
    name: name || 'Store',
    icon: 'ShoppingCart',
    iconFile: 'generic.svg',
    color: '#0f172a',
    className: 'platform-generic'
  };
}

const platformConfigs: Record<string, PlatformInfo> = {
  'amazon.in,amazon.com,amzn.in,amzn.to': {
    name: 'Amazon',
    icon: 'ShoppingBag',
    iconFile: 'amazon.svg',
    color: '#FF9900',
    className: 'platform-amazon'
  },
  'flipkart.com,fkrt.it': {
    name: 'Flipkart',
    icon: 'ShoppingCart',
    iconFile: 'flipkart.svg',
    color: '#2874F0',
    className: 'platform-flipkart'
  },
  'myntra.com': {
    name: 'Myntra',
    icon: 'Shirt',
    iconFile: 'myntra.svg',
    color: '#FF3F6C',
    className: 'platform-myntra'
  },
  'nykaa.com,nykaafashion.com': {
    name: 'Nykaa',
    icon: 'Sparkles',
    iconFile: 'nykaa.svg',
    color: '#FC2779',
    className: 'platform-nykaa'
  },
  'croma.com': {
    name: 'Croma',
    icon: 'Tv',
    iconFile: 'croma.svg',
    color: '#00A8E8',
    className: 'platform-croma'
  },
  'reliancedigital.in': {
    name: 'Reliance Digital',
    icon: 'Smartphone',
    iconFile: 'reliancedigital.svg',
    color: '#D32F2F',
    className: 'platform-reliance'
  },
  'tatacliq.com': {
    name: 'Tata CLiQ',
    icon: 'Briefcase',
    iconFile: 'tatacliq.svg',
    color: '#6A1B9A',
    className: 'platform-tatacliq'
  },
  'snapdeal.com': {
    name: 'Snapdeal',
    icon: 'Package',
    color: '#E40046',
    className: 'platform-snapdeal'
  },
  'shopclues.com': {
    name: 'ShopClues',
    icon: 'Store',
    color: '#24A0B8',
    className: 'platform-shopclues'
  },
  'ajio.com': {
    name: 'AJIO',
    icon: 'Shirt',
    iconFile: 'ajio.svg',
    color: '#2C3E50',
    className: 'platform-ajio'
  },
  'meesho.com': {
    name: 'Meesho',
    icon: 'Users',
    iconFile: 'meesho.svg',
    color: '#F43397',
    className: 'platform-meesho'
  },
  'jiomart.com': {
    name: 'JioMart',
    icon: 'ShoppingBag',
    color: '#0F3CC9',
    className: 'platform-jiomart'
  },
  'jabong.com': {
    name: 'Jabong',
    icon: 'Shirt',
    color: '#E91E63',
    className: 'platform-generic'
  },
  'pepperfry.com': {
    name: 'Pepperfry',
    icon: 'Sofa',
    color: '#FF6F00',
    className: 'platform-generic'
  },
  'urbanladder.com': {
    name: 'Urban Ladder',
    icon: 'Home',
    color: '#8D6E63',
    className: 'platform-generic'
  },
  'lenskart.com': {
    name: 'Lenskart',
    icon: 'Glasses',
    color: '#00BCD4',
    className: 'platform-generic'
  },
  'pharmeasy.in': {
    name: 'PharmEasy',
    icon: 'Pill',
    color: '#00BFA5',
    className: 'platform-generic'
  },
  '1mg.com': {
    name: '1mg',
    icon: 'HeartPulse',
    color: '#FF6B6B',
    className: 'platform-generic'
  },
  'bigbasket.com': {
    name: 'BigBasket',
    icon: 'ShoppingBasket',
    color: '#4CAF50',
    className: 'platform-generic'
  },
  'grofers.com': {
    name: 'Blinkit',
    icon: 'Zap',
    color: '#FFEB3B',
    className: 'platform-generic'
  },
  'swiggy.com': {
    name: 'Swiggy',
    icon: 'UtensilsCrossed',
    color: '#FF5722',
    className: 'platform-generic'
  },
  'zomato.com': {
    name: 'Zomato',
    icon: 'Utensils',
    color: '#E23744',
    className: 'platform-generic'
  },

  'maxfashion.in': {
    name: 'Max Fashion',
    icon: 'Shirt',
    color: '#E91E63',
    className: 'platform-generic'
  },
  'shoppersstop.com': {
    name: 'Shoppers Stop',
    icon: 'ShoppingBag',
    color: '#000000',
    className: 'platform-generic'
  },
  'lifestylestores.com': {
    name: 'Lifestyle',
    icon: 'ShoppingBag',
    color: '#E91E63',
    className: 'platform-generic'
  },
  'decathlon.in': {
    name: 'Decathlon',
    icon: 'Dumbbell',
    color: '#0082C3',
    className: 'platform-generic'
  },
  'firstcry.com': {
    name: 'FirstCry',
    icon: 'Baby',
    color: '#FF6B9D',
    className: 'platform-generic'
  },
  'shopsy.in,shopsy': {
    name: 'Shopsy',
    icon: 'ShoppingBag',
    iconFile: 'shopsy.svg',
    color: '#10B981',
    className: 'platform-shopsy'
  },
  'hopscotch.in': {
    name: 'Hopscotch',
    icon: 'Baby',
    color: '#FF4081',
    className: 'platform-generic'
  }
};

export function detectEcommercePlatform(url: any): PlatformInfo {
  try {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL');
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace('www.', '').toLowerCase();

    // Exact or partial domain matching
    for (const [key, value] of Object.entries(platformConfigs)) {
      // Split comma separated keys for multiple domains (e.g. 'amazon.in,amazon.com,amzn.in,amzn.to')
      const domains = key.split(',');
      for (const d of domains) {
        if (domain === d || domain.endsWith('.' + d)) {
          return value;
        }
      }
    }
  } catch (e) {
    // Invalid URL
  }

  return {
    name: 'Store',
    icon: 'Store',
    iconFile: 'generic.svg',
    color: '#6B7280',
    className: 'platform-generic'
  };
}

// Social Platform Detection (for social links)
export function detectPlatform(url: string): { name: string; icon: string; color: string } | null {
  const platforms: Record<string, { name: string; icon: string; color: string }> = {
    'instagram.com': { name: 'Instagram', icon: 'Instagram', color: '#E4405F' },
    'facebook.com': { name: 'Facebook', icon: 'Facebook', color: '#1877F2' },
    'youtube.com': { name: 'YouTube', icon: 'Youtube', color: '#FF0000' },
    'twitter.com': { name: 'Twitter', icon: 'Twitter', color: '#1DA1F2' },
    'x.com': { name: 'X', icon: 'Twitter', color: '#000000' },
    'linkedin.com': { name: 'LinkedIn', icon: 'Linkedin', color: '#0A66C2' },
    'tiktok.com': { name: 'TikTok', icon: 'Music', color: '#000000' },
    'telegram.org': { name: 'Telegram', icon: 'Send', color: '#26A5E4' },
    'whatsapp.com': { name: 'WhatsApp', icon: 'MessageCircle', color: '#25D366' },
    'pinterest.com': { name: 'Pinterest', icon: 'Image', color: '#BD081C' },
    'reddit.com': { name: 'Reddit', icon: 'MessageSquare', color: '#FF4500' },
    'github.com': { name: 'GitHub', icon: 'Github', color: '#181717' },
  };

  try {
    const domain = new URL(url).hostname.replace('www.', '');
    for (const [key, value] of Object.entries(platforms)) {
      if (domain.includes(key)) return value;
    }
  } catch (e) {
    return null;
  }

  return { name: 'Website', icon: 'Globe', color: '#6B7280' };
}

// File to base64 conversion
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Generate unique ID
export function generateId(prefix: string = 'sc'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Safe localStorage operations (SSR-safe: guards against server-side rendering)
export function safeGetItem(key: string, defaultValue: any = null): any {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

export function safeSetItem(key: string, value: any): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e: any) {
    // Handle QuotaExceededError by clearing non-vital caches
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        console.warn('LocalStorage Quota Exceeded. Purging all non-vital sc_ caches...');
        // Clear EVERYTHING prefixed with sc_ to ensure a fresh recovery
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('sc_')) localStorage.removeItem(k);
        });
        // Try again after purge
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryErr) {
        console.warn('Purge failed to free enough space.', retryErr);
      }
    } else {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`Error removing ${key} from localStorage:`, e);
    return false;
  }
}

// Debounce function
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Format short title for Admin panel
export function formatShortTitle(title: string): string {
  if (!title) return '';
  const words = title.split(' ');
  return words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
}


// Transform low-res thumbnail URLs to high-resolution versions (Amazon/Flipkart)
export function getHighResImage(url: string, platform?: string): string {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('transparent') || url.includes('base64')) return url;

  try {
    const p = platform ? platform.toLowerCase() : '';
    const u = url.toLowerCase();

    // Amazon patterns
    if (p === 'amazon' || u.includes('amazon') || u.includes('ssl-images-amazon')) {
      // 71rNSvzQGlL._AC_UY218_.jpg -> 71rNSvzQGlL.jpg
      return url.replace(/\._[A-Z0-9,_]+_\./i, '.');
    }

    // Flipkart patterns
    if (p === 'flipkart' || u.includes('flipkart') || u.includes('rukmini')) {
      // /image/100/100/ -> /image/800/800/
      return url.replace(/\/image\/\d+\/\d+\//i, '/image/800/800/');
    }
  } catch (e) {
    console.warn("Error cleaning image URL", e);
  }
  return url;
}

// Clean affiliate links (especially Amazon) to prevent home page redirects
export function cleanAffiliateLink(url: string): string {
  if (!url || typeof url !== 'string') return url;
  
  try {
    const u = url.toLowerCase();
    
    // Amazon cleanup
    if (u.includes('amazon') || u.includes('amzn.in') || u.includes('amzn.to')) {
      // 1. If it's already an amzn.to short link, DON'T clean it
      if (u.includes('amzn.to')) return url;

      // 2. If it's a home page link, try to keep it as is
      if (u === 'https://www.amazon.in' || u === 'https://amazon.in' || u === 'https://www.amazon.in/') {
        return url;
      }
      
      // 3. Strip tracking parameters and add user's default Tag
      // Match /dp/ASIN or /gp/product/ASIN
      const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      const defaultTag = 'smartthingste-21';
      
      if (asinMatch) {
         return `https://www.amazon.in/dp/${asinMatch[1].toUpperCase()}?tag=${defaultTag}`;
      }
      
      // 4. Fallback: split by ? and /ref=, then add tag
      const baseUrl = url.split('?')[0].split('/ref=')[0];
      return `${baseUrl}?tag=${defaultTag}`;
    }
  } catch (e) {
    console.warn("Error cleaning affiliate link", e);
  }
  
  return url;
}

// Ensure URL is absolute
export function ensureAbsoluteUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return 'https://' + url;
}
