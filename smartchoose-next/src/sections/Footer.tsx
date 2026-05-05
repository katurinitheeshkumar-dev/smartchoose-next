import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';

export function Footer() {
  const { settings, socialLinks } = useDatabase();
  const router = useRouter();

  const iconMap: Record<string, string> = {
    'Instagram': 'instagram',
    'Facebook': 'facebook',
    'Youtube': 'youtube',
    'Twitter': 'twitter',
    'Linkedin': 'linkedin',
    'MessageCircle': 'message-circle',
    'Send': 'send',
    'Music': 'music',
    'Globe': 'globe',
    'Github': 'github'
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'instant' });
    } else if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <footer className="bg-slate-900 text-white content-visibility-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <div className="mb-6 cursor-pointer inline-block" onClick={() => scrollToSection('home')}>
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden shrink-0">
                <img 
                  src={settings.logo && settings.logo !== '/logo.png' ? settings.logo : '/logo.png'} 
                  alt={settings.siteName} 
                  className="w-full h-full object-contain p-1.5" 
                  width="64"
                  height="64"
                  decoding="async"
                  loading="lazy"
                />
              </div>
            </div>
            <p className="text-slate-400 mb-6 max-w-sm">{settings.footerContent}</p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map(link => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-emerald-600 hover:text-white transition-all"
                >
                  <Icon name={iconMap[link.icon] || 'link'} size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3 text-slate-400">
              <li>
                <a
                  href="/"
                  onClick={(e) => { e.preventDefault(); scrollToSection('home'); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/#products-section"
                  onClick={(e) => { e.preventDefault(); scrollToSection('products-section'); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Products
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  onClick={(e) => { e.preventDefault(); router.push('/about'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="/blog"
                  onClick={(e) => { e.preventDefault(); router.push('/blog'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors text-emerald-400 font-semibold cursor-pointer"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/jobs"
                  onClick={(e) => { e.preventDefault(); router.push('/jobs'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors text-emerald-400 font-semibold cursor-pointer"
                >
                  Job Alerts
                </a>
              </li>
              <li>
                <a
                  href="/sitemap"
                  onClick={(e) => { e.preventDefault(); router.push('/sitemap'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Sitemap
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  onClick={(e) => { e.preventDefault(); router.push('/contact'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6">Legal</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => { e.preventDefault(); router.push('/privacy'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => { e.preventDefault(); router.push('/terms'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="/disclosure"
                  onClick={(e) => { e.preventDefault(); router.push('/disclosure'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Affiliate Disclosure
                </a>
              </li>
              <li>
                <a
                  href="/returns"
                  onClick={(e) => { e.preventDefault(); router.push('/returns'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Shipping & Return Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Community */}
          <div>
            <h4 className="font-bold text-lg mb-6">Join our Community</h4>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Never miss a deal! Join 5,000+ smart shoppers in our WhatsApp channel for instant deal alerts.
            </p>
            <a 
              href="https://whatsapp.com/channel/your-channel-id" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#128C7E] hover:bg-[#075E54] text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/40 active:scale-95 group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              JOIN WHATSAPP CHANNEL
              <Icon name="arrow-right" size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">{settings.footerContent}</p>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
