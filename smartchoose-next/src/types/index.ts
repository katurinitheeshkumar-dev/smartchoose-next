// Product Types
export interface Product {
  id: string;
  title: string;
  fullTitle?: string;
  description: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  images: string[];
  category: string;
  affiliateLink: string; // Kept for backward compatibility
  affiliateLinks?: { platform: string; url: string; icon: string; price?: string }[];
  platformPrimary?: string;
  rating: number;
  reviews: number;
  published: boolean;
  clicks: number;
  views: number;
  createdAt: string;
  brand?: string;
  specifications?: Record<string, string>;
  features?: string[];
  pros?: string[];
  cons?: string[];
  faq?: { q: string; a: string }[];
  seoTitle?: string;
  seoDescription?: string;
  trending?: boolean;
  bestseller?: boolean;
  broadcasted?: boolean;
  platform?: string;
  lastPriceSync?: { seconds: number; nanoseconds: number } | any;
}

// Platform Types
export interface Platform {
  id: string;
  platformId: string;
  name: string;
  price: string;
  url: string;
  logo?: string;
  color?: string;
  clicks?: number;
  commission?: string;
}

// Social Link Types
export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
}

// Settings Types - REMOVED admin credentials (now in secure AdminContext)
export interface Settings {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  phone: string;
  email: string;
  address: string;
  aboutContent: string;
  footerLogo: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  footerContent: string;
  siteUrl: string;
  autopilotEnabled?: boolean;
  lastAutoPost?: string;
  lastAutoPostLog?: { date: string; window: string };
  telegramBotToken?: string;
  telegramChannelId?: string;
  whatsappWebhookUrl?: string;
  instagramWebhookUrl?: string;
  productTelegramBotToken?: string;
  productTelegramChannelId?: string;
  productWhatsappWebhookUrl?: string;
  productInstagramWebhookUrl?: string;
}

// Analytics Types
export interface Analytics {
  dailyVisitors: number[];
  dailyClicks: number[];
  trafficSources: {
    direct: number;
    social: number;
    search: number;
  };
}

// Admin Context Types
export interface AdminContextType {
  isAdmin: boolean;
  showLogin: boolean;
  showChangePassword: boolean;
  loginError: string | null;
  setShowLogin: (show: boolean) => void;
  setShowChangePassword: (show: boolean) => void;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
  clearLoginError: () => void;
}

// Aggregated Stats for High-Performance Dashboards
export interface SiteStats {
  totalProducts: number;
  totalPublishedProducts: number;
  totalClicks: number;
  totalViews: number;
  totalBlogs: number;
  totalJobs: number;
}

// Database Context Types
export interface DatabaseContextType {
  isInitialLoading: boolean;
  isProductsLoading: boolean;
  settings: Settings;
  products: Product[];
  socialLinks: SocialLink[];
  analytics: Analytics;
  siteStats: SiteStats; // Global aggregated stats
  updateSettings: (newSettings: Partial<Settings>) => void;
  addProduct: (product: Omit<Product, 'id' | 'clicks' | 'views' | 'createdAt'>) => string;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  recordClick: (productId: string) => void;
  recordView: (productId: string) => void;
  addSocialLink: (link: Omit<SocialLink, 'id'>) => void;
  updateSocialLink: (id: string, updates: Partial<SocialLink>) => void;
  deleteSocialLink: (id: string) => void;
  getProductUrl: (productId: string) => string;
  getProductById: (productId: string) => Product | undefined;
  getPlatformFromUrl: (url: string) => { name: string; icon: string; color: string; className: string };
  // Admin Scalability Functions
  fetchAdminProducts: (pageSize: number, lastVisible?: any, searchTerm?: string, statusFilter?: string) => Promise<{ products: Product[], lastVisible: any, totalCount: number }>;
  fetchAdminBlogs: (pageSize: number, lastVisible?: any, searchTerm?: string, statusFilter?: string) => Promise<{ blogs: BlogPost[], lastVisible: any, totalCount: number }>;
  fetchAdminJobs: (pageSize: number, lastVisible?: any, searchTerm?: string, statusFilter?: string) => Promise<{ jobs: Job[], lastVisible: any, totalCount: number }>;
  // Blog
  blogPosts: BlogPost[];
  addBlog: (blog: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateBlog: (id: string, updates: Partial<BlogPost>) => Promise<void>;
  deleteBlog: (id: string) => Promise<void>;
  getBlogBySlug: (slug: string) => BlogPost | undefined;
  // Jobs
  jobs: Job[];
  isJobsLoading: boolean;
  addJob: (job: Omit<Job, 'id' | 'postedAt' | 'views'>) => Promise<string>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  broadcastJob: (jobId: string) => Promise<boolean>;
  getJobById: (id: string) => Promise<Job | undefined>;
  recordJobApply: (jobId: string) => void;
  recordJobView: (jobId: string) => void;
  broadcastProduct: (productId: string) => Promise<boolean>;
  broadcastBlog: (blogId: string) => Promise<boolean>;
}

// Blog Types
export interface BlogProductBlock {
  id: string;
  name: string;
  image: string;
  price: string;
  description: string;
  pros: string[];
  affiliateLink: string;
  smartChooseId?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  type: 'value' | 'product';
  featuredImage: string;
  intro: string;
  products: BlogProductBlock[];
  template: 'standard' | 'guide' | 'minimal';
  content?: string;
  seoTitle: string;
  seoDescription: string;
  metaDescription?: string;
  tags?: string[];
  featuredProductId?: string;
  status: 'draft' | 'published';
  views?: number;
  createdAt: string;
  updatedAt: string;
  broadcasted?: boolean;
}

// Job Types
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Remote';
  category: string;
  description: string;
  applyLink: string;
  salary?: string;
  postedAt: string;
  expiresAt?: string;
  status: 'draft' | 'active' | 'expired';
  views?: number;
  applies?: number;
  broadcasted?: boolean;
}

// View Types
export type ViewType = 'home' | 'about' | 'admin' | 'product';

// Toast Types
export interface ToastState {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
}
