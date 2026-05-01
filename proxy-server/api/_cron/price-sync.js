/**
 * SmartChoose Price Sync Cron Job
 * Frequency: Every 4 hours (via vercel.json)
 * Strategy: Update top 20 oldest products
 */

import { db } from '../_lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Browser-like headers
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
};

// Simplified parser for price only to keep cron fast
function extractPrice(html, platform) {
    let price = '';
    let originalPrice = '';

    if (platform === 'Amazon') {
        const pMatch = html.match(/class="a-price-whole">([^<]+)</i);
        if (pMatch) price = `₹${pMatch[1].replace(/[^\d]/g, '')}`;
        
        const sMatch = html.match(/class="a-text-price"[^>]*><span[^>]*>([^<]+)</i) || html.match(/class="a-text-strike">([^<]+)</i);
        if (sMatch) originalPrice = sMatch[1].replace(/\s+/g, '').trim();
    } else if (platform === 'Flipkart') {
        const pMatch = html.match(/class="Nx9bqj[^"]*">₹?([0-9,]+)/i);
        if (pMatch) price = `₹${pMatch[1].replace(/,/g, '')}`;
        
        const oMatch = html.match(/class="yRaY8j[^"]*">₹?([0-9,]+)/i);
        if (oMatch) originalPrice = `₹${oMatch[1].replace(/,/g, '')}`;
    }
    
    return { price, originalPrice };
}

async function fetchPage(url) {
    try {
        const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
        return await res.text();
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    // Security check
    const authHeader = req.headers['authorization'];
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log('🔄 Starting Daily Price Sync...');
        
        // 1. Get top 20 oldest products
        const productsSnapshot = await db.collection('products')
            .orderBy('lastPriceSync', 'asc')
            .limit(20)
            .get();

        if (productsSnapshot.empty) {
            return res.status(200).json({ message: 'No products to sync' });
        }

        const results = [];
        for (const doc of productsSnapshot.docs) {
            const product = doc.data();
            const id = doc.id;
            
            // Only sync Amazon and Flipkart
            const platform = product.platform || (product.affiliateLink?.includes('amazon') ? 'Amazon' : 'Flipkart');
            if (platform !== 'Amazon' && platform !== 'Flipkart') {
                await doc.ref.update({ lastPriceSync: FieldValue.serverTimestamp() });
                continue;
            }

            console.log(`⏳ Syncing [${platform}]: ${product.title.substring(0, 30)}...`);
            
            const html = await fetchPage(product.affiliateLink);
            if (!html) {
                results.push({ id, status: 'failed', reason: 'fetch_error' });
                await doc.ref.update({ lastPriceSync: FieldValue.serverTimestamp(), sync_error: 'Connection timeout' });
                continue;
            }

            const { price, originalPrice } = extractPrice(html, platform);
            
            if (price) {
                // Update product with new prices and timestamp
                await doc.ref.update({
                    price: price,
                    originalPrice: originalPrice || product.originalPrice,
                    lastPriceSync: FieldValue.serverTimestamp(),
                    sync_error: null
                });
                results.push({ id, status: 'success', oldPrice: product.price, newPrice: price });
            } else {
                await doc.ref.update({ lastPriceSync: FieldValue.serverTimestamp(), sync_error: 'Price not found on page' });
                results.push({ id, status: 'failed', reason: 'price_not_found' });
            }
            
            // Avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        return res.status(200).json({ 
            success: true, 
            total: results.length,
            synced: results.filter(r => r.status === 'success').length,
            details: results 
        });

    } catch (error) {
        console.error('❌ Price Sync Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
