import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useDatabase } from '@/contexts/DatabaseContext';

export default function LegalPage() {
  const location = useLocation();
  const { settings } = useDatabase();
  const path = location.pathname;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  const getContent = () => {
    if (path === '/privacy') {
      return {
        title: 'Privacy Policy',
        content: `
          <h3>1. Information We Collect</h3>
          <p>We collect information you provide directly to us when you use SmartChoose. This may include your name, email address, and any other information you choose to provide.</p>
          
          <h3>2. How We Use Your Information</h3>
          <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to personalize your experience.</p>
          
          <h3>3. Cookies and Tracking</h3>
          <p>We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve your user experience.</p>
          
          <h3>4. Third-Party Services</h3>
          <p>We use third-party services like Google Analytics and Firebase to help us understand how our users interact with the site. These services may collect information sent by your browser.</p>
          
          <h3>5. Changes to This Policy</h3>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
        `
      };
    } else if (path === '/terms') {
      return {
        title: 'Terms of Service',
        content: `
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using SmartChoose, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
          
          <h3>2. Use License</h3>
          <p>Permission is granted to temporarily download one copy of the materials on SmartChoose for personal, non-commercial transitory viewing only.</p>
          
          <h3>3. Disclaimer</h3>
          <p>The materials on SmartChoose are provided on an 'as is' basis. SmartChoose makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.</p>
          
          <h3>4. Limitations</h3>
          <p>In no event shall SmartChoose or its suppliers be liable for any damages arising out of the use or inability to use the materials on SmartChoose.</p>
          
          <h3>5. Governing Law</h3>
          <p>These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
        `
      };
    } else if (path === '/disclosure') {
      return {
        title: 'Affiliate Disclosure',
        content: `
          <p>In compliance with the FTC guidelines, please assume the following about links and posts on this website:</p>
          <p>Many of the links on <strong>${settings.siteName}</strong> are affiliate links. This means that a special tracking code is used and that we may make a small commission on the sale of an item if you purchase through one of these links.</p>
          <p><strong>The price of the item is the same for you whether it is an affiliate link or not.</strong> In fact, using our affiliate links helps us to continue bringing you the best gadget deals and reviews.</p>
          <p>We only recommend products that we believe will add value to our readers. Our priority is always providing high-quality content and recommendations to help you make "Smart Choices".</p>
          <hr/>
          <p><strong>Amazon Associates Disclosure:</strong> SmartChoose is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.in / Amazon.com.</p>
        `
      };
    } else if (path === '/returns') {
      return {
        title: 'Shipping & Return Policy',
        content: `
          <h3>1. Shipping Policy</h3>
          <p>At <strong>${settings.siteName}</strong>, we ensure that you get the best deals with reliable shipping. Since we are an affiliate platform, shipping is handled directly by our retail partners (Amazon, Flipkart, etc.).</p>
          <ul>
            <li><strong>Shipping Cost:</strong> Most products listed on our platform qualify for <strong>FREE Shipping</strong>.</li>
            <li><strong>Delivery Time:</strong> Standard delivery usually takes 3-5 business days depending on your location in India.</li>
            <li><strong>Tracking:</strong> Once you complete a purchase on the retailer's site, you will receive a tracking ID via email/SMS from them.</li>
          </ul>

          <h3>2. Return Window: 7 Days</h3>
          <p>We provide a <strong>7-day return window</strong> for all products discovered through our platform. You have 7 days after receiving your item to request a return through the original retailer.</p>
          
          <h3>3. Return Cost: FREE</h3>
          <p>Returns are <strong>FREE</strong> for all eligible products. You will not be charged for return shipping or any restocking fees when processing a return through our affiliate partners' standard return process.</p>
          
          <h3>4. How to Initiate a Return</h3>
          <p>To process a return, please follow these steps on the retailer's website where the purchase was made:</p>
          <ol>
            <li>Login to your account on the retailer's site (e.g., Amazon.in).</li>
            <li>Go to 'Your Orders' and find the product you wish to return.</li>
            <li>Click 'Return or Replace Items' and select the reason for return.</li>
            <li>Choose your preferred return method (Pickup or Self-ship).</li>
          </ol>
          
          <h3>5. Return Conditions</h3>
          <p>To be eligible for a return, please ensure the following general conditions are met (subject to retailer-specific rules):</p>
          <ul>
            <li>Items must be in the original condition they were received.</li>
            <li>Original packaging, tags, and accessories should be intact.</li>
            <li>The item should not have been used or damaged after delivery.</li>
          </ul>

          <h3>6. Refund Process</h3>
          <p>Refunds are issued by the retailer directly to your original payment method. Most refunds are processed within 5-7 business days after the item is picked up or received by the warehouse.</p>

          <h3>7. Contact for Support</h3>
          <p>If you encounter any issues with the retailer during the return process or have questions about a product, please contact us at <strong>${settings.contactEmail}</strong> or visit our <a href="/contact" class="text-emerald-600 hover:underline">Contact Page</a>.</p>

          <h3>8. Affiliate Disclosure</h3>
          <p><strong>${settings.siteName}</strong> is a product discovery platform. We do not sell, ship, or handle inventory directly. All transactions and after-sales support are provided by the respective retailers.</p>
        `
      };
    }
    return { title: 'Legal', content: '' };
  };

  const { title, content } = getContent();

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4">
      <Helmet>
        <title>{title} | SmartChoose</title>
        <meta name="description" content={`Official ${title} for SmartChoose. Learn more about our policies and guidelines.`} />
        <link rel="canonical" href={`https://smartchoose.in${path}`} />
      </Helmet>
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8 border-b border-slate-100 pb-6">{title}</h1>
        <div 
          className="prose prose-slate prose-emerald max-w-none 
            prose-headings:text-slate-900 prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4
            prose-p:text-slate-600 prose-p:leading-relaxed prose-p:mb-4
            prose-li:text-slate-600 prose-strong:text-slate-900 border-l-4 border-emerald-500 pl-6"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </m.div>
    </div>
  );
}
