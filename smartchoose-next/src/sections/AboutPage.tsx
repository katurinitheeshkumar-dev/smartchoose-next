"use client";

import { useEffect } from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import Link from 'next/link';

export default function AboutPage() {
  const { settings } = useDatabase();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const features = [
    {
      icon: 'shield-check',
      title: 'Verified Products',
      desc: 'Every product is manually verified for quality and authenticity before being listed on our platform.',
      color: 'emerald'
    },
    {
      icon: 'zap',
      title: 'Best Deals',
      desc: 'We find the lowest prices from trusted sellers across India so you never overpay.',
      color: 'green'
    },
    {
      icon: 'lock',
      title: 'Secure Shopping',
      desc: 'All product links lead to trusted and secure e-commerce stores like Amazon and Flipkart.',
      color: 'emerald'
    },
    {
      icon: 'heart',
      title: 'Curated with Care',
      desc: 'Only products we would personally buy and recommend make it to our platform.',
      color: 'green'
    }
  ];

  const stats = [
    { value: '100%', label: 'Free to Use', color: 'emerald' },
    { value: '5★', label: 'Rated Platform', color: 'green' },
    { value: '24h', label: 'Support Response', color: 'emerald' },
    { value: '10+', label: 'Store Partners', color: 'green' }
  ];

  return (
    <div className="min-h-screen bg-white pt-28 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Hero */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-4">
            About Us
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Your Trusted Product Discovery Platform
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed max-w-3xl mx-auto">
            {settings.aboutContent || "SmartChoose is India's premier product discovery platform. We curate the finest products from top e-commerce stores to help you make informed purchasing decisions. Compare prices, read reviews, and shop with confidence."}
          </p>
        </m.div>

        {/* Features + Stats Grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Features */}
          <m.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, idx) => (
                <m.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center flex-shrink-0`}>
                    <Icon name={feature.icon} size={24} className={`text-${feature.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </div>
                </m.div>
              ))}
            </div>
          </m.div>

          {/* Stats Card */}
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-3xl opacity-10 blur-2xl" />
            <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 p-8 rounded-3xl">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm text-center">
                    <div className={`text-4xl font-bold text-${stat.color}-600 mb-2`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        </div>

        {/* Contact Info */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 mb-16"
        >
          <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Icon name="phone" size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Phone</p>
              <p className="font-semibold text-slate-900">{settings.phone || '+91 9247942311'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
              <Icon name="mail" size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-semibold text-slate-900">{settings.email || 'smartchoose.app@gmail.com'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Icon name="map-pin" size={24} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Address</p>
              <p className="font-semibold text-slate-900">{settings.address || '10-19 Kotha Colony, Dharmavaram, Kovvur, East Godavari - 534340, Andhra Pradesh, India'}</p>
            </div>
          </div>
        </m.div>

        {/* CTA */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-12 border border-emerald-100"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Start Discovering Amazing Products</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Join thousands of smart shoppers who trust SmartChoose to find the best products at the best prices.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-emerald-200"
          >
            <Icon name="shopping-bag" size={20} />
            Explore Products
          </Link>
        </m.div>
      </div>
    </div>
  );
}
