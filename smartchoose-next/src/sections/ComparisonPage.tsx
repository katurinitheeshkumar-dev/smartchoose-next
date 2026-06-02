"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Footer } from '@/sections/Footer';
import { QuickAnswerBlock } from '@/sections/QuickAnswerBlock';
import { FaqSection } from '@/sections/FaqSection';
import { SmartChooseVerdict } from '@/sections/SmartChooseVerdict';
import { UpgradedProductCard } from '@/sections/UpgradedProductCard';
import type { ComparisonPage } from '@/lib/db';

// ── Comparison Table ──────────────────────────────────────────────────────────
function ComparisonTable({
  rows,
  productA,
  productB,
  winner,
}: {
  rows: { feature: string; productA: string; productB: string }[];
  productA: string;
  productB: string;
  winner: string;
}) {
  if (!rows || rows.length === 0) return null;
  const aWins = productA.toLowerCase().includes(winner.toLowerCase().split(' ')[0]);

  return (
    <div className="not-prose my-10 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="px-4 py-4 text-left font-black text-xs uppercase tracking-widest w-1/3">Feature</th>
            <th className={`px-4 py-4 text-center font-black text-xs uppercase tracking-widest w-1/3 ${aWins ? 'text-emerald-400' : 'text-white'}`}>
              {aWins && '🏆 '}{productA}
            </th>
            <th className={`px-4 py-4 text-center font-black text-xs uppercase tracking-widest w-1/3 ${!aWins ? 'text-emerald-400' : 'text-white'}`}>
              {!aWins && '🏆 '}{productB}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-4 py-3 font-bold text-slate-600 text-xs uppercase tracking-wide">{row.feature}</td>
              <td className={`px-4 py-3 text-center font-semibold ${aWins ? 'text-emerald-700' : 'text-slate-700'}`}>{row.productA}</td>
              <td className={`px-4 py-3 text-center font-semibold ${!aWins ? 'text-emerald-700' : 'text-slate-700'}`}>{row.productB}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Winner Banner ─────────────────────────────────────────────────────────────
function WinnerBanner({ winner, reason }: { winner: string; reason: string }) {
  return (
    <div className="not-prose my-8 rounded-2xl overflow-hidden shadow-md">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 flex items-center gap-3">
        <span className="text-3xl">🏆</span>
        <div>
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest">SmartChoose Winner</p>
          <h2 className="text-white text-xl font-black">{winner}</h2>
        </div>
        <span className="ml-auto shrink-0 px-4 py-2 bg-white/20 text-white text-xs font-black rounded-xl border border-white/20">
          Editor's Choice
        </span>
      </div>
      {reason && (
        <div className="bg-emerald-50 border-t border-emerald-100 px-6 py-4">
          <p className="text-emerald-800 text-sm font-medium leading-relaxed">{reason}</p>
        </div>
      )}
    </div>
  );
}

// ── DB Source Badge ───────────────────────────────────────────────────────────
function SourceBadge({ fromDatabase }: { fromDatabase: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
      fromDatabase ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${fromDatabase ? 'bg-emerald-500' : 'bg-blue-500'}`} />
      {fromDatabase ? '✓ Verified DB Data' : '🤖 AI Research'}
    </div>
  );
}

// ── Main Comparison Page ──────────────────────────────────────────────────────
export function ComparisonPageView({ page }: { page: ComparisonPage }) {
  const [scrollProgress] = useState(0);
  const updatedDate = new Date(page.updatedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-slate-100">
        <div className="h-full bg-emerald-500 transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
      </div>

      <main className="pb-16 pt-24">
        {/* Header */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-8 pt-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-6">
            <Link href="/" className="hover:underline">Home</Link>
            <span className="text-slate-300">›</span>
            <Link href="/compare" className="hover:underline">Compare</Link>
            <span className="text-slate-300">›</span>
            <span className="text-slate-400 truncate">{page.productA} vs {page.productB}</span>
          </nav>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-6">
            {page.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <SourceBadge fromDatabase={page.fromDatabase} />
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Updated: {updatedDate}</span>
            {page.rating && (
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                ★ {page.rating}/5 SmartChoose Rating
              </span>
            )}
          </div>
        </div>

        {/* Featured image / VS card */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-10">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-center gap-6 shadow-2xl">
            <div className="text-center">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Challenger</p>
              <p className="text-white text-2xl font-black">{page.productA}</p>
            </div>
            <div className="shrink-0 w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/30">
              VS
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Competitor</p>
              <p className="text-white text-2xl font-black">{page.productB}</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Quick Answer */}
          {page.quickAnswer && (
            <QuickAnswerBlock
              answer={page.quickAnswer}
              winner={page.winner}
              rating={page.rating}
              lastReviewed={page.updatedAt}
            />
          )}

          {/* Winner Banner */}
          {page.winner && (
            <WinnerBanner winner={page.winner} reason={page.winnerReason} />
          )}

          {/* Comparison Table */}
          {page.comparisonTable && page.comparisonTable.length > 0 && (
            <div className="my-10">
              <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-1.5 h-7 bg-emerald-500 rounded-full" />
                Full Spec Comparison
              </h2>
              <ComparisonTable
                rows={page.comparisonTable}
                productA={page.productA}
                productB={page.productB}
                winner={page.winner}
              />
            </div>
          )}

          {/* Main Content */}
          {page.content && (
            <div className="prose-magazine max-w-none my-10">
              <div className="editorial-content" dangerouslySetInnerHTML={{ __html: page.content }} />
            </div>
          )}

          {/* Product Cards */}
          {page.products && page.products.length > 0 && (
            <div className="my-12">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <span className="w-1.5 h-7 bg-emerald-500 rounded-full" />
                Buy the Best Option
              </h2>
              <div className="space-y-6">
                {page.products.map((product, idx) => (
                  <UpgradedProductCard key={product.id || idx} block={product} rank={idx + 1} />
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {page.faq && page.faq.length > 0 && (
            <FaqSection faqs={page.faq} title="Frequently Asked Questions" />
          )}

          {/* Verdict */}
          {page.verdict && (
            <SmartChooseVerdict
              verdict={page.verdict}
              winner={page.winner}
              rating={page.rating}
              bestFor="Editor's Choice"
            />
          )}

          {/* Affiliate disclaimer */}
          <p className="mt-16 pt-8 border-t border-slate-100 text-[11px] text-slate-400 italic leading-relaxed">
            <strong>Editorial Transparency:</strong> SmartChoose researches and recommends products independently.
            We may earn a commission from affiliate links at no extra cost to you.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ComparisonPageView;
