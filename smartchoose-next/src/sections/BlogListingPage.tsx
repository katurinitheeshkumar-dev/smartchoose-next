import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/custom/Icon';
import { Helmet } from 'react-helmet-async';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Footer } from '@/sections/Footer';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPopup } from '@/components/ui/custom/NotificationPopup';
import type { BlogPost } from '@/types';

// Helper to strip HTML tags for metadata fields
function stripTags(text: string | undefined) {
  if (!text) return "";
  return text.replace(/<[^>]*>?/gm, '').trim();
}

export function BlogListingPage() {
  const { blogPosts } = useDatabase();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const published = (blogPosts || []).filter((b: BlogPost) => b.status === 'published');
  const categories = ['All', ...new Set(published.map(p => stripTags(p.category)).filter(Boolean))];

  const filteredPosts = selectedCategory === 'All' 
    ? published 
    : published.filter(p => stripTags(p.category) === selectedCategory);

  const featuredPost = published[0];
  const regularPosts = filteredPosts.filter(p => p.id !== featuredPost?.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (blogPosts && blogPosts.length > 0) {
      setIsLoading(false);
    } else {
      // Small safety timeout in case of network issues, but much shorter
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [blogPosts]);

  const SkeletonCard = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-slate-100" />
      <div className="p-6">
        <div className="h-3 bg-slate-100 rounded w-1/4 mb-4" />
        <div className="h-6 bg-slate-100 rounded w-full mb-3" />
        <div className="h-6 bg-slate-100 rounded w-2/3 mb-6" />
        <div className="h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Expert Buying Guides & Reviews | SmartChoose Blog</title>
        <meta name="description" content="Read our professional buying guides, product reviews, and expert shopping tips to make smarter choices." />
        <link rel="canonical" href="https://smartchoose.in/blog" />
      </Helmet>

      <div className="pt-32 pb-20">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="max-w-3xl">
             <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-full mb-6">
                SmartChoose Editorial
             </span>
             <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
                Insights for the <br/><span className="text-indigo-600">Smart Shopper.</span>
             </h1>
             <p className="text-xl text-slate-500 font-medium leading-relaxed">
                Expert-led buying guides, deep-dive reviews, and the latest trends to help you shop with confidence and save more.
             </p>
          </div>
        </div>

        {/* Featured Post */}
        {!isLoading && featuredPost && selectedCategory === 'All' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
            <article 
              onClick={() => router.push(`/blog/${featuredPost.slug}`)}
              className="group relative bg-slate-900 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl shadow-indigo-500/10"
            >
              <div className="grid lg:grid-cols-2">
                <div className="aspect-[4/3] lg:aspect-auto relative overflow-hidden">
                   {featuredPost.featuredImage ? (
                     <img 
                       src={featuredPost.featuredImage} 
                       alt={stripTags(featuredPost.title)} 
                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                     />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                       <Icon name="newspaper" size={80} className="text-slate-700" />
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent lg:hidden" />
                </div>
                <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-slate-900 text-white">
                  <span className="inline-block px-3 py-1 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg mb-6 w-fit">
                    Featured Story
                  </span>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 leading-tight group-hover:text-indigo-400 transition-colors">
                    {stripTags(featuredPost.title)}
                  </h2>
                  <p className="text-slate-300 text-lg mb-10 line-clamp-3 font-medium">
                    {stripTags(featuredPost.intro)}
                  </p>
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-indigo-400 font-bold">
                      Read Article <Icon name="arrow-right" size={20} />
                    </span>
                    <span className="text-slate-500 font-bold text-sm">
                      {Math.ceil(stripTags(featuredPost.content).length / 1000)} min read
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        )}

        {/* Blog Notifications Popup */}
        {(() => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const { isSubscribed, subscribe, loading, isDismissed, dismiss } = useNotifications('blog');
          
          return (
            <NotificationPopup
              show={!isSubscribed && !isDismissed}
              onClose={dismiss}
              onSubscribe={async () => {
                const success = await subscribe();
                if (success) {
                  alert('System: Blog alerts turned on!');
                  dismiss();
                }
              }}
              loading={loading}
              title="Subscribe to Blog Alerts"
              description="Get the latest buying guides and expert insights delivered as notifications."
              color="indigo"
            />
          );
        })()}

        {/* Categories & Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 border-b border-slate-100 pb-8">
           <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-black text-slate-400 uppercase tracking-widest mr-4">Categories:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 text-white shadow-lg' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Posts Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center">
               <h2 className="text-2xl font-black text-slate-300">No articles found in this category.</h2>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {(selectedCategory === 'All' ? regularPosts : filteredPosts).map((post: BlogPost) => (
                <article
                  key={post.id}
                  onClick={() => router.push(`/blog/${post.slug}`)}
                  className="group cursor-pointer flex flex-col"
                >
                  <div className="aspect-[16/10] rounded-[2rem] overflow-hidden mb-6 bg-slate-100 relative">
                     {post.featuredImage ? (
                       <img 
                         src={post.featuredImage} 
                         alt={stripTags(post.title)} 
                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                       />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Icon name="newspaper" size={40} />
                       </div>
                     )}
                     <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                        {stripTags(post.category)}
                     </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-slate-900 leading-snug mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {stripTags(post.title)}
                    </h3>
                    <p className="text-slate-500 font-medium mb-6 line-clamp-2 leading-relaxed">
                      {stripTags(post.intro)}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                       <span className="text-sm font-black text-indigo-600 flex items-center gap-2 group-hover:gap-3 transition-all">
                          Keep Reading <Icon name="arrow-right" size={16} />
                       </span>
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                       </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter CTA */}
        {!isLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
            <div className="bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
               {/* Decorative background circle */}
               <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full -ml-10 -mb-10 blur-2xl" />

               <div className="relative z-10 max-w-2xl mx-auto">
                 <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
                    Never miss a <br/>smart choice.
                 </h2>
                 <p className="text-indigo-100 text-lg font-medium mb-10">
                    Join 10,000+ smart shoppers and get our best buying guides delivered straight to your inbox every week.
                 </p>
                 <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                    <button className="px-8 py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-indigo-50 transition-all shadow-xl">
                       Subscribe Now
                    </button>
                 </form>
                 <p className="text-indigo-300 text-xs mt-6 font-medium">
                    No spam. Just quality insights. Unsubscribe at any time.
                 </p>
               </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default BlogListingPage;
