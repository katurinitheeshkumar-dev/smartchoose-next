"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@/components/ui/custom/Icon';
import { Footer } from '@/sections/Footer';
import type { BlogProductBlock, BlogPost } from '@/types';
import { useDatabase } from '@/contexts/DatabaseContext';

// Helper to extract platform name from URL
function getPlatformName(url: string = ''): string {
  if (!url) return 'Store';
  const lowercaseUrl = String(url).toLowerCase();
  
  if (lowercaseUrl.includes('amazon')) return 'Amazon';
  if (lowercaseUrl.includes('flipkart')) return 'Flipkart';
  if (lowercaseUrl.includes('myntra')) return 'Myntra';
  if (lowercaseUrl.includes('ajio')) return 'AJIO';
  if (lowercaseUrl.includes('croma')) return 'Croma';
  if (lowercaseUrl.includes('reliance')) return 'Reliance Digital';
  if (lowercaseUrl.includes('apple')) return 'Apple Store';
  if (lowercaseUrl.includes('samsung')) return 'Samsung Store';
  if (lowercaseUrl.includes('boat')) return 'boAt';
  if (lowercaseUrl.includes('noise')) return 'Noise';
  if (lowercaseUrl.includes('amzn.to')) return 'Amazon';
  if (lowercaseUrl.includes('fkrt.it')) return 'Flipkart';
  if (lowercaseUrl.includes('smartchoose')) return 'SmartChoose';
  
  return 'Store';
}

