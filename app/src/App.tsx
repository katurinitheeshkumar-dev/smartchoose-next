import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { DatabaseProvider, useDatabase } from '@/contexts/DatabaseContext';
import AdminProvider, { useAdmin } from '@/contexts/AdminContext';
import { Header } from '@/sections/Header';
const SocialSidebar = lazy(() => import('@/components/ui/custom/SocialSidebar'));
const JobNavbar = lazy(() => import('@/sections/JobNavbar'));
const HeroSection = lazy(() => import('@/sections/HeroSection').then(m => ({ default: m.HeroSection })));
const ProductsSection = lazy(() => import('@/sections/ProductsSection').then(m => ({ default: m.ProductsSection })));
import { Icon } from '@/components/ui/custom/Icon';
import './App.css';

const AboutSection = lazy(() => import('@/sections/AboutSection').then(m => ({ default: m.AboutSection })));
const Footer = lazy(() => import('@/sections/Footer').then(m => ({ default: m.Footer })));
const BlogGuidance = lazy(() => import('@/sections/BlogGuidance'));
const ProductDetail = lazy(() => import('@/sections/ProductDetail').then(m => ({ default: m.ProductDetail })));
const BlogSection = lazy(() => import('@/sections/BlogSection').then(m => ({ default: m.BlogSection })));

// Better Lazy Loading with robust export handling
const AdminLogin = lazy(() => import('@/components/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const BlogListingPage = lazy(() => import('@/sections/BlogListingPage').then(m => ({ default: m.BlogListingPage })));
const BlogPostPage = lazy(() => import('@/sections/BlogPostPage'));
const DynamicSitemap = lazy(() => import('@/sections/DynamicSitemap').then(m => ({ default: m.DynamicSitemap })));
const LegalPage = lazy(() => import('@/sections/LegalPage'));
const ContactPage = lazy(() => import('@/sections/ContactPage'));
const JobsPage = lazy(() => import('@/sections/JobsPage'));
const JobDetailPage = lazy(() => import('@/sections/JobDetailPage'));
const NotFoundPage = lazy(() => import('@/sections/NotFoundPage'));

// Error Boundary Component to prevent white screen of death
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Critical Runtime Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 pt-32">
          <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-rose-50 mx-auto mb-6 flex items-center justify-center text-rose-500">
              <Icon name="alert-triangle" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Oops! Something went wrong</h2>
            <p className="text-slate-500 mb-8">We encountered an unexpected error while loading this page. Please try refreshing or go back to home.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => window.location.reload()} className="btn-primary w-full py-4 rounded-2xl text-white font-bold shadow-lg shadow-emerald-500/30">
                Refresh Page
              </button>
              <button onClick={() => window.location.href = '/'} className="w-full py-3 text-slate-500 font-medium hover:text-emerald-600 transition-colors">
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Admin Portal Activation Component
function AdminActivation() {
  useEffect(() => {
    localStorage.setItem('sc_admin_unlocked', 'true');
    window.location.href = '/admin'; // Hard reload to initialize RealAdminProvider
  }, []);
  return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>;
}

// Home View
interface HomeViewProps {
  searchQuery: string;
  highlightedProduct: string | null;
  onProductClick: (id: string) => void;
}

function HomeView({ searchQuery, highlightedProduct, onProductClick }: HomeViewProps) {
  return (
    <main>
      <Suspense fallback={null}>
        <HeroSection />
        <div id="products-section">
          <ProductsSection
            searchQuery={searchQuery}
            highlightedProduct={highlightedProduct}
            onProductClick={onProductClick}
          />
        </div>
      </Suspense>
      <Suspense fallback={null}>
        <AboutSection />
        <BlogSection />
        <Footer />
      </Suspense>
    </main>
  );
}

import { Helmet } from 'react-helmet-async';

// About View
function AboutView() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  return (
    <main className="pt-20">
      <Helmet>
        <title>About Us | SmartChoose - Premium Product Discovery</title>
        <meta name="description" content="Learn more about SmartChoose, our mission to simplify product discovery, and how we help you make smart shopping choices." />
        <link rel="canonical" href="https://smartchoose.in/about" />
      </Helmet>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
        <AboutSection />
        <Footer />
      </Suspense>
    </main>
  );
}

// Admin Route Guard Component
function AdminRouteWrapper({ onBack }: { onBack: () => void }) {
  const { isAdmin, setShowLogin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 pt-20">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 mx-auto mb-6 flex items-center justify-center text-slate-300">
            <Icon name="lock" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-8">This area is reserved for administrators only.</p>
          <button
            onClick={() => setShowLogin(true)}
            className="btn-primary w-full py-4 rounded-2xl text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="log-in" size={20} />
            Login as Admin
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard onBack={onBack} />;
}

// Product Route Logic
function ProductRouteWrapper({ onBack }: { onBack: () => void }) {
  const { id } = useParams();
  if (!id) return <Navigate to="/" />;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
      <ProductDetail productId={id} onBack={onBack} />
    </Suspense>
  );
}

