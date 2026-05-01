import { db, messaging } from './_lib/firebase-admin.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!db) return res.status(500).json({ error: 'Firebase Admin not initialized.' });

  const { type, id, blogId, jobId, productId, settings: clientSettings } = req.body;
  const targetId = id || blogId || jobId || productId;
  const broadcastType = type || (blogId ? 'blog' : (jobId ? 'job' : 'product'));

  if (!targetId) return res.status(400).json({ error: 'Missing ID' });

  try {
    // 1. Get Settings
    let settings = clientSettings;
    if (!settings || !settings.telegramBotToken) {
      const settingsDoc = await db.collection('settings').doc('site_settings').get();
      settings = settingsDoc.exists ? settingsDoc.data() : {};
    }

    const siteUrl = settings.siteUrl || 'https://smartchoose.in';
    const siteName = settings.siteName || 'SmartChoose';
    const results = { telegram: 'skipped', push: 'skipped', whatsapp: 'skipped' };

    // 2. Handle based on type
    if (broadcastType === 'blog') {
      const blogDoc = await db.collection('blogPosts').doc(targetId).get();
      if (!blogDoc.exists) return res.status(404).json({ error: 'Blog not found' });
      const blog = blogDoc.data();
      const blogUrl = `${siteUrl}/blog/${blog.slug}`;
      const message = `📚 *New Blog Post: ${blog.title}*\n\n${blog.intro || ''}\n\n📖 *Read Full Story:* ${blogUrl}\n\n#Blog #${siteName} #Tech #${blog.category}`;
      
      if (settings.telegramBotToken && settings.telegramChannelId) {
        const tgRes = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: settings.telegramChannelId,
            photo: blog.featuredImage,
            caption: message,
            parse_mode: 'Markdown'
          })
        });
        const tgData = await tgRes.json();
        results.telegram = tgData.ok ? 'sent' : 'failed';
      }

      if (messaging) {
        const snapshot = await db.collection('subscriptions').where('topic', '==', 'blog').get();
        const tokens = snapshot.docs.map(doc => doc.data().token).filter(Boolean);
        if (tokens.length > 0) {
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title: `📚 New Post: ${blog.title}`, body: (blog.intro || '').substring(0, 100) + '...' },
            webpush: { notification: { icon: blog.featuredImage || `${siteUrl}/logo192.png`, badge: `${siteUrl}/logo192.png` }, fcmOptions: { link: blogUrl } }
          });
          results.push = 'sent';
        }
      }
      await db.collection('blogPosts').doc(targetId).update({ broadcasted: true });

    } else if (broadcastType === 'job') {
      const jobDoc = await db.collection('jobs').doc(targetId).get();
      if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found' });
      const job = jobDoc.data();
      const jobUrl = `${siteUrl}/jobs/${targetId}`;
      const message = `🚀 *New Job Alert — ${siteName}*\n━━━━━━━━━━━━━━━━━━\n\n📌 *${job.title}*\n🏢 *Company:* ${job.company}\n📍 *Location:* ${job.location}\n\n✅ *Apply Now:*\n${jobUrl}\n\n#Jobs #Careers #Hiring #${(job.category || 'Jobs').replace(/\s+/g, '')}`;

      if (settings.telegramBotToken && settings.telegramChannelId) {
        const tgRes = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: settings.telegramChannelId, text: message, parse_mode: 'Markdown' })
        });
        const tgData = await tgRes.json();
        results.telegram = tgData.ok ? 'sent' : 'failed';
      }

      if (settings.whatsappWebhookUrl) {
        // Ensure absolute URL for apply link
        const absoluteApplyLink = job.applyLink?.startsWith('http') ? job.applyLink : `https://${job.applyLink}`;
        
        const waRes = await fetch(settings.whatsappWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message, 
            job_title: job.title, 
            job_url: jobUrl,
            // Standard button format for many WhatsApp API providers
            buttons: [
              { type: "url", text: "Apply Now", url: jobUrl },
              { type: "url", text: "View Details", url: jobUrl }
            ],
            // Alternative format for some providers
            cta_url: jobUrl,
            cta_text: "Apply Now"
          })
        });
        results.whatsapp = waRes.ok ? 'sent' : 'failed';
      }

      if (messaging) {
        const snapshot = await db.collection('subscriptions').where('topic', '==', 'jobs').get();
        const tokens = snapshot.docs.map(doc => doc.data().token).filter(Boolean);
        if (tokens.length > 0) {
          await messaging.sendEachForMulticast({
            tokens,
            notification: { title: `🚀 New Job: ${job.title}`, body: `Hiring at ${job.company}. Tap to apply!` },
            webpush: { notification: { icon: `${siteUrl}/logo192.png`, badge: `${siteUrl}/logo192.png` }, fcmOptions: { link: jobUrl } }
          });
          results.push = 'sent';
        }
      }

    } else if (broadcastType === 'product') {
        const prodDoc = await db.collection('products').doc(targetId).get();
        if (!prodDoc.exists) return res.status(404).json({ error: 'Product not found' });
        const prod = prodDoc.data();
        const prodUrl = `${siteUrl}/product/${targetId}`;
        const message = `🛍️ *New Deal on ${siteName}!*\n━━━━━━━━━━━━━━━━━━\n\n🔥 *${prod.fullTitle || prod.title}*\n💰 *Price:* ${prod.price}\n\n✨ *Shop Now:*\n${prodUrl}\n\n#Deals #Shopping #SmartChoose #${(prod.category || 'Deals').replace(/\s+/g, '')}`;

        if (settings.telegramBotToken && settings.telegramChannelId) {
          const tgRes = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: settings.telegramChannelId,
              photo: prod.images?.[0],
              caption: message,
              parse_mode: 'Markdown'
            })
          });
          const tgData = await tgRes.json();
          results.telegram = tgData.ok ? 'sent' : 'failed';
        }

        if (messaging) {
          const snapshot = await db.collection('subscriptions').where('topic', '==', 'products').get();
          const tokens = snapshot.docs.map(doc => doc.data().token).filter(Boolean);
          if (tokens.length > 0) {
            await messaging.sendEachForMulticast({
              tokens,
              notification: { title: `🛍️ New Deal: ${prod.title}`, body: `Price: ${prod.price}. Check it out!` },
              webpush: { notification: { icon: prod.images?.[0] || `${siteUrl}/logo192.png`, badge: `${siteUrl}/logo192.png` }, fcmOptions: { link: prodUrl } }
            });
            results.push = 'sent';
          }
        }
        await db.collection('products').doc(targetId).update({ broadcasted: true });
    }

    return res.status(200).json({ success: true, results });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
