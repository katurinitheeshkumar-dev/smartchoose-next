import { db } from './_lib/firebase-admin.js';
import autoIndexHandler from './_cron/auto-index.js';

export default async function handler(req, res) {
  // Support both query and body for the task name
  const task = req.query.task || req.body?.task;

  try {
    // If it's an indexing trigger (manual from admin, instant from creation, or cron)
    if (task?.startsWith('auto-index') || req.headers['x-admin-trigger'] === 'true' || req.body?.url) {
      return await autoIndexHandler(req, res);
    } 
    
    if (task === 'price-sync') {
      return res.status(200).json({ message: 'Price sync task triggered' });
    } else if (task === 'job-hunter') {
      return res.status(200).json({ message: 'Job hunter task triggered' });
    } else if (task === 'blog-bot') {
      const blogHelper = await import('./ai-blog-helper.js');
      return await blogHelper.default(req, res);
    }
    
    return res.status(400).json({ error: 'Unknown task' });
  } catch (err) {
    console.error('Task error:', err);
    return res.status(500).json({ error: err.message });
  }
}
