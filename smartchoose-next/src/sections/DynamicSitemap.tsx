import { useEffect, useState } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { m } from 'framer-motion';

export function DynamicSitemap() {
  const { products: contextProducts, blogPosts, settings } = useDatabase();
  const [localProducts, setLocalProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    document.title = `Sitemap - ${settings.siteName}`;
    window.scrollTo(0, 0);
  }, [settings.siteName]);

  useEffect(() => {
    if (contextProducts && contextProducts.length > 0) {
      setLocalProducts(contextProducts);
      return;
    }

    const fetchSitemapProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        setLocalProducts(snap.docs.map(d => d.data()));
      } catch (e) {
        console.error('Sitemap fetch error:', e);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchSitemapProducts();
  }, [contextProducts]);

  const publishedProducts = localProducts.filter(p => p.published);
  const publishedBlogs = (blogPosts || []).filter((b: any) => b.status === 'published');

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dynamic Sitemap</h1>
          <p className="text-slate-500 mb-12">Total {publishedProducts.length + publishedBlogs.length + 3} active links found.</p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Core Pages */}
            <section>
              <h2 className="text-lg font-bold text-emerald-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Main Pages
              </h2>
              <ul className="space-y-3">
                <li><a href="/" className="text-slate-600 hover:text-emerald-600 transition-colors">Home Page</a></li>
                <li><a href="/blog" className="text-slate-600 hover:text-emerald-600 transition-colors">Blog Listing</a></li>
                <li><a href="/about" className="text-slate-600 hover:text-emerald-600 transition-colors">About Us</a></li>
              </ul>
            </section>

            {/* Blog Posts */}
            <section>
              <h2 className="text-lg font-bold text-emerald-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Latest Stories ({publishedBlogs.length})
              </h2>
              <ul className="space-y-3">
                {publishedBlogs.map((blog: any) => (
                  <li key={blog.id}>
                    <a href={`/${blog.slug}`} className="text-slate-600 hover:text-emerald-600 transition-colors block truncate">
                      {blog.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* Products */}
            <section className="md:col-span-2">
              <h2 className="text-lg font-bold text-emerald-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Product Directory ({publishedProducts.length})
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {publishedProducts.map(product => (
                  <div key={product.id}>
                    <a href={`/product/${product.id}`} className="text-slate-600 hover:text-emerald-600 transition-colors block truncate">
                      {product.title}
                    </a>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-16 pt-8 border-t border-slate-50 text-center">
            <p className="text-sm text-slate-400 italic">
              * This sitemap is generated in real-time from the database.
            </p>
          </div>
        </m.div>
      </div>
    </div>
  );
}
