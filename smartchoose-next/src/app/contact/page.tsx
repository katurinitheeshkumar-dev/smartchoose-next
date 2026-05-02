"use client";
import { useState } from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Header } from '@/sections/Header';
import { Footer } from '@/sections/Footer';

import { useSearch } from '@/contexts/SearchContext';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export default function ContactPage() {
  const { addInquiry, settings } = useDatabase();
  const { searchQuery, setSearchQuery, setHighlightedProduct } = useSearch();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleNavigate = useCallback((view: string) => {
    if (view === 'home') {
      router.push('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push(`/${view}`);
    }
  }, [router]);

  const handleSearchSelect = useCallback((productId: string) => {
    setHighlightedProduct(productId);
    router.push('/');
  }, [router, setHighlightedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addInquiry(formData);
      setSubmitted(true);
    } catch (err) {
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Header 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNavigate={handleNavigate}
        onSearchSelect={handleSearchSelect}
      />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-emerald-600 to-green-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-emerald-50 text-sm font-medium mb-6 border border-white/10"
          >
            <Icon name="message-square" size={16} />
            Contact Us
          </m.div>
          <m.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
          >
            How can we <span className="text-emerald-300">help you?</span>
          </m.h1>
          <m.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-emerald-50 text-lg md:text-xl max-w-2xl mx-auto opacity-80"
          >
            Have a question about a product, partnership inquiry, or just want to say hi? We'd love to hear from you.
          </m.p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 -mt-20 relative z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-6">
              <m.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100"
              >
                <div className="space-y-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <Icon name="mail" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">Email Support</h3>
                      <p className="text-slate-500 text-sm">{settings.contactEmail || settings.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <Icon name="phone" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">Call Us</h3>
                      <p className="text-slate-500 text-sm">{settings.contactPhone || settings.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                      <Icon name="map-pin" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 mb-1">Office</h3>
                      <p className="text-slate-500 text-sm">{settings.contactAddress || settings.address}</p>
                    </div>
                  </div>
                </div>
              </m.div>

              <m.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/20"
              >
                <h3 className="text-xl font-bold mb-4">Community Hub</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Join our community on Telegram and WhatsApp to get instant updates on the best deals and tech news.
                </p>
                <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                  <Icon name="send" size={20} />
                  Join Telegram
                </button>
              </m.div>
            </div>

            {/* Message Form */}
            <m.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2"
            >
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[600px] flex flex-col">
                {submitted ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 animate-bounce">
                      <Icon name="check-circle" size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Message Sent!</h2>
                    <p className="text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
                      Thank you for reaching out. Our team will review your inquiry and get back to you within 24-48 hours.
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Your Name</label>
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                        <input
                          required
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-900"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Subject</label>
                      <select
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-900 appearance-none"
                      >
                        <option>General Inquiry</option>
                        <option>Product Question</option>
                        <option>Partnership/Collaboration</option>
                        <option>Report an Error</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Message</label>
                      <textarea
                        required
                        rows={6}
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-slate-700 resize-none"
                        placeholder="Tell us what you need help with..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="send" />}
                      {isSubmitting ? 'Sending Message...' : 'Send Message Now'}
                    </button>
                    
                    <p className="text-center text-xs text-slate-400 font-medium italic">
                      We typically respond to all inquiries within 24 hours.
                    </p>
                  </form>
                )}
              </div>
            </m.div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
