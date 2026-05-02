"use client";

import { Suspense, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LazyMotion, domAnimation } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { DatabaseProvider, useDatabase } from '@/contexts/DatabaseContext';
import AdminProvider, { useAdmin } from '@/contexts/AdminContext';
import { SearchProvider, useSearch } from '@/contexts/SearchContext';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';
import dynamic from 'next/dynamic';
const SocialSidebar = dynamic(() => import('@/components/ui/custom/SocialSidebar'), { ssr: false });
const JobNavbar = dynamic(() => import('@/sections/JobNavbar'), { ssr: false });
const AdminLogin = dynamic(() => import('@/components/admin/AdminLogin'), { ssr: false });

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { settings } = useDatabase();
  const { showLogin } = useAdmin();
  const { searchQuery, setSearchQuery, setHighlightedProduct } = useSearch();
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = useCallback((view: string) => {
    if (view === 'home') {
      router.push('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(`/${view}`);
    }
  }, [router]);

  const handleSearchSelect = useCallback((productId: string, type: 'product' | 'blog' = 'product') => {
    if (type === 'product') {
      setHighlightedProduct(productId);
      router.push('/');
      setTimeout(() => {
        const element = document.getElementById('products-section');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      setTimeout(() => {
        setHighlightedProduct(null);
      }, 3000);
    } else {
      router.push(`/${productId}`);
    }
  }, [router, setHighlightedProduct]);

  const isAdminPath = pathname?.startsWith('/admin');
  const isJobPath = pathname?.startsWith('/jobs');

  // Dynamic Favicon Update
  useEffect(() => {
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
    <>
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

      <Suspense fallback={null}>
        {showLogin && <AdminLogin />}
      </Suspense>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {!isAdminPath && (
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      )}
    </>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <DatabaseProvider>
        <SearchProvider>
          <HelmetProvider>
          <LazyMotion features={domAnimation} strict>
            <LayoutContent>
              {children}
            </LayoutContent>
          </LazyMotion>
        </HelmetProvider>
        </SearchProvider>
      </DatabaseProvider>
    </AdminProvider>
  );
}

