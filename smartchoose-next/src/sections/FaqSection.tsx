"use client";
import { useState } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  faqs: FaqItem[];
  title?: string;
}

export function FaqSection({ faqs, title = "Frequently Asked Questions" }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="faq-section not-prose mt-14 mb-8">
      <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
        <span className="w-1.5 h-7 bg-emerald-500 rounded-full" />
        {title}
      </h2>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-all hover:border-emerald-200"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={openIndex === i}
            >
              <span className="font-bold text-slate-900 text-sm leading-snug flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {faq.q}
              </span>
              <svg
                className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180 text-emerald-500' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openIndex === i && (
              <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4 ml-0">
                <div className="pl-9">{faq.a}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// FAQPage JSON-LD Schema generator
export function generateFaqSchema(faqs: FaqItem[]) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };
}

export default FaqSection;
