import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';

export function BlogSection() {
  const { blogPosts } = useDatabase();
  const navigate = useNavigate();

  const latestPosts = (blogPosts || [])
    .filter(b => b.status === 'published')
    .slice(0, 3); // Show top 3

  if (latestPosts.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-4">
              <Icon name="newspaper" size={12} />
              Expert Guides
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
              Latest from the Blog
            </h2>
            <p className="text-slate-500 text-lg">
              Expert buying guides and product reviews to help you shop smarter and save more.
            </p>
          </div>
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
          >
            View all articles <Icon name="arrow-right" size={18} />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {latestPosts.map((post, index) => (
            <m.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/${post.slug}`)}
              className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] bg-emerald-50 relative overflow-hidden">
                {post.featuredImage ? (
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-200">
                    <Icon name="newspaper" size={48} />
                  </div>
                )}
                <span className="absolute top-4 left-4 px-3 py-1 bg-white/95 backdrop-blur-sm shadow-sm text-emerald-700 text-xs font-bold rounded-full">
                  {post.category}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
                  {post.title}
                </h3>
                {post.intro && (
                  <p className="text-slate-500 text-sm line-clamp-2 mb-6 flex-1">
                    {post.intro}
                  </p>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                    <Icon name="package" size={14} />
                    {post.products?.length || 0} Products
                  </span>
                  <span className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                    Read Post <Icon name="arrow-right" size={14} />
                  </span>
                </div>
              </div>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  );
}
