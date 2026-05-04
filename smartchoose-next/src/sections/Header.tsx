import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useAdmin } from '@/contexts/AdminContext';
import Image from 'next/image';

const SearchDropdown = lazy(() => import('./SearchDropdown'));

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNavigate: (view: string) => void;
  onSearchSelect: (id: string, type: 'product' | 'blog') => void;
}

export function Header({ searchQuery, setSearchQuery, onNavigate, onSearchSelect }: HeaderProps) {
  const { settings, blogPosts } = useDatabase();
  const { isAdmin, setShowLogin } = useAdmin();
  const [localSearchProducts, setLocalSearchProducts] = useState<any[]>([]);
  const [isSearchFetched, setIsSearchFetched] = useState(false);
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const lastClickTimeRef = useRef(0);
  const clickCountRef = useRef(0);
  const TAP_TIMEOUT = 300;

  const isBlogView = pathname.startsWith('/blog');
  const isJobView = pathname.startsWith('/jobs');

  // Debounce logic for the dropdown only
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Sync inputValue if external searchQuery changes (e.g. cleared from outside)
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const searchRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
    fetchSearchProducts();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setSearchQuery(inputValue);
      setShowDropdown(false);
      // Optional: scroll to products if on home
      if (pathname === '/') {
        const el = document.getElementById('products-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const fetchSearchProducts = async () => {
    // Relying on Algolia in SearchDropdown instead of client-side Firestore to avoid QUIC timeouts
  };

  const handleSelect = (id: string, type: 'product' | 'blog' = 'product') => {
    setShowDropdown(false);
    setInputValue('');
    setSearchQuery('');
    onSearchSelect(id, type);
  };

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current > TAP_TIMEOUT) {
      clickCountRef.current = 0;
    }
    onNavigate('home');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass shadow-lg' : 'bg-transparent'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <m.div
            ref={logoRef}
            className="flex items-center cursor-pointer flex-shrink-0 select-none"
            whileHover={{ scale: 1.02 }}
            onClick={handleLogoClick}
          >
            <a 
              href="/"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white flex items-center justify-center shadow-md border border-slate-100 overflow-hidden shrink-0 relative"
              onClick={(e) => { e.preventDefault(); handleLogoClick(); }}
              aria-label="SmartChoose Home"
            >
              <Image 
                src={settings.logo && settings.logo !== '/logo.png' ? settings.logo : '/logo.png'} 
                alt={settings.siteName} 
                className="w-full h-full object-contain p-1" 
                width={56}
                height={56}
                priority={true}
              />
            </a>
          </m.div>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-4 relative" ref={searchRef}>
            <div className="relative">
              <Icon name="search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isBlogView ? "Search articles..." : isJobView ? "Search jobs..." : "Search products..."}
                value={inputValue}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="w-full pl-12 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all bg-white/80 backdrop-blur-sm"
              />
              {inputValue && (
                <button
                  onClick={() => { setInputValue(''); setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            <AnimatePresence>
              {showDropdown && debouncedQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden max-h-96 overflow-y-auto">
                  <Suspense fallback={<div className="p-4 text-center text-slate-400 text-sm">Loading...</div>}>
                    <SearchDropdown
                      query={debouncedQuery}
                      products={localSearchProducts}
                      blogPosts={blogPosts || []}
                      onSelect={handleSelect}
                      priorityView={isBlogView ? 'blog' : 'product'}
                    />
                  </Suspense>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-[100px] justify-end">
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); onNavigate('home'); }}
              className="hidden lg:block px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              Home
            </a>
            <a
              href="/blog"
              onClick={(e) => { e.preventDefault(); onNavigate('blog'); }}
              className="hidden lg:block px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              Blog
            </a>
            <a
              href="/jobs"
              onClick={(e) => { e.preventDefault(); onNavigate('jobs'); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center gap-2"
            >
              <Icon name="briefcase" size={16} className="text-emerald-500" />
              <span className="hidden sm:inline">Jobs</span>
            </a>

            {isAdmin && (
              <button
                onClick={() => onNavigate('admin')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Icon name="layout-dashboard" size={16} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

