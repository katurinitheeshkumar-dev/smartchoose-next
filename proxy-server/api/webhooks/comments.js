// SmartChoose Webhook — Full Auto DM Engine
// Flow: Meta comment event → Firebase lookup → keyword match → send DM with correct product link

const FIREBASE_PROJECT = 'smartchoose-official';
const FIREBASE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

// Query Firestore via REST (no SDK needed on Vercel serverless)
async function firestoreQuery(collection, field, operator, value) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents:runQuery`;
    const body = {
        structuredQuery: {
            from: [{ collectionId: collection }],
            where: {
                fieldFilter: {
                    field: { fieldPath: field },
                    op: operator,
                    value: typeof value === 'boolean'
                        ? { booleanValue: value }
                        : { stringValue: value }
                }
            },
            limit: 1
        }
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    // Extract documents from Firestore response
    return (data || []).filter(d => d.document).map(d => {
        const fields = d.document.fields || {};
        const doc = { _id: d.document.name.split('/').pop() };
        for (const [k, v] of Object.entries(fields)) {
            doc[k] = v.stringValue ?? v.booleanValue ?? v.integerValue ?? v.arrayValue?.values?.map(a => a.stringValue) ?? null;
        }
        return doc;
        return doc;
    });
}

// Add or update a document in Firestore via REST (using update with documentId)
async function firestoreSet(collection, documentId, data) {
    // Using patch to act as upsert (like set with merge:true)
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

// Automatically sync new newly published Reel via Webhook
async function syncNewReel(mediaData, accessToken) {
    console.log(`[Auto-Sync] Syncing new reel: ${mediaData.id}`);

    // Webhook doesn't always contain the full media object. We might need to fetch it.
    // Try to get the caption and url directly, otherwise fetch from Graph API.
    let reel = { ...mediaData };

    if (!reel.media_url || !reel.permalink) {
        try {
            const igUrl = `https://graph.facebook.com/v19.0/${mediaData.id}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${accessToken}`;
            const igRes = await fetch(igUrl);
            const igData = await igRes.json();
            if (!igData.error) {
                reel = igData;
            }
        } catch (e) {
            console.error('[IG Graph API Fetch Error]', e);
        }
    }

    if (reel.media_type !== 'VIDEO') {
        console.log(`[Auto-Sync] Skipped - not a video (${reel.media_type})`);
        return;
    }

    const caption = reel.caption || 'Instagram Reel';
    const tags = caption.match(/#\w+/g) || [];
    const cleanTags = tags.map(t => t.replace('#', ''));

    const cleanId = `ig_${reel.id}`;

    // 1. Save Reel to Database
    await firestoreSet('reels', cleanId, {
        title: caption.substring(0, 50) + (caption.length > 50 ? '...' : ''),
        description: caption,
        tags: cleanTags,
        videoUrl: reel.media_url || reel.permalink || '',
        thumbnailUrl: reel.thumbnail_url || '',
        productLink: '',
        platformLink: reel.permalink || '',
        category: 'Instagram',
        featured: false,
        published: true,
        views: 0,
        likes: 0,
        clicks: 0,
        comments: 0,
        shares: 0,
        createdAt: reel.timestamp || new Date().toISOString(),
        platformPostId: reel.id
    });

    // 2. Create Publication Tracker
    await firestoreSet('reelPublications', `pub_${reel.id}`, {
        reelId: cleanId,
        platform: 'instagram',
        status: 'published',
        publishedAt: reel.timestamp || new Date().toISOString(),
        platformPostId: reel.id,
        platformUrl: reel.permalink || ''
    });

    console.log(`[Auto-Sync Success] Saved Reel ${cleanId}`);
}

// Check Firestore if we already sent DM to this user for this reel (anti-spam)
async function hasAlreadySentDM(userId, reelId) {
    const results = await firestoreQuery('automationLogs', 'userId', 'EQUAL', userId);
    return results.some(r => r.reelId === reelId);
}

// Save a log record to prevent duplicate DMs
async function logDM(userId, reelId, platform) {
    const url = `${FIREBASE_BASE}/automationLogs`;
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                userId: { stringValue: userId },
                reelId: { stringValue: reelId },
                platform: { stringValue: platform },
                sentAt: { stringValue: new Date().toISOString() }
            }
        })
    });
}

// Send the DM via Meta Graph API
async function sendInstagramDM(userId, message, accessToken, instagramAccountId) {
    const url = `https://graph.facebook.com/v19.0/${instagramAccountId}/messages`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            recipient: { id: userId },
            message: { text: message }
        })
    });
    const result = await res.json();
    console.log('[DM Result]', JSON.stringify(result));
    return result;
}