// Main App Layout
function Layout() {
  const { settings } = useDatabase();
  const { showLogin } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedProduct, setHighlightedProduct] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = useCallback((view: string) => {
    if (view === 'home') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (view === 'about') {
      navigate('/about');
    } else if (view === 'admin') {
      navigate('/admin');
    } else if (view === 'blog') {
      navigate('/blog');
    } else if (view === 'sitemap') {
      navigate('/sitemap');
    } else if (view === 'jobs') {
      navigate('/jobs');
    } else if (view === 'privacy') {
      navigate('/privacy');
    } else if (view === 'terms') {
      navigate('/terms');
    } else if (view === 'disclosure') {
      navigate('/disclosure');
    } else if (view === 'contact') {
      navigate('/contact');
    } else if (view === 'returns') {
      navigate('/returns');
    }
  }, [navigate]);

  const handleSearchSelect = useCallback((productId: string) => {
    setHighlightedProduct(productId);
    handleNavigate('home');
    setTimeout(() => {
      const element = document.getElementById('products-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    setTimeout(() => {
      setHighlightedProduct(null);
    }, 3000);
  }, [handleNavigate]);

  const handleProductClick = useCallback((productId: string) => {
    navigate(`/product/${productId}`);
  }, [navigate]);

  const isAdminPath = location.pathname.startsWith('/admin');
  const isJobPath = location.pathname.startsWith('/jobs');

  // Dynamic Favicon Update (Runs after initial render to avoid blocking)
  useEffect(() => {
    // 1. Remove Skeleton UI immediately after hydration
    const skeleton = document.getElementById('skeleton-ui');
    if (skeleton) {
      skeleton.classList.add('fade-out');
      setTimeout(() => skeleton.remove(), 400);
    }

    // 2. Favicon logic
    if (settings?.logo && !isAdminPath) {
      const timer = setTimeout(() => {
        const icon = document.querySelector('link[rel="icon"]');
        const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        
        if (icon) {
          const svgString = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="squircle">
                <rect width="512" height="512" rx="120" ry="120" />
              </clipPath>
            </defs>
            <image href="${settings.logo}" width="512" height="512" preserveAspectRatio="xMidYMid slice" clip-path="url(#squircle)" />
          </svg>`;
          const svgDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
          icon.setAttribute('href', svgDataUrl);
        }
        if (appleIcon) appleIcon.setAttribute('href', settings.logo);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [settings?.logo, isAdminPath]);


  return (
    <div className="min-h-screen bg-slate-50">
      {!isAdminPath && !isJobPath && <SocialSidebar />}
      {!isAdminPath && !isJobPath && (
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNavigate={handleNavigate}
          onSearchSelect={handleSearchSelect}
        />
      )}
      {isJobPath && (
        <Suspense fallback={null}>
          <JobNavbar />
        </Suspense>
      )}

      {/* Admin Modals - Only loaded when requested to save visitors 90KB+ of JS */}
      <Suspense fallback={null}>
        {showLogin && <AdminLogin />}
      </Suspense>

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomeView searchQuery={searchQuery} highlightedProduct={highlightedProduct} onProductClick={handleProductClick} />} />
          <Route path="/activate-admin" element={<AdminActivation />} />
          <Route path="/about" element={<AboutView />} />
          <Route path="/product/:id" element={<ProductRouteWrapper onBack={() => navigate(-1)} />} />
          <Route path="/blog" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><BlogListingPage /></Suspense>} />
          <Route path="/admin/*" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}>
              <AdminRouteWrapper onBack={() => navigate('/')} />
            </Suspense>
          } />
          <Route path="/returns" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><LegalPage /></Suspense>} />
          
          {/* Jobs Portal */}
          <Route path="/jobs" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><JobsPage /></Suspense>} />
          <Route path="/jobs/:id" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><JobDetailPage /></Suspense>} />
          
          {/* /:slug MUST be last — catches blog post routes */}
          <Route path="/:slug" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><BlogPostPage /></Suspense>} />
          <Route path="/sitemap" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><DynamicSitemap /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><LegalPage /></Suspense>} />
          <Route path="/terms" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><LegalPage /></Suspense>} />
          <Route path="/disclosure" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><LegalPage /></Suspense>} />
          <Route path="/contact" element={<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="spinner" /></div>}><ContactPage /></Suspense>} />
          <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

// Root Entry Point
export default function App() {
  return (
    <Suspense fallback={null}>
      <AdminProvider>
        <DatabaseProvider>
          <LazyMotion features={domAnimation} strict>
            <BrowserRouter>
              <Layout />
            </BrowserRouter>
          </LazyMotion>
        </DatabaseProvider>
      </AdminProvider>
    </Suspense>
  );
}
