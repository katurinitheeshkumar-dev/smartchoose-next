import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/sections/Footer';

export const metadata: Metadata = {
  title: 'Product Comparisons | SmartChoose',
  description: 'In-depth product comparisons for Indian buyers. SmartChoose vs. guides with specs, prices, and winner picks.',
  alternates: { canonical: 'https://www.smartchoose.in/compare' },
};

const POPULAR_COMPARISONS = [
  { slug: 'iphone-vs-samsung-galaxy', label: 'iPhone vs Samsung Galaxy' },
  { slug: 'oneplus-vs-realme', label: 'OnePlus vs Realme' },
  { slug: 'agaro-mt1122-vs-mi-trimmer-2c', label: 'AGARO MT1122 vs Mi Trimmer 2C' },
  { slug: 'noise-colorfit-vs-boAt-wave', label: 'Noise ColorFit vs boAt Wave' },
  { slug: 'jbl-tune-vs-sony-wh', label: 'JBL Tune vs Sony WH-1000XM' },
  { slug: 'rtx-4060-vs-rtx-4070', label: 'RTX 4060 vs RTX 4070' },
];

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="pt-28 pb-20 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-12">
          <p className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-3">SmartChoose</p>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 leading-tight mb-4">
            Product Comparisons
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            Detailed, expert-led comparisons for Indian buyers. Real specs, real prices, and a clear winner for every match-up.
          </p>
        </div>

        {/* How it works */}
        <div className="grid sm:grid-cols-3 gap-5 mb-14">
          {[
            { icon: '🔍', title: 'DB-First', desc: 'Real data from SmartChoose product database when available.' },
            { icon: '🤖', title: 'AI Research', desc: 'GROQ AI generates detailed comparisons for unlisted products.' },
            { icon: '💾', title: 'Cached Forever', desc: 'Generated once, served instantly on every future visit.' },
          ].map((item) => (
            <div key={item.title} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <span className="text-2xl mb-2 block">{item.icon}</span>
              <p className="font-black text-slate-900 mb-1">{item.title}</p>
              <p className="text-slate-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Popular Comparisons */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-1.5 h-7 bg-emerald-500 rounded-full" />
            Popular Comparisons
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {POPULAR_COMPARISONS.map((item) => (
              <Link
                key={item.slug}
                href={`/compare/${item.slug}`}
                className="group flex items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-sm shrink-0">
                    VS
                  </span>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    {item.label}
                  </span>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* Custom Comparison */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white">
          <h2 className="text-2xl font-black mb-2">Want a Custom Comparison?</h2>
          <p className="text-slate-400 mb-6 text-sm">
            Navigate to any comparison directly:
          </p>
          <div className="bg-white/10 rounded-xl px-5 py-4 font-mono text-emerald-300 text-sm border border-white/10">
            smartchoose.in/compare/<span className="text-white font-bold">product-a</span>-vs-<span className="text-white font-bold">product-b</span>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Example: /compare/oneplus-12-vs-samsung-galaxy-s25
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
