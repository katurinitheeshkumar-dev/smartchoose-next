import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/custom/Icon';

export function JobNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-indigo-500/5 border-b border-slate-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Brand — Jobs Portal Identity */}
          <Link
            to="/jobs"
            className="flex items-center gap-3 select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Icon name="briefcase" size={20} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-slate-900 tracking-tight">SmartChoose</p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest -mt-0.5">Jobs Portal</p>
            </div>
          </Link>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/jobs"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
            >
              <Icon name="layout-grid" size={15} />
              All Jobs
            </Link>
            <Link
              to="/blog"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
            >
              <Icon name="file-text" size={15} />
              Blog
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Mobile Back */}
            <button
              onClick={() => router.push(-1)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              <Icon name="arrow-left" size={16} />
            </button>

            {/* Telegram CTA */}
            <a
              href="https://t.me/smartchoosejobs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
            >
              <Icon name="send" size={15} />
              Get Alerts
            </a>

            {/* Bookmark / mobile alerts */}
            <a
              href="https://t.me/smartchoosejobs"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
              title="Get Job Alerts on Telegram"
            >
              <Icon name="bell" size={18} />
            </a>
          </div>

        </div>
      </div>
    </header>
  );
}

export default JobNavbar;
