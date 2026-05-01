const FIREBASE_PROJECT = 'smartchoose-official';

// Add or update a document in Firestore via REST (using update with documentId)
async function firestoreSet(collection, documentId, data) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/${collection}/${documentId}`;

    // Convert flat JS object to Firestore format
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') fields[k] = { booleanValue: v };
        else if (typeof v === 'number') fields[k] = { integerValue: v };
        else if (Array.isArray(v)) fields[k] = { arrayValue: { values: v.map(item => ({ stringValue: item })) } };
        else fields[k] = { stringValue: String(v) };
    }

    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields })
    });

    if (!res.ok) {
        const err = await res.text();
        console.error(`[Firestore Set Error] ${collection}/${documentId}:`, err);
    }
}

export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Date');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
        const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '26008012058890433';

        if (!ACCESS_TOKEN || !IG_ACCOUNT_ID) {
            return res.status(400).json({ error: 'Missing Instagram Credentials in Server Configuration' });
        }

        console.log(`[Sync-Reels] Fetching media for account: ${IG_ACCOUNT_ID}`);

        // 1. Fetch media from Instagram Graph API
        const igUrl = `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=20&access_token=${ACCESS_TOKEN}`;
        const igRes = await fetch(igUrl);
        const data = await igRes.json();

        if (data.error) {
            console.error('[IG API Error]', data.error);
            return res.status(500).json({ error: data.error.message || 'Failed to fetch from Instagram' });
        }

        const mediaList = data.data || [];
        const reels = mediaList.filter(m => m.media_type === 'VIDEO');

        console.log(`[Sync-Reels] Found ${reels.length} video reels.`);
        let syncedCount = 0;

        // 2. Add or update reels in Firebase
        for (const reel of reels) {
            // Generate basic tags from caption
            const caption = reel.caption || 'Instagram Reel';
            const tags = caption.match(/#\w+/g) || [];
            const cleanTags = tags.map(t => t.replace('#', ''));

            const reelData = {
                title: caption.substring(0, 50) + (caption.length > 50 ? '...' : ''),
                description: caption,
                tags: cleanTags,
                videoUrl: reel.media_url || reel.permalink,
                thumbnailUrl: reel.thumbnail_url || '',
                productLink: '', // Will be assigned by user later
                platformLink: reel.permalink,
                category: 'Instagram',
                featured: false,
                published: true, // Already published on IG
                views: 0,
                likes: 0,
                clicks: 0,
                comments: 0,
                shares: 0,
                createdAt: reel.timestamp || new Date().toISOString(),
                // Link it specifically to this post ID
                platformPostId: reel.id
            };

            // Use the IG Media ID as the document ID for uniqueness
            const cleanId = `ig_${reel.id}`;
            await firestoreSet('reels', cleanId, reelData);

            // Ensure there is a publication link so the Webhook can find it later
            const pubId = `pub_${reel.id}`;
            await firestoreSet('reelPublications', pubId, {
                reelId: cleanId,
                platform: 'instagram',
                status: 'published',
                publishedAt: reel.timestamp,
                platformPostId: reel.id,
                platformUrl: reel.permalink
            });

            syncedCount++;
        }

        return res.status(200).json({
            success: true,
            message: `Successfully synced ${syncedCount} reels.`,
            count: syncedCount
        });

    } catch (error) {
        console.error('[Sync-Reels Error]', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
