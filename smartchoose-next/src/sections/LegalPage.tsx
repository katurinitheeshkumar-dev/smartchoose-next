"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { m } from 'framer-motion';
import { useDatabase } from '@/contexts/DatabaseContext';

export default function LegalPage() {
  const pathname = usePathname();
  const { settings } = useDatabase();
  const path = pathname;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  const getContent = () => {
    if (path === '/privacy') {
      return {
        title: 'Privacy Policy',
        content: `
          <p><strong>Last Updated: May 2025</strong></p>
          <p>This Privacy Policy describes how <strong>${settings.siteName}</strong> ("we", "our", or "us") collects, uses, and protects your information when you use our website at <strong>smartchoose.in</strong>.</p>

          <h3>1. Information We Collect</h3>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Contact Information:</strong> When you submit a contact form, we collect your name, email address, and message.</li>
            <li><strong>Usage Data:</strong> We automatically collect information such as your IP address, browser type, pages visited, and time spent on our site via Google Analytics.</li>
            <li><strong>Cookies:</strong> We use cookies to improve your browsing experience. See Section 3 for details.</li>
          </ul>

          <h3>2. How We Use Your Information</h3>
          <ul>
            <li>To respond to your inquiries submitted via our contact form.</li>
            <li>To analyse website traffic and improve our content using Google Analytics.</li>
            <li>To maintain and improve the performance of our website.</li>
            <li>We do <strong>not</strong> sell, rent, or trade your personal information to third parties.</li>
          </ul>

          <h3>3. Cookies &amp; Tracking Technologies</h3>
          <p>We use the following cookies and tracking technologies:</p>
          <ul>
            <li><strong>Google Analytics:</strong> Tracks anonymous usage data such as pages visited, session duration, and traffic sources.</li>
            <li><strong>Firebase:</strong> Used for secure data storage and real-time updates. Firebase may store session tokens.</li>
            <li><strong>Affiliate Tracking Cookies:</strong> When you click a product link, affiliate networks (such as Amazon Associates) may place cookies on your device to track purchases for commission purposes. These cookies are governed by the respective affiliate network's privacy policy.</li>
          </ul>
          <p>You can disable cookies in your browser settings. Note that some website features may not function correctly without cookies.</p>

          <h3>4. Data Retention</h3>
          <p>Contact form submissions are retained for a maximum of 12 months and then permanently deleted. Analytics data is retained as per Google Analytics default settings (14 months).</p>

          <h3>5. Third-Party Services</h3>
          <p>Our website links to third-party e-commerce platforms (Amazon, Flipkart, etc.). Once you leave our site, their privacy policies apply. We are not responsible for the privacy practices of these external sites.</p>

          <h3>6. Your Rights</h3>
          <p>Under the Information Technology Act, 2000 (India), you have the right to access, correct, or request deletion of your personal data. To exercise these rights, contact us at: <strong>${settings.contactEmail || 'smartchoose.app@gmail.com'}</strong></p>

          <h3>7. Changes to This Policy</h3>
          <p>We may update this Privacy Policy periodically. The "Last Updated" date at the top reflects any changes. Continued use of our website after changes constitutes acceptance of the updated policy.</p>

          <h3>8. Contact Us</h3>
          <p>For privacy-related queries: <strong>${settings.contactEmail || 'smartchoose.app@gmail.com'}</strong> | Phone: <strong>${settings.contactPhone || '+91 9247942311'}</strong></p>
        `
      };
    } else if (path === '/terms') {
      return {
        title: 'Terms of Service',
        content: `
          <p><strong>Last Updated: May 2025</strong></p>
          <p>Please read these Terms of Service carefully before using <strong>smartchoose.in</strong> operated by <strong>${settings.siteName}</strong>.</p>

          <h3>1. Acceptance of Terms</h3>
          <p>By accessing or using SmartChoose, you agree to be bound by these Terms of Service and all applicable laws and regulations of India.</p>

          <h3>2. Nature of Service</h3>
          <p><strong>${settings.siteName}</strong> is a <strong>product discovery and price comparison platform</strong>. We do not sell, ship, or deliver any products ourselves. All products listed on our platform are sold and fulfilled by third-party retailers (such as Amazon.in, Flipkart.com, etc.). We earn a commission when you make a purchase through our affiliate links at no extra cost to you.</p>

          <h3>3. Affiliate Disclosure</h3>
          <p>SmartChoose participates in affiliate marketing programmes including the Amazon Associates Programme and others. We earn advertising fees when users click our links and make qualifying purchases. The price you pay is never affected by this.</p>

          <h3>4. Price Accuracy</h3>
          <p>Prices shown on SmartChoose are indicative and sourced at the time of listing. Actual prices at checkout may vary. <strong>SmartChoose does not guarantee price accuracy.</strong> Always verify the final price on the retailer's website before completing a purchase.</p>

          <h3>5. User Conduct</h3>
          <p>You agree not to use SmartChoose for any unlawful purpose or in any way that could damage, disable, or impair the website.</p>

          <h3>6. Intellectual Property</h3>
          <p>All content on SmartChoose including text, images, graphics, and logos is protected under Indian copyright law. You may not reproduce or distribute any content without written permission.</p>

          <h3>7. Disclaimer of Warranties</h3>
          <p>SmartChoose is provided on an "as is" basis without any warranties, expressed or implied. We do not warrant that the website will be error-free or uninterrupted.</p>

          <h3>8. Limitation of Liability</h3>
          <p>SmartChoose shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of our website or reliance on any information provided.</p>

          <h3>9. Dispute Resolution</h3>
          <p>Any disputes shall first be attempted to be resolved through mutual discussion. If unresolved, disputes shall be subject to the exclusive jurisdiction of the courts in <strong>East Godavari, Andhra Pradesh, India</strong>.</p>

          <h3>10. Governing Law</h3>
          <p>These Terms are governed by the laws of <strong>India</strong>, including the Information Technology Act, 2000 and the Consumer Protection Act, 2019.</p>

          <h3>11. Contact</h3>
          <p>For questions: <strong>${settings.contactEmail || 'smartchoose.app@gmail.com'}</strong> | Phone: <strong>${settings.contactPhone || '+91 9247942311'}</strong></p>
        `
      };
    } else if (path === '/disclosure') {
      return {
        title: 'Affiliate Disclosure',
        content: `
          <p><strong>Last Updated: May 2025</strong></p>
          <p><strong>${settings.siteName}</strong> is committed to full transparency with our readers.</p>

          <h3>What is an Affiliate Link?</h3>
          <p>An affiliate link is a special URL that tracks when a user clicks from our website to a retailer's website. If you make a purchase after clicking an affiliate link, we may earn a small commission from the retailer at no extra cost to you.</p>

          <h3>Our Affiliate Relationships</h3>
          <p>SmartChoose participates in the following affiliate programmes:</p>
          <ul>
            <li><strong>Amazon Associates:</strong> SmartChoose is a participant in the Amazon Services LLC Associates Program (Amazon.in / Amazon.com), an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.</li>
            <li><strong>Flipkart Affiliate Programme</strong></li>
            <li><strong>Other e-commerce and retail affiliate networks</strong> operating in India.</li>
          </ul>

          <h3>Does This Affect You?</h3>
          <p><strong>No.</strong> The price of any product is exactly the same whether you use our affiliate link or go directly to the retailer. Using our links helps support SmartChoose so we can continue providing free product discovery.</p>

          <h3>Our Editorial Independence</h3>
          <p>Affiliate relationships do not influence the products we feature or our editorial opinions. We only recommend products we genuinely believe provide value to our users.</p>

          <h3>Compliance</h3>
          <p>This disclosure is made in compliance with the Advertising Standards Council of India (ASCI) guidelines and global affiliate marketing transparency best practices.</p>

          <h3>Contact</h3>
          <p>Questions about our affiliate relationships: <strong>${settings.contactEmail || 'smartchoose.app@gmail.com'}</strong></p>
        `
      };
    } else if (path === '/shipping') {
      return {
        title: 'Shipping Policy',
        content: `
          <h3>1. How Shipping Works</h3>
          <p>At <strong>${settings.siteName}</strong>, we are a product discovery and affiliate platform. We do not sell or ship products directly. All orders are fulfilled and shipped by our trusted retail partners (Amazon, Flipkart, Myntra, etc.).</p>

          <h3>2. Shipping Costs</h3>
          <ul>
            <li><strong>Free Shipping:</strong> Most products listed on our platform qualify for <strong>FREE Shipping</strong> from our retail partners.</li>
            <li><strong>Paid Shipping:</strong> For some products or locations, the retailer may charge a nominal delivery fee, which will be displayed at checkout on their site.</li>
          </ul>

          <h3>3. Delivery Timelines</h3>
          <ul>
            <li><strong>Standard Delivery:</strong> 3–5 business days, depending on your location in India.</li>
            <li><strong>Express Delivery:</strong> Available for select products and locations through the retailer's platform.</li>
            <li><strong>Remote Locations:</strong> Delivery to remote or rural areas may take up to 7–10 business days.</li>
          </ul>

          <h3>4. Order Tracking</h3>
          <p>Once you complete a purchase on the retailer's website, you will receive a confirmation email and/or SMS with your Order ID and a tracking link directly from the retailer. You can use this to track your shipment in real time.</p>

          <h3>5. Delivery Partners</h3>
          <p>Delivery is handled by the logistics partners of the respective retail platforms, including but not limited to Delhivery, BlueDart, DTDC, Amazon Logistics, and Flipkart Logistics.</p>

          <h3>6. Damaged or Missing Shipments</h3>
          <p>If you receive a damaged item or your shipment is missing, please contact the retailer's customer support directly. You can also reach us at <strong>${settings.contactEmail}</strong> and we will help you navigate the process.</p>

          <h3>7. Our Role as an Affiliate</h3>
          <p><strong>${settings.siteName}</strong> is an affiliate platform. We connect you with the best products and deals on trusted e-commerce platforms. All shipping, handling, and logistics are managed by the respective retailers.</p>
        `
      };
    } else if (path === '/returns') {
      return {
        title: 'Return & Refund Policy',
        content: `
          <h3>1. Return Window: 7 Days</h3>
          <p>We support a <strong>7-day return window</strong> for all products discovered through our platform. You have 7 days after receiving your item to request a return through the original retailer where you purchased the product.</p>
          
          <h3>2. Return Cost: FREE</h3>
          <p>Returns are <strong>FREE</strong> for all eligible products. You will not be charged for return shipping or any restocking fees when processing a return through our affiliate partners' standard return process.</p>
          
          <h3>3. How to Initiate a Return</h3>
          <p>To process a return, please follow these steps on the retailer's website where the purchase was made:</p>
          <ol>
            <li>Login to your account on the retailer's site (e.g., Amazon.in or Flipkart.com).</li>
            <li>Go to 'Your Orders' and find the product you wish to return.</li>
            <li>Click 'Return or Replace Items' and select the reason for return.</li>
            <li>Choose your preferred return method (Pickup or Self-ship).</li>
          </ol>
          
          <h3>4. Return Eligibility Conditions</h3>
          <p>To be eligible for a return, please ensure the following general conditions are met (subject to retailer-specific rules):</p>
          <ul>
            <li>Items must be in the original condition they were received.</li>
            <li>Original packaging, tags, and accessories should be intact.</li>
            <li>The item should not have been used or damaged after delivery.</li>
            <li>Return request must be raised within the 7-day window from delivery.</li>
          </ul>

          <h3>5. Refund Process</h3>
          <p>Refunds are issued by the retailer directly to your original payment method. Most refunds are processed within 5–7 business days after the item is picked up or received by the warehouse.</p>

          <h3>6. Non-Returnable Items</h3>
          <p>Certain items may not be eligible for return as per the retailer's policy, including digital products, perishables, and items that are not in original condition. Please check the specific return policy on the retailer's website before purchasing.</p>

          <h3>7. Contact for Support</h3>
          <p>If you encounter any issues during the return process or have questions, please contact us at <strong>${settings.contactEmail}</strong> or visit our <a href="/contact" class="text-emerald-600 hover:underline">Contact Page</a>.</p>

          <h3>8. Affiliate Disclosure</h3>
          <p><strong>${settings.siteName}</strong> is a product discovery platform. We do not sell, ship, or handle inventory directly. All transactions, returns, and after-sales support are provided by the respective retailers.</p>
        `
      };
    }
    return { title: 'Legal', content: '' };
  };

  const { title, content } = getContent();

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4">

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
