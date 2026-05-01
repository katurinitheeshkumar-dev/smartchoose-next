import React from 'react';
import { m } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';

const BlogGuidance: React.FC = () => {
  const { blogPosts = [] } = useDatabase();
  
  // Sort by date (latest first) and get top 3 - with safety check
  const guides = [...(blogPosts || [])]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  // Helper to get a high-quality relevant image from Unsplash based on title
  const getSmartImage = (title: string, customImage?: string) => {
    if (customImage && customImage.startsWith('http')) return customImage;
    
    // Extract keywords from title for a better search
    const keywords = title.toLowerCase()
      .replace(/[0-9]|best|budget|under|in india|for|with|and|the|a|an/g, '')
      .split(' ')
      .filter(w => w.length > 2)
      .slice(0, 2)
      .join(',');
      
    return `https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop&sig=${keywords}`;
  };

  return (
    <section className="py-12 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Shopping Guides</h2>
            <p className="text-slate-500 text-sm mt-1">Not sure what to buy? Our experts help you choose the best.</p>
          </div>
          <a href="/blog" className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline">
            View All Guides
            <Icon name="arrow-right" size={16} />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {guides.map((post, i) => (
            <m.a
              key={post.id}
              href={`/${post.slug}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group relative h-72 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-slate-100 bg-slate-900"
            >
              <img 
                src={getSmartImage(post.title, post.image)} 
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-60 group-hover:opacity-80"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase mb-4">
                  <Icon name="sparkles" size={12} />
                  AI Curated Guide
                </div>
                <h3 className="text-xl font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors line-clamp-3">
                  {post.title}
                </h3>
              </div>
            </m.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogGuidance;
