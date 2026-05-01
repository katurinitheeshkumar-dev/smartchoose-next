export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' })
    }

    try {
        const { reelId, platforms } = req.body;

        if (!reelId || !platforms || !Array.isArray(platforms)) {
            return res.status(400).json({ error: 'Invalid Payload. Missing reelId or platforms array.' });
        }

        console.log(`[SmartChoose-Publisher] Starting Blast for Reel: ${reelId}`);

        // OPTION A: DIRECT API CALLS
        // If we were handling all 15+ APIs natively, we would map through platforms here and execute async functions.
        // Example:
        // if (platforms.includes('youtube')) await postToYoutube(reelMetadata);

        // OPTION B: n8n WEBHOOK BRIDGE
        // We send a single payload to our internal n8n cluster which handles the chaotic API rate limits and parallel processing.
        // We use the Railway absolute URL for the webhook (n8n usually expects test webhooks on /webhook-test/ and prod on /webhook/)

        const N8N_WEBHOOK_URL = process.env.N8N_MULTI_PUBLISHER_WEBHOOK || "https://n8n-production-bb3f.up.railway.app/webhook/publish-reel";


        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reelId,
                platforms,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) throw new Error("n8n publisher rejected the payload");


        // Simulate Success for now 
        console.log(`[SmartChoose-Publisher] Successfully forwarded Reel ${reelId} to n8n Queue.`);

        res.status(200).json({
            success: true,
            message: 'Reel Publication Queued',
            queuedPlatforms: platforms,
            handler: 'n8n_bridge'
        });

    } catch (error) {
        console.error('Publishing Error:', error);
        res.status(500).json({
            error: 'Failed to trigger automated publishing sequence.'
        });
    }
}