// Reply to the comment publicly
async function replyToComment(commentId, message, accessToken) {
    const url = `https://graph.facebook.com/v19.0/${commentId}/replies`;
    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ message })
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST,GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Date');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // ── META WEBHOOK VERIFICATION (GET) ──
    if (req.method === 'GET') {
        const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
        const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'smartchoose_automation_token_123';
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return res.status(200).send(challenge);
        }
        return res.status(403).send('Verification Failed');
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Ensure access token is available for operations
    const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
    const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID || '26008012058890433';

    if (!ACCESS_TOKEN) {
        console.error('[Missing INSTAGRAM_ACCESS_TOKEN env variable]');
        return res.status(200).send('EVENT_RECEIVED_CONFIG_ERROR');
    }

    // ── PROCESS META WEBHOOK EVENT ──
    try {
        const payload = req.body;
        console.log('[Webhook Event Payload]', JSON.stringify(payload));

        const entry = payload.entry?.[0];
        const change = entry?.changes?.[0];

        if (!change || !change.value) {
            return res.status(200).send('EVENT_RECEIVED');
        }

        // ==========================================
        // ROUTE 1: NEW MEDIA (AUTO-SYNC REEL)
        // ==========================================
        if (change.field === 'media') {
            const mediaValue = change.value;
            // Sometimes it's passed directly or as a media object
            const mediaObj = mediaValue.media_id ? { id: mediaValue.media_id } : mediaValue;
            await syncNewReel(mediaObj, ACCESS_TOKEN);
            return res.status(200).send('EVENT_RECEIVED');
        }

        // ==========================================
        // ROUTE 2: COMMENTS (AUTO DM EVENT)
        // ==========================================
        if (change.field === 'comments') {
            const commentValue = change.value;
            if (!commentValue?.text) return res.status(200).send('EVENT_RECEIVED');

            const commentText = commentValue.text.toLowerCase().trim();
            const platformPostId = commentValue.media?.id || commentValue.post_id || '';
            const userId = commentValue.from?.id || '';
            const commentId = commentValue.id || '';

            console.log(`[Comment Routing] POST:${platformPostId} USER:${userId} TEXT:"${commentText}"`);

            // ─── STEP 1, 2, 4: Parallelize Data Lookups ───
            const [publications, automations, allReels] = await Promise.all([
                firestoreQuery('reelPublications', 'platformPostId', 'EQUAL', platformPostId),
                firestoreQuery('commentAutomations', 'platformPostId', 'EQUAL', platformPostId), // Fallback to post ID match
                firestoreQuery('reels', 'platformPostId', 'EQUAL', platformPostId)
            ]);

            if (!publications.length && !allReels.length) {
                console.log('[No reel/publication found for post]', platformPostId);
                return res.status(200).send('EVENT_RECEIVED');
            }

            const reelId = publications[0]?.reelId || allReels[0]?._id;
            console.log('[Found Reel ID]', reelId);

            // Fetch specific automation for this reel if not found by platformPostId
            let automation = automations[0];
            if (!automation) {
                const reelAutomations = await firestoreQuery('commentAutomations', 'reelId', 'EQUAL', reelId);
                automation = reelAutomations[0];
            }

            if (!automation) {
                console.log('[No automation for reel]', reelId);
                return res.status(200).send('EVENT_RECEIVED');
            }
            if (!automation.isEnabled) {
                console.log('[Automation disabled]');
                return res.status(200).send('EVENT_RECEIVED');
            }

            // ─── STEP 3: Check keyword match ───
            const keywords = Array.isArray(automation.triggerKeywords)
                ? automation.triggerKeywords
                : ['link', 'price', 'buy'];

            const matched = keywords.some(kw => commentText.includes(kw.toLowerCase()));
            if (!matched) {
                console.log('[No keyword match]', commentText, keywords);
                return res.status(200).send('EVENT_RECEIVED');
            }

            // ─── STEP 4: Get product details ───
            const reelData = allReels.find(r => r._id === reelId) || (await firestoreQuery('reels', '__name__', 'EQUAL', reelId))[0];
            const productId = reelData?.productLink || automation.productId || '';

            // Build the product URL safely
            let productUrl = 'https://smartchoose-official.web.app';
            if (productId) {
                if (productId.startsWith('http')) {
                    productUrl = productId;
                } else {
                    productUrl = `https://smartchoose-official.web.app/product/${productId}`;
                }
            }

            // ─── STEP 5: Anti-spam check ───
            const alreadySent = await hasAlreadySentDM(userId, reelId);
            if (alreadySent) {
                console.log('[DM already sent to user]', userId);
                return res.status(200).send('EVENT_RECEIVED');
            }

            // ─── STEP 6: Build DM message from template ───
            const template = automation.replyTemplate ||
                '👋 Thanks for commenting!\n\n🛍️ Here is the product link:\n{product_link}\n\nShop smart with SmartChoose! 🚀';
            const dmMessage = template.replace('{product_link}', productUrl);

            // ─── STEP 7: Send DM + Public Comment Reply ───
            // Send DM
            await sendInstagramDM(userId, dmMessage, ACCESS_TOKEN, IG_ACCOUNT_ID);

            // Public comment reply (optional)
            if (commentId) {
                await replyToComment(commentId, '📩 Sent you a DM with the product link!', ACCESS_TOKEN);
            }

            // Log to prevent duplicates
            await logDM(userId, reelId, 'instagram');

            console.log(`[Done] Comment DM routing finalized`);
        }

    } catch (error) {
        console.error('[Main Webhook Error]', error);
        return res.status(200).send('EVENT_RECEIVED_WITH_ERROR');
    }
}

