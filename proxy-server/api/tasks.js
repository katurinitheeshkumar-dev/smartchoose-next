import { db } from './_lib/firebase-admin.js';
// We will import logic from the other files if needed, 
// but for simplicity on Vercel, we can just use a single entry point.

export default async function handler(req, res) {
  const { task } = req.query;

  try {
    if (task === 'price-sync') {
      // Logic from price-sync.js
      return res.status(200).json({ message: 'Price sync task triggered' });
    } else if (task === 'auto-index') {
      return res.status(200).json({ message: 'Auto index task triggered' });
    } else if (task === 'job-hunter') {
      return res.status(200).json({ message: 'Job hunter task triggered' });
    }
    
    return res.status(400).json({ error: 'Unknown task' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
