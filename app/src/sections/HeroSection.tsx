import { Icon } from '@/components/ui/custom/Icon';
import { m, AnimatePresence } from 'framer-motion';
import { useDatabase } from '@/contexts/DatabaseContext';
import React from 'react';

const categories = [
  { id: 'mobiles', name: 'Mobiles', icon: 'smartphone', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'laptops', name: 'Laptops', icon: 'laptop', color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'electronics', name: 'Tech', icon: 'cpu', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'fashion', name: 'Fashion', icon: 'shopping-bag', color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'home', name: 'Home', icon: 'home', color: 'text-amber-500', bg: 'bg-amber-50' },
];

export function HeroSection() {
  const { products = [], blogPosts = [] } = useDatabase();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  
  // Get a random, diverse mix of products for the slider on every page load
  const topProducts = React.useMemo(() => {
    return [...(products || [])]
      .filter(p => p && p.published)
      .sort(() => 0.5 - Math.random())
      .slice(0, 10);
  }, [products]);

  // Get special offer (product with highest discount percentage)
  const specialOfferProduct = [...(products || [])]
    .sort((a, b) => {
      const discountA = a.originalPrice > 0 ? ((a.originalPrice - a.price) / a.originalPrice) : 0;
      const discountB = b.originalPrice > 0 ? ((b.originalPrice - b.price) / b.originalPrice) : 0;
      return discountB - discountA;
    })[0];

  // Get latest blog post
  const latestBlog = [...(blogPosts || [])]
    .filter(b => b && b.published)
    .sort((a, b) => {
      // Use createdAt or a fallback date
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })[0];

  const latestProducts = (products || []).slice(0, 2);
  const publishedCount = (products || []).filter(p => p && p.published).length;

  // Auto-slide carousel - Hyper-speed for maximum engagement
  React.useEffect(() => {
    if (topProducts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % topProducts.length);
    }, 3000); // Reduced to 3 seconds for faster experience
    return () => clearInterval(timer);
  }, [topProducts.length]);

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % topProducts.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + topProducts.length) % topProducts.length);
  };

  const scrollToProducts = (category?: string) => {
    const element = document.getElementById('products-section');
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
      
      if (category) {
        const event = new CustomEvent('filter-category', { detail: category });
        window.dispatchEvent(event);
      }
    }
  };

  // Simple Image Handler - Prioritize DB image
  const getProductImage = (currentImg?: string | string[]) => {
    if (Array.isArray(currentImg) && currentImg.length > 0) return currentImg[0];
    if (typeof currentImg === 'string' && currentImg.length > 5) return currentImg;
    return `https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop`;
  };

  // Clean Price Handler to avoid double ₹
  const formatPrice = (priceStr: string | number) => {
    if (!priceStr) return '0';
    const clean = priceStr.toString().replace(/[₹\s,]/g, '');
    return new Intl.NumberFormat('en-IN').format(Number(clean));
  };

  return (
    <section className="relative pt-20 pb-8 sm:pt-32 sm:pb-20 overflow-hidden bg-slate-50 scroll-smooth">
      {/* Optimized Kinetic Background - Uses Native CSS for Zero JS Battery Drain on Mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-emerald-100 rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-blue-100 rounded-full blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left z-10 w-full">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <m.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 backdrop-blur-md text-emerald-700 text-[10px] sm:text-sm font-bold mb-4 sm:mb-6 shadow-sm border border-emerald-200/50"
              >
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Trusted by 50,000+ Smart Shoppers
              </m.div>
              
              <h1 className="text-[28px] sm:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.2] sm:leading-[1.1] mb-4 sm:mb-6 tracking-tight">
                <m.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >Smart Choice.</m.span> <br />
                <m.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500"
                >Better Living.</m.span>
              </h1>
              
              <m.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-base sm:text-xl text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0"
              >
                Discover the best deals and premium products across top stores. We compare, you save. Simple as that.
              </m.p>

              <div className="flex flex-col items-center lg:items-start gap-6 sm:gap-8 mb-8 sm:mb-12">
                <button
                  onClick={() => scrollToProducts()}
                  className="w-full sm:w-auto px-8 py-4 sm:px-10 sm:py-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-200 transition-all hover:scale-105 flex items-center justify-center gap-3"
                >
                  Start Exploring
                  <Icon name="shopping-cart" size={22} />
                </button>
                
                {/* Modern Community Hub - Optimized for Mobile Fit */}
                <div className="w-full sm:w-auto bg-white/50 backdrop-blur-xl border border-white/80 p-4 sm:p-5 rounded-3xl sm:rounded-[2.5rem] shadow-lg shadow-slate-200/40 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Community Hub</span>
                    <span className="text-[12px] font-bold text-slate-400">Join 50k+ savvy shoppers</span>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    {[
                      { id: 'wa', icon: 'whatsapp', color: 'bg-[#25D366]', link: 'https://whatsapp.com/channel/0029VajWCHy0VycMVZ9K0N1r' },
                      { id: 'tg', icon: 'send', color: 'bg-[#0088cc]', link: 'https://t.me/SmartChooseDeals' },
                      { id: 'ig', icon: 'instagram', color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]', link: 'https://instagram.com/smartchoose.in' }
                    ].map((social) => (
                      <a 
                        key={social.id} 
                        href={social.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${social.color} text-white shadow-lg flex items-center justify-center hover:scale-110 transition-all hover:-translate-y-1 active:scale-95`}
                      >
                        <Icon name={social.icon as any} size={20} />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </m.div>

            <m.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full mt-6 sm:mt-10"
            >
              {/* Premium Category Scroll - Perfect Fit */}
              <div className="flex overflow-x-auto pb-4 gap-3 sm:gap-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-5 sm:gap-4 scroll-smooth">
                {categories.map((cat, i) => (
                  <m.button
                    key={cat.id}
                    onClick={() => scrollToProducts(cat.id)}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 relative group p-3.5 sm:p-5 rounded-2xl sm:rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl transition-all overflow-hidden flex flex-col items-center gap-2 sm:gap-3 min-w-[90px] sm:min-w-0"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.bg.replace('bg-', 'from-').replace('-50', '-100/30')} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className={`relative z-10 w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                      <Icon name={cat.icon as any} size={24} className="sm:hidden" />
                      <Icon name={cat.icon as any} size={28} className="hidden sm:block" />
                    </div>
                    <span className="relative z-10 text-[10px] sm:text-[14px] font-black text-slate-800 group-hover:text-emerald-600 transition-colors">{cat.name}</span>
                  </m.button>
                ))}
              </div>
            </m.div>
          </div>

          {/* Right Visual - Bento Carousel Optimized */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none relative z-10">
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-12 grid-rows-12 gap-3 sm:gap-4 h-[420px] sm:h-[600px]"
            >
              {/* Dynamic Product Carousel Block - Larger */}
              <div className="col-span-12 row-span-8 sm:row-span-9 bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden group relative">
                <AnimatePresence mode="popLayout" initial={false}>
                  {topProducts.length > 0 ? (
                    <m.div
                      key={currentSlide}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ 
                        duration: 0.4,
                        ease: [0.23, 1, 0.32, 1]
                      }}
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => window.open(`/product/${topProducts[currentSlide].id}`, '_self')}
                    >
                      {/* Premium Clean Product View - Maximum Image Focus */}
                      <div className="absolute inset-0 p-1 sm:p-2 flex items-center justify-center bg-white pb-24 sm:pb-28">
                        <m.img 
                          src={getProductImage(topProducts[currentSlide].images)} 
                          className="max-w-[150%] max-h-[150%] object-contain transition-transform duration-1000 group-hover:scale-105" 
                          alt={topProducts[currentSlide].title}
                        />
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/5 to-transparent z-20" />
                      
                      {/* Nav Buttons */}
                      <div className="absolute inset-x-4 top-[30%] -translate-y-1/2 flex justify-between z-40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button 
                          onClick={prevSlide}
                          className="w-10 h-10 rounded-full bg-slate-900/5 backdrop-blur-md text-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all border border-slate-200 shadow-lg active:scale-90"
                        >
                          <Icon name="chevron-left" size={20} />
                        </button>
                        <button 
                          onClick={nextSlide}
                          className="w-10 h-10 rounded-full bg-slate-900/5 backdrop-blur-md text-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all border border-slate-200 shadow-lg active:scale-90"
                        >
                          <Icon name="chevron-right" size={20} />
                        </button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 z-30">
                        <m.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-widest mb-2 shadow-lg shadow-emerald-100"
                        >
                          <Icon name="sparkles" size={8} />
                          Trending Deal
                        </m.div>
                        <h3 className="text-lg sm:text-xl font-bold mb-1 line-clamp-1 tracking-tight text-slate-900">{topProducts[currentSlide].title}</h3>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tighter">₹{formatPrice(topProducts[currentSlide].price)}</span>
                            {topProducts[currentSlide].originalPrice && topProducts[currentSlide].originalPrice !== topProducts[currentSlide].price && (
                              <span className="text-[10px] line-through text-slate-400 font-bold">MRP: ₹{formatPrice(topProducts[currentSlide].originalPrice)}</span>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg transition-all font-bold text-[10px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:scale-105">
                             View Details <Icon name="arrow-right" size={14} />
                          </div>
                        </div>
                      </div>
                    </m.div>
                  ) : (
                    <div className="absolute inset-0 bg-white flex items-center justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500" />
                    </div>
                  )}
                </AnimatePresence>
                
                {/* Progress Indicators */}
                <div className="absolute top-6 right-8 flex gap-2 z-40">
                  {topProducts.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
                      className={`h-1 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-200 hover:bg-slate-300'}`} 
                    />
                  ))}
                </div>
              </div>

              {/* Latest Blog Post - Featured Content */}
              <m.div 
                onClick={() => latestBlog ? window.open(`/blog/${latestBlog.id}`, '_self') : window.open('/blog', '_self')}
                className="col-span-12 row-span-4 sm:row-span-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[2.5rem] shadow-xl p-6 sm:p-8 flex items-center justify-between group cursor-pointer hover:shadow-emerald-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden relative text-white"
              >
                 <div className="relative z-10 flex-1 min-w-0 pr-4">
                   <div className="text-[10px] sm:text-xs font-black text-emerald-100 mb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                     <Icon name="book-open" size={14} /> Latest Smart Guide
                   </div>
                   <div className="text-xl sm:text-2xl font-black text-white group-hover:text-emerald-50 transition-colors line-clamp-1">
                     {latestBlog ? latestBlog.title : 'Read our latest buying guides'}
                   </div>
                   <div className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1 line-clamp-1">
                     {latestBlog && latestBlog.excerpt ? latestBlog.excerpt : 'Discover tips, tricks, and expert recommendations.'}
                   </div>
                 </div>
                 <div className="relative z-10 flex items-center shrink-0">
                   <m.div 
                    whileHover={{ x: 5 }}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner group-hover:bg-white/30 transition-all border border-white/20"
                   >
                     <Icon name="arrow-right" size={24} />
                   </m.div>
                 </div>
                 
                 {/* Decorative background element */}
                 <Icon name="newspaper" size={140} className="absolute -bottom-10 -right-6 text-white/10 rotate-[-15deg] pointer-events-none" />
              </m.div>
            </m.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
