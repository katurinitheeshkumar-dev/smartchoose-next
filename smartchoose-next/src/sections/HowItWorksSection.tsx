"use client";
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import Link from 'next/link';

const steps = [
  {
    step: '01',
    icon: 'search',
    title: 'We Research',
    desc: 'Our editorial team manually researches and evaluates hundreds of products across Electronics, Home Appliances, Fashion, and more — so you don\'t have to.',
    color: 'emerald',
  },
  {
    step: '02',
    icon: 'bar-chart-2',
    title: 'We Compare Prices',
    desc: 'We track prices across Amazon, Flipkart, and other trusted retailers in real-time to show you the best available deal at any moment.',
    color: 'blue',
  },
  {
    step: '03',
    icon: 'shield-check',
    title: 'We Curate & Verify',
    desc: 'Only products with genuine reviews, quality ratings, and value for money pass our editorial standards and get listed on SmartChoose.',
    color: 'purple',
  },
  {
    step: '04',
    icon: 'shopping-bag',
    title: 'You Shop with Confidence',
    desc: 'Click through to buy from verified retailers like Amazon. We show you exactly where to get the best price — you decide where to buy.',
    color: 'amber',
  },
];

const trustPoints = [
  { icon: 'users', label: '50,000+', sub: 'Smart Shoppers' },
  { icon: 'package', label: '500+', sub: 'Curated Products' },
  { icon: 'store', label: '10+', sub: 'Retail Partners' },
  { icon: 'star', label: '4.8★', sub: 'User Rating' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-4 border border-emerald-200">
            <Icon name="info" size={14} />
            How SmartChoose Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            India's Trusted Product Discovery Platform
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            SmartChoose is a <strong>free price comparison and product discovery service</strong>. We independently research and curate the best products — then show you where to buy them at the lowest price.
          </p>
        </m.div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((s, idx) => (
            <m.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-all group"
            >
              <div className="text-5xl font-black text-slate-100 absolute top-4 right-4 select-none group-hover:text-emerald-50 transition-colors">
                {s.step}
              </div>
              <div className={`w-12 h-12 rounded-xl bg-${s.color}-100 flex items-center justify-center mb-4`}>
                <Icon name={s.icon as any} size={24} className={`text-${s.color}-600`} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-lg">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
            </m.div>
          ))}
        </div>

        {/* Trust Stats */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-8 sm:p-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {trustPoints.map((t, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white mb-1">{t.label}</div>
                <div className="text-emerald-100 text-sm font-medium">{t.sub}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-white text-center sm:text-left">
              <h3 className="text-xl font-bold mb-1">About Our Business</h3>
              <p className="text-emerald-100 text-sm leading-relaxed max-w-xl">
                SmartChoose is operated by <strong>K. Nitheesh Kumar</strong>, based in Kovvur, East Godavari, Andhra Pradesh, India.
                We are a registered price comparison and product recommendation platform. 
                Contact: <a href="mailto:smartchoose.app@gmail.com" className="underline text-white hover:text-emerald-200">smartchoose.app@gmail.com</a> | +91 9247942311
              </p>
            </div>
            <Link
              href="/about"
              className="shrink-0 px-6 py-3 bg-white text-emerald-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-lg"
            >
              Learn More About Us →
            </Link>
          </div>
        </m.div>

        {/* Transparency Note */}
        <m.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3"
        >
          <Icon name="info" size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-500 text-sm leading-relaxed">
            <strong className="text-slate-700">Transparency:</strong> SmartChoose earns a small referral fee from retailers when you make a purchase through our links — at <strong>no extra cost to you</strong>. This helps us keep the platform free and unbiased. Our product selections are always based on merit, not commercial relationships. 
            <Link href="/disclosure" className="text-emerald-600 hover:underline ml-1">Read our Transparency Policy →</Link>
          </p>
        </m.div>

      </div>
    </section>
  );
}

export default HowItWorksSection;