// ─── Product Card for Blog Post ───────────────────────────────────────────────
function BlogProductCard({ block, isFirst }: { block: BlogProductBlock; isFirst: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isFirst ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-100'}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        {block.image && (
          <div className="sm:w-52 sm:shrink-0 aspect-square sm:aspect-auto overflow-hidden bg-slate-100">
            <img
              src={block.image}
              alt={block.name}
              className="w-full h-full object-cover"
              onError={e => { e.currentTarget.parentElement!.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {/* Best Pick Badge */}
          {isFirst && (
            <span className="self-start px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Icon name="star" size={11} /> Editor's Pick
            </span>
          )}

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight flex-1">{block.name}</h3>
            <span className="text-2xl font-black text-emerald-600 shrink-0">{block.price}</span>
          </div>

          {block.description && (
            <p className="text-slate-600 text-sm leading-relaxed">{block.description}</p>
          )}

          {/* Pros */}
          {block.pros && block.pros.some(p => p) && (
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-2">
                <Icon name="check-circle" size={14} /> Why You Should Buy
              </p>
              <ul className="space-y-2">
                {block.pros.filter(p => p).map((pro, i) => (
                  <li key={i} className="text-xs text-emerald-800 flex items-start gap-2">
                    <Icon name="check" size={12} className="mt-0.5 shrink-0 text-emerald-500 font-bold" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Buy Button */}
          {((block.affiliateLink && block.affiliateLink.length > 5) || block.smartChooseId) && (
            <div className="mt-auto pt-2 text-right sm:text-left">
              <a
                href={block.affiliateLink || `https://smartchoose.in/product/${block.smartChooseId}`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${isFirst
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-emerald-200'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
              >
                <Icon name="shopping-cart" size={16} />
                Buy on {getPlatformName(block.affiliateLink || (block.smartChooseId ? 'smartchoose.in' : ''))} — {block.price}
              </a>
              {!block.affiliateLink && block.smartChooseId && (
                <p className="text-[10px] text-slate-400 mt-2 italic font-medium">* Price verified on SmartChoose</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Editorial Sidebar ──────────────────────────────────────────────────────────
function EditorialSidebar({ blogPosts, category }: { blogPosts: BlogPost[]; category: string }) {
  const router = useRouter();
  const trending = blogPosts
    .filter(b => b.status === 'published' && b.category === category)
    .slice(0, 4);

  return (
    <aside className="space-y-8 sticky top-24">
      {/* Trending Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Trending Now
        </h3>
        <div className="space-y-5">
          {trending.map(post => (
            <div 
              key={post.id} 
              onClick={() => { router.push(`/blog/${post.slug}`); window.scrollTo({ top: 0 }); }}
              className="group cursor-pointer"
            >
              <h4 className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-snug">
                {post.title}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 uppercase font-bold">{post.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats / Newsletter Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <Icon name="zap" size={24} className="text-emerald-400 mb-3" />
        <h3 className="text-lg font-bold mb-2">SmartChoose Weekly</h3>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          Get the world's best tech and lifestyle guides delivered to your inbox every Sunday.
        </p>
        <button className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all">
          JOIN 5,000+ READERS
        </button>
      </div>
    </aside>
  );
}

// ─── Post Placeholder Generator ──────────────────────────────────────────────
const getPlaceholder = (category?: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat.includes('tech')) return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop';
  if (cat.includes('finance')) return 'https://images.unsplash.com/photo-1611974714658-96cc3799071c?q=80&w=800&auto=format&fit=crop';
  if (cat.includes('lifestyle')) return 'https://images.unsplash.com/photo-1511119260176-88ab9a8e0f6c?q=80&w=800&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop';
};

// ─── Related Posts (Redesigned) ────────────────────────────────────────────────
function RelatedPosts({ current, blogPosts }: { current: BlogPost; blogPosts: BlogPost[] }) {
  const router = useRouter();
  const related = blogPosts
    .filter(b => b.id !== current.id && b.status === 'published')
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-slate-200">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-8">More from SmartChoose</h2>
      <div className="grid sm:grid-cols-3 gap-6">
        {related.map(post => {
          const fallback = getPlaceholder(post.category);
          return (
            <div
              key={post.id}
              onClick={() => { router.push(`/blog/${post.slug}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="group cursor-pointer"
            >
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-100">
                <img 
                  src={post.featuredImage || fallback} 
                  alt={post.title} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  onError={(e) => { e.currentTarget.src = fallback; }}
                />
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">{post.category}</span>
              <h3 className="font-extrabold text-slate-900 text-base mt-2 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight">{post.title}</h3>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BlogPostPage
// ═══════════════════════════════════════════════════════════════════════════════
export function BlogPostPage({ initialPost }: { initialPost?: BlogPost }) {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const router = useRouter();
  const { getBlogBySlug, blogPosts, isInitialLoading, settings } = useDatabase();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTopButton, setShowTopButton] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const [post, setPost] = useState<BlogPost | undefined>(initialPost);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (initialPost) {
      setPost(initialPost);
      return;
    }

    const loadPost = async () => {
      setIsFetching(true);
      const fetched = await getBlogBySlug(slug || '');
      setPost(fetched);
      setIsFetching(false);
    };
    loadPost();
  }, [slug, initialPost, getBlogBySlug]);
  const siteUrl = settings.siteUrl || 'https://smartchoose.in';

  // Handle Scroll Progress, Top Button & Sticky CTA
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      setScrollProgress(Number(scroll) * 100);
      setShowTopButton(totalScroll > 500);
      
      // Show sticky CTA after reading 30% of the page if it's a product blog
      if (post?.type === 'product' || (post?.products || []).length > 0) {
        setShowStickyCta(totalScroll > 800);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post]);

  // Extract SEO values once for Helmet
  const postUrl = `${siteUrl}/blog/${post?.slug}`;
  const postImage = post?.featuredImage || `${siteUrl}/logo.png`;
  const seoTitle = post?.seoTitle || (post ? `${post.title} | SmartChoose` : 'SmartChoose');
  const seoDesc = post?.seoDescription || (post?.intro?.slice(0, 155) || '') + '...';

  const jsonld = post ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: seoDesc,
    image: postImage,
    url: postUrl,
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    publisher: {
      '@type': 'Organization',
      name: 'SmartChoose',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png` },
    },
  } : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [post]);

  if (isInitialLoading || isFetching) {
    return (
      <div className="min-h-screen bg-slate-50 pt-40 flex flex-col items-center">
        <div className="spinner mb-4" />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  if (!post || post.status !== 'published') {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <div className="text-center">
          <Icon name="file-x" size={64} className="mx-auto text-slate-300 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Post Not Found</h1>
          <p className="text-slate-500 mb-6">This page doesn't exist or has been unpublished.</p>
          <button onClick={() => router.push('/blog')} className="btn-primary px-6 py-3 rounded-xl text-white font-bold">
            ← Back to Blog
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(post.updatedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Calculate Reading Time
  const wordsPerMinute = 200;
  const wordCount = (post.content || '').split(/\s+/).length + (post.intro || '').split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={postUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={postUrl} />
        <meta property="og:image" content={postImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        <meta name="twitter:image" content={postImage} />
        {jsonld && (
          <script type="application/ld+json">
            {JSON.stringify(jsonld)}
          </script>
        )}
      </Helmet>

      {/* Sticky Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-slate-100">
        <div 
          className="h-full bg-emerald-500 transition-all duration-150" 
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <article className="pb-16 pt-24">
        {/* Header Section (Title & Byline) - MSN STYLE */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="max-w-4xl pt-8">
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-6">
              <a href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }} className="hover:underline">Home</a>
              <Icon name="chevron-right" size={10} />
              <a href="/blog" onClick={(e) => { e.preventDefault(); router.push('/blog'); }} className="hover:underline">Blog</a>
              <Icon name="chevron-right" size={10} />
              <span className="text-slate-400 truncate">{post.category}</span>
            </nav>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm border-b border-slate-100 pb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">SC</div>
                <span className="font-bold text-slate-900">SmartChoose Editorial</span>
              </div>
              <span className="opacity-30">•</span>
              <span className="uppercase text-[11px] font-bold tracking-wider">{formattedDate}</span>
              <span className="opacity-30">•</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                <Icon name="clock" size={12} /> {readTime} MIN READ
              </span>
            </div>
          </div>
        </div>

        {/* Featured Image Section - Below Title */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="max-w-5xl rounded-3xl overflow-hidden bg-slate-100 shadow-2xl">
            <img 
              src={post.featuredImage || getPlaceholder(post.category)} 
              alt={post.title}
              width="1120"
              height="480"
              fetchPriority="high"
              decoding="sync"
              className="w-full aspect-[21/9] object-cover hover:scale-105 transition-transform duration-[3s]" 
              onError={(e) => { e.currentTarget.src = getPlaceholder(post.category); }}
            />
          </div>
          {/* Caption / Image Credits (Optional) */}
          <p className="mt-3 text-[10px] text-slate-400 uppercase font-black tracking-widest text-right">Premium Coverage by SmartChoose Labs</p>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_320px] gap-16">
            {/* Main Column */}
            <main className="min-w-0">
              {/* Premium Intro Box */}
              {post.intro && (
                <div 
                  className="text-xl sm:text-2xl leading-relaxed text-slate-900 font-bold border-l-4 border-emerald-500 pl-8 mb-12 italic tracking-tight"
                  dangerouslySetInnerHTML={{ __html: post.intro }}
                />
              )}

              {/* In-Depth Meta */}
              {post.template !== 'minimal' && (post.products || []).length > 0 && (
                <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl mb-12 border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Icon name="package" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">In-Depth Review</p>
                    <p className="text-sm font-black text-slate-800">Analyzing {(post.products || []).length} Top-Tier Solutions</p>
                  </div>
                </div>
              )}

              {/* Standard Template Products */}
              {post.template === 'standard' && (post.products || []).length > 0 && (
                <div className="space-y-8 mb-16">
                  {(post.products || []).map((block, idx) => (
                    <BlogProductCard key={block.id} block={block} isFirst={idx === 0} />
                  ))}
                </div>
              )}

              {/* Main Content */}
              {post.content && (
                <div className="prose-magazine max-w-none">
                  <div
                    className="editorial-content"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                </div>
              )}

              {/* Today's Best Deal Highlight Box */}
              {post.type === 'product' && (post.products || []).length > 0 && (
                <div className="highlight-deal-box animate-slide-up">
                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                      <Icon name="zap" size={12} className="text-yellow-300" /> 
                      Top Recommendation
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 !mt-0">
                      Looking for the best value?
                    </h2>
                    <p className="text-white/90 text-sm sm:text-base mb-6 font-medium leading-relaxed max-w-xl">
                      Based on our 2026 performance benchmarks, the <span className="font-black underline underline-offset-4 decoration-yellow-300">{post.products[0].name}</span> offers the most comprehensive feature set at this price point.
                    </p>
                    <a 
                      href={post.products[0].affiliateLink || `https://smartchoose.app/product/${post.products[0].smartChooseId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black text-sm hover:bg-emerald-50 transition-all shadow-xl shadow-black/10"
                    >
                      <Icon name="shopping-cart" size={18} />
                      BUY ON {getPlatformName(post.products[0].affiliateLink || '').toUpperCase()} — {post.products[0].price}
                    </a>
                  </div>
                </div>
              )}

              {/* Guide Template Products */}
              {post.template === 'guide' && (post.products || []).length > 0 && (
                <div className="mt-16 space-y-8">
                  <h2 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <span className="w-10 h-1 bg-emerald-500 rounded-full" />
                    Premium Picks for 2026
                  </h2>
                  {(post.products || []).map((block, idx) => (
                    <BlogProductCard key={block.id} block={block} isFirst={idx === 0} />
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <p className="mt-20 pt-8 border-t border-slate-100 text-[11px] text-slate-400 italic max-w-2xl leading-relaxed">
                <strong>Editorial Transparency:</strong> Our mission is to provide you with honest, data-driven advice. We may earn a commission when you purchase through our links.
              </p>

              {/* Share */}
              <div className="mt-12">
                <div className="flex flex-col sm:flex-row items-center gap-6 p-8 bg-slate-900 rounded-3xl text-white">
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold mb-1">Help others shop smart</h3>
                    <p className="text-slate-400 text-sm">Spread the word about this guide.</p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        const url = window.location.href;
                        const title = post.title;
                        const text = `📖 Check out this guide on SmartChoose!\n\n*${post.title}*\n\n`;
                        
                        if (navigator.share) {
                          try {
                            await navigator.share({ title, text, url });
                          } catch (err) {
                            if ((err as Error).name !== 'AbortError') {
                              window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
                            }
                          }
                        } else {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text + url)}`, '_blank');
                        }
                      }} 
                      className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-black text-sm flex items-center gap-2 transition-all"
                    >
                      <Icon name="share-2" size={16} /> SHARE GUIDE
                    </button>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); }} className="h-12 px-6 bg-white/10 hover:bg-white/20 rounded-xl font-black text-sm transition-all border border-white/10">
                      COPY LINK
                    </button>
                  </div>
                </div>
                <RelatedPosts current={post} blogPosts={blogPosts} />
              </div>
            </main>

            {/* Sidebar */}
            <div className="hidden lg:block">
              <EditorialSidebar blogPosts={blogPosts} category={post.category || ''} />
            </div>
          </div>
        </div>
      </article>

      {/* Floating Navigation */}
      <div 
        className={`fixed bottom-8 right-8 z-50 transition-all duration-300 transform ${showTopButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      >
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-white border border-slate-200 text-slate-800 rounded-full shadow-xl flex items-center justify-center hover:border-emerald-500 hover:text-emerald-500 transition-all"
        >
          <Icon name="chevron-up" size={24} />
        </button>
      </div>

      {/* Sticky Affiliate CTA (Mobile First) */}
      <div className={`sticky-blog-cta flex items-center justify-between gap-4 ${showStickyCta ? 'show' : ''}`}>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Top Editor's Pick</p>
          <p className="font-bold text-slate-900 text-sm truncate">{post.products?.[0]?.name || post.title}</p>
        </div>
        <a 
          href={post.products?.[0]?.affiliateLink || (post.products?.[0]?.smartChooseId ? `https://smartchoose.app/product/${post.products[0].smartChooseId}` : '#')} 
          target="_blank" 
          rel="noopener noreferrer"
          className="shrink-0 px-5 py-2.5 bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          BUY ON {getPlatformName(post.products?.[0]?.affiliateLink).toUpperCase()}
        </a>
      </div>

      <Footer />
    </div>
  );
}

export default BlogPostPage;
