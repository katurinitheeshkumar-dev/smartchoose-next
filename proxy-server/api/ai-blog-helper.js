const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'smartchoose-official';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
// GROQ_API_KEY removed (unsupported in future)

function fromFirestore(doc) {
    if (!doc || !doc.fields) return null;
    try {
        const data = { id: doc.name ? doc.name.split('/').pop() : 'unknown' };
        for (const [k, v] of Object.entries(doc.fields)) {
            if (v.stringValue !== undefined) data[k] = v.stringValue;
            else if (v.booleanValue !== undefined) data[k] = v.booleanValue;
            else if (v.integerValue !== undefined) data[k] = parseInt(v.integerValue);
            else if (v.doubleValue !== undefined) data[k] = parseFloat(v.doubleValue);
            else if (v.arrayValue?.values) {
                data[k] = v.arrayValue.values.map(item => {
                    if (item.stringValue !== undefined) return item.stringValue;
                    if (item.mapValue) return fromFirestore({ name: '', fields: item.mapValue.fields });
                    return null;
                }).filter(Boolean);
            }
            else if (v.mapValue) {
                const mapData = fromFirestore({ name: '', fields: v.mapValue.fields });
                if (mapData) data[k] = mapData;
            }
        }
        return data;
    } catch (e) { return null; }
}

function toFirestore(data) {
    const fields = {};
    if (!data || typeof data !== 'object') return { fields };
    for (const [k, v] of Object.entries(data)) {
        if (v === null || v === undefined) continue;
        try {
            if (typeof v === 'boolean') fields[k] = { booleanValue: v };
            else if (typeof v === 'number') fields[k] = { doubleValue: v };
            else if (Array.isArray(v)) {
                fields[k] = {
                    arrayValue: {
                        values: v.map(item => {
                            if (item && typeof item === 'object') return { mapValue: toFirestore(item) };
                            if (typeof item === 'boolean') return { booleanValue: item };
                            if (typeof item === 'number') return { doubleValue: item };
                            return { stringValue: String(item) };
                        })
                    }
                };
            } else if (v && typeof v === 'object') {
                fields[k] = { mapValue: toFirestore(v) };
            } else {
                fields[k] = { stringValue: String(v) };
            }
        } catch (e) { console.warn(`[toFirestore] Error in ${k}:`, e.message); }
    }
    return { fields };
}


const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_KEY = 'AIzaSyD7kWC8z8q77xLiyP49GiZJohqh-MuIXfE';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const FUTURE_YEAR = new Date().getFullYear() + (new Date().getMonth() > 9 ? 1 : 0); // Always target current or next year

async function callGemini(prompt) {
    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
            })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini returned no content');
        try {
            // Try to find JSON in the response if needed, but for simple queries we just return text
            if (text.includes('{')) {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
            }
            return text.trim();
        } catch (e) { return text.trim(); }
    } catch (e) {
        console.error('[callGemini] Error:', e.message);
        return null;
    }
}

async function callAI(prompt) {
    try {
        const res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${GROQ_API_KEY}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are an expert AI editor. Always return ONLY a raw JSON object. Do not wrap in markdown blocks like ```json." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });
        
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`AI Overloaded: ${res.status} ${err}`);
        }
        
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        
        try {
            return JSON.parse(content);
        } catch (e) {
            console.warn('[callAI] JSON.parse failed, raw content:', content);
            throw new Error('AI returned malformed JSON');
        }
    } catch (e) { 
        console.error('[callAI] Error:', e.message);
        return { error: e.message }; 
    }
}

function sanitizeSlug(text) {
    if (!text) return `post-${Date.now()}`;
    return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

function stripHTML(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Robustly extracts string content from potential AI response formats
 */
function deepExtractContent(val) {
    if (!val) return "";
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.join('\n\n');
    if (typeof val === 'object' && val.content) return deepExtractContent(val.content);
    if (typeof val === 'object' && val.text) return deepExtractContent(val.text);
    return String(val);
}

function normalizedGet(obj, keys) {
    if (!obj || typeof obj !== 'object') return "";
    for (const k of keys) {
        if (obj[k]) return obj[k];
        // Check snake_case
        const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        if (obj[snake]) return obj[snake];
        // Check PascalCase
        const pascal = k.charAt(0).toUpperCase() + k.slice(1);
        if (obj[pascal]) return obj[pascal];
    }
    return "";
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const action = req.query.action || req.body?.action;
        let finalPost = null;

        if (action === 'automate-trending-blog') {
            const types = ['value', 'product', 'deals'];
            const activeType = req.query.type || types[Math.floor(Math.random() * types.length)];
            const isAutoPilot = req.query.mode === 'autopilot' || action === 'autopilot';
            const isValue = activeType === 'value';
            const isProduct = activeType === 'product';
            
            // Research Topic First
            let avoidStr = "";
            try {
                const postRes = await fetch(`${BASE_URL}/blogPosts?pageSize=20`);
                const postData = await postRes.json();
                const recentPosts = (postData.documents || []).map(fromFirestore).map(p => p.title).filter(Boolean);
                if (recentPosts.length > 0) avoidStr = `DO NOT WRITE ABOUT THESE RECENT TOPICS: ${recentPosts.join(', ')}`;
            } catch (e) {}

            let nicheFocus = activeType === 'product' ? "High buyer-intent budget product query featuring 'Best', 'Top', or 'Under ₹X' (e.g., Under 1500, Under 15000, Under 30000)." 
                : activeType === 'deals' ? "Rapid trending limited-time deal or intense discount occurring right now in India."
                : "Highly viral informational 'How-to', 'Hacks', or gadget maintenance guides for common household tech.";
            
            // Research Existing Products for Internal Linking
            let productContext = "";
            try {
                const prodRef = await fetch(`${BASE_URL}/products?pageSize=20`);
                const prodData = await prodRef.json();
                const availableProds = (prodData.documents || []).map(fromFirestore).filter(p => p.published);
                if (availableProds.length > 0) {
                    productContext = `We have these verified products in our catalog. If relevant, mention 1-2 of them naturally in the article content and link to them using this format: <a href="/product/PRODUCT_ID">PRODUCT_TITLE</a>. \nPRODUCTS: ${availableProds.map(p => `${p.title} (ID: ${p.id})`).join(', ')}`;
                }
            } catch (e) {
                console.warn('[Internal Linking] Failed to fetch products:', e.message);
            }
          const topicPrompt = `Identify a HIGH-VOLUME, practical 2024-2026 tech or lifestyle topic for SmartChoose.in. 
                Focus: ${nicheFocus}. 
                
                STRICT NICHE CONSTRAINTS:
                - ALLOWED CATEGORIES: Mobiles, Earbuds, Laptops, Smartwatches, Kitchen Gadgets, Home Appliances, Power Banks.
                - HARD BANNED WORDS: Holographic, Quantum, Sci-fi, Future, Concept, Projection, 2030-2050, Space, Fantasy.
                - TARGET: Middle-class Indian budget buyers searching for value.

                Random Seed: ${Math.random()}. ${avoidStr}. 
                SCORING ENGINE: Internally score 3 topics on:
                1. Traffic Potential (0-10)
                2. Competition (0-10) [Score 10 = low competition]
                3. Buyer Intent (0-10) [Score 10 = High Purchase Intent]
                Return ONLY the winning topic with Total Score >= 20. 
                RETURN ONLY JSON: {"title": "Real Product Guide (e.g. Best 5G Phone under 15k)", "scores": {"traffic": 9, "competition": 8, "intent": 10}, "total_score": 27}`;
            const topicRes = await callAI(topicPrompt);
            const chosenTopic = topicRes?.title || 'Tech Trends 2026';

            let contentPrompt = "";
            if (activeType === 'product') {
                contentPrompt = `Acting as a Senior Tech Authority for SmartChoose.in, write a 2000-2500 word ULTIMATE BUYER'S GUIDE for: "${chosenTopic}".
                - TARGET AUDIENCE: Budget-conscious Indian consumers. Use Rupee (₹) symbols.
                - STRUCTURE: 
                  1. Catchy Intro (300 words)
                  2. "Why This Matters Now" (200 words)
                  3. Deep Specs Breakdown & Comparison (800 words)
                  4. Expert Verdict (200 words)
                - CRITICAL: DO NOT include the numbered list of products in the "content" HTML field. 
                - Internal Linking: ${productContext || 'Mention "Check our best mobile deals..." naturally.'}
                RETURN ONLY JSON: { "title": "...", "intro": "...", "content": "HTML_STRING", "category": "Reviews", "seoTitle": "...", "seoDescription": "...", "tags": ["tag1",...], "products": [{"name": "...", "price": "₹...", "description": "...", "pros": ["Pro 1", "Pro 2"], "productLink": "https://..."}] }`;
            } else if (activeType === 'deals') {
                contentPrompt = `Acting as a Rapid Deal Hunter, write a 1200-1500 word URGENT DEAL ALERT for: "${chosenTopic}".
                - TONE: High urgency, scarcity, and value-focused.
                - CRITICAL: DO NOT include the product list in the "content" HTML field.
                RETURN ONLY JSON: { "title": "...", "intro": "...", "content": "HTML_STRING", "category": "Deals", "seoTitle": "...", "seoDescription": "...", "tags": ["tag1",...], "products": [{"name": "...", "price": "₹...", "description": "...", "pros": [], "productLink": "https://..."}] }`;
            } else {
                contentPrompt = `Acting as a Senior Editorial Journalist, write a 1800-2200 word COMPREHENSIVE GUIDE for: "${chosenTopic}". 
                - CONTENT: Deep-dive Pro-Tips, 10+ Practical Hacks, and a Mega FAQ section (8+ questions).
                - READABILITY: Grade 8 English.
                - SEO: Use H1, H2, H3 tags and keyword-rich headers.
                RETURN ONLY JSON: { "title": "...", "intro": "...", "content": "HTML_STRING", "category": "Guides", "seoTitle": "...", "seoDescription": "...", "tags": ["tag1",...], "keywords": ["keyword1",...] }`;
            }

            let result = await callAI(contentPrompt);
            if (!result || result.error) throw new Error(result?.error || "AI Generation Failed");

            const topicTitle = result.title || (isValue ? "Smart Life Hacks for 2026" : "Best Gadgets of 2026");
            const stableSlug = sanitizeSlug(topicTitle);

            // NEW: Use Gemini to find the absolute BEST image keywords for "Real" products
            const imageQueryPrompt = `Identify the main product or tech setup for this blog: "${topicTitle}". 
            Generate a single "Real-world Product Photography" search query (NOT generic keywords). 
            Example: "Real photo of OnePlus 12R blue color Indian retail box setup". 
            RETURN ONLY THE QUERY STRING.`;
            
            const rawKeywords = await callGemini(imageQueryPrompt) || topicTitle;
            const isAuto = action === 'autopilot';
            
            finalPost = {
                ...result,
                id: stableSlug,
                slug: stableSlug,
                type: activeType,
                title: stripHTML(topicTitle),
                category: stripHTML(result.category || (activeType === 'deals' ? 'Deals' : isValue ? 'Tips' : 'Guides')),
                intro: deepExtractContent(result.intro),
                content: deepExtractContent(result.content),
                seoTitle: stripHTML(normalizedGet(result, ['seoTitle', 'metaTitle', 'title']) || topicTitle),
                seoDescription: stripHTML(normalizedGet(result, ['seoDescription', 'metaDescription', 'description', 'summary'])),
                metaDescription: stripHTML(normalizedGet(result, ['seoDescription', 'metaDescription', 'description', 'summary'])),
                tags: Array.isArray(result.tags) ? result.tags : (result.tags ? String(result.tags).split(',').map(s => s.trim()) : []),
                featuredImage: `https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop&keywords=${encodeURIComponent(rawKeywords)}`,
                status: isAuto ? 'draft' : 'published',
                template: isValue ? 'guide' : 'standard',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                products: (result.products || []).map((p, i) => ({
                    id: `ai-prod-${Date.now()}-${i}`,
                    name: p.name,
                    price: p.price,
                    image: `https://source.unsplash.com/800x600/?${encodeURIComponent(p.imageHint || p.name || 'gadget')}`,
                    description: p.description,
                    pros: p.pros || [],
                    affiliateLink: p.productLink || '',
                    smartChooseId: ''
                }))
            };
        } else if (action === 'automate-full-blog') {
            // Enhanced Product Review (Drafted from existing products)
            const prodRes = await fetch(`${BASE_URL}/products?pageSize=10`);
            const prodData = await prodRes.json();
            const available = (prodData.documents || []).map(fromFirestore).filter(p => p && p.published);
            if (available.length === 0) throw new Error('No products available');
            const product = available[Math.floor(Math.random() * available.length)];

            const prompt = `Acting as a Senior Tech & Lifestyle Journalist, write a 1500-2000 word review.
            - CRITICAL: DO NOT include the product specifications or list in the "content" HTML field. 
            RETURN ONLY JSON: { "title": "...", "intro": "...", "content": "HTML_STRING", "category": "Reviews", "seoTitle": "...", "seoDescription": "...", "tags": ["tag1",...] }.
            Start immediately with {`;
            
            const generated = await callAI(prompt);
            if (!generated || generated.error) throw new Error(generated?.error || "AI Generation Failed");

            const blogSlug = sanitizeSlug(generated.title || product.title);
            finalPost = {
                ...generated,
                id: blogSlug,
                slug: blogSlug,
                type: 'product',
                title: stripHTML(generated.title || product.title),
                category: stripHTML(generated.category || 'Reviews'),
                intro: deepExtractContent(generated.intro),
                content: deepExtractContent(generated.content),
                metaDescription: stripHTML(generated.metaDescription || generated.seoDescription || ''),
                tags: Array.isArray(generated.tags) ? generated.tags : (generated.tags ? String(generated.tags).split(',').map(s => s.trim()) : []),
                featuredImage: `https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop&keywords=${encodeURIComponent(generated.featuredImagePrompt || product.title)}`,
                status: 'published',
                template: 'standard',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                products: [{
                    id: product.id,
                    name: product.title,
                    price: product.price,
                    image: product.images?.[0] || '',
                    description: product.description?.slice(0, 150),
                    pros: product.pros || [],
                    affiliateLink: product.affiliateLink || product.affiliateLinks?.[0]?.url || '',
                    smartChooseId: product.id
                }]
            };
        } else if (action === 'get-unblogged') {
            // Support for n8n automation
            const prodRes = await fetch(`${BASE_URL}/products?pageSize=100`);
            const prodData = await prodRes.json();
            const available = (prodData.documents || []).map(fromFirestore).filter(p => p && p.published);
            
            // Just return a random product to blog about
            if (available.length === 0) return res.status(404).json({ error: 'No products' });
            return res.status(200).json({ product: available[Math.floor(Math.random() * available.length)] });

        } else if (action === 'autopilot') {
            // Trigger a high-quality trending post automatically with Full SEO word counts
            const types = ['value', 'product']; // Prefer high volume or high intent for autopilot
            const type = types[Math.floor(Math.random() * types.length)];
            return res.redirect(307, `${req.url.split('?')[0]}?action=automate-trending-blog&type=${type}&mode=autopilot`);
        } else if (action === 'get-topic') {
            // STEP 1: Research Practical Trending Topic (Indian Budget Tech-Focused Consumers)
            const { type } = req.query;

            let avoidStr = "";
            try {
                const postRes = await fetch(`${BASE_URL}/blogPosts?pageSize=20`);
                const postData = await postRes.json();
                const recentPosts = (postData.documents || []).map(fromFirestore).map(p => p.title).filter(Boolean);
                if (recentPosts.length > 0) {
                    avoidStr = `CRITICAL INSTRUCTION: You MUST absolutely NOT write about any of these recently published topics: ${recentPosts.join(', ')}. Pick something completely new.`;
                }
            } catch (e) {}

            let nicheFocus = type === 'product' ? "High buyer-intent budget product query featuring 'Best', 'Top', or 'Under ₹X' for Mobile, Audio, or Home Gadgets." 
                : type === 'deals' ? "Immediate deal alerts and flash sales for smartphones, laptops, or smart gadgets on Amazon/Flipkart India."
                : "Practical technical hacks or optimization guides for everyday gadgets (e.g., improve smartphone battery, fix slow WiFi, calibrate 4k TV, smart home energy saving).";

            const resTopic = await callAI(`Identify a HIGH-INTENT, practical 2024-2026 Indian CONSUMER TECHNOLOGY or GADGET topic for SmartChoose.in. 
                
                STRICT NICHE CONSTRAINTS: 
                - Target: ONLY Smart Gadgets, Consumer Electronics, and Home Appliances.
                - ALLOWED CATEGORIES: Mobiles, Earbuds, Laptops, Smartwatches, Kitchen Tech, Home Appliances, Power Banks.
                - HARD BANNED WORDS: Holographic, Quantum, Sci-fi, Future, Concept, Projection, 2030-2050, Space, Fantasy.
                - DO NOT suggest futuristic or unreleased tech.

                REQUIRED FOCUS: 
                - Middle-class Indian consumers looking for value and budget tech gear.
                - Niche Focus: ${nicheFocus}
                - Random Seed: ${Math.random()}
                ${avoidStr}
                
                You MUST perform Topic Scoring internally. Generate 3 topics and score each on:
                1. Product Relevance/Store-Fit (0-10) [MUST be high-intent gadgets]
                2. Search Volume (India) (0-10)
                3. Ease of Ranking (0-10) [Higher = Lower competition]
                4. Buyer Intent (0-10) [Score 10 = Direct path to a Product Sale]
                
                Calculate Total Score. Select the ONE topic with highest combined score (Must be gadget-centric).

                RETURN ONLY JSON for the WINNING topic:
                { 
                  "title": "Practical GADGET-CENTRIC Title (e.g. 5 Best Noise Cancelling Earbuds Under ₹1500 for Students)", 
                  "reason": "Expert justification of why this topic will drive affiliate sales and fits the tech store niche", 
                  "scores": {
                    "traffic": 9,
                    "competition": 8,
                    "intent": 10
                  },
                  "total_score": 27,
                  "keywords": ["...",...] 
                }`);

            if (resTopic?.error) return res.status(500).json({ success: false, error: resTopic.error });
            return res.status(200).json({ success: true, topic: resTopic });

        } else if (action === 'get-draft') {
            // STEP 2: Generate Practical Draft from Topic (Tech-Lifestyle Tone)
            let { title, type } = req.query;

            // Step 2a: If custom, optimize SEO Title first
            if (type === 'custom') {
                const seoRes = await callAI(`Optimize this GADGET title for an Indian budget-conscious buyer. RAW: "${title}". Use power words. RETURN ONLY JSON: { "seoTitle": "Improved Title..." }`);
                if (!seoRes?.error && seoRes?.seoTitle) {
                    title = seoRes.seoTitle;
                }
                type = 'value'; // Fallback to guide layout for custom topics
            }

            let contentPrompt = "";
            if (type === 'product') {
                contentPrompt = `Acting as a Senior Tech Reviewer for SmartChoose, write a 2000-2500 word ULTIMATE BUYER'S GUIDE for: "${title}". 
                RULES: 
                - Tone: Expert, tech-focused, and budget-conscious.
                - Structure: Problem -> Indian Budget Solution -> Top 5 Gadget recommendations with deep specification breakdowns.
                - Include exactly: a "Top Benefits" list, a "Performance Comparison Table", and a "Final SmartChoose Verdict".
                - CRITICAL: DO NOT include Cons or Disadvantages.
                - Include internal linking placeholders (e.g. [LINK TO RELATED TOPIC]).
                - CTA MUST BE PRESENT: Buy Now, Check Latest Price.
                - PRODUCT SECTION: Explicitly mention Image, Title, Price, and Rating.
                - Explicitly use Rupee (₹) pricing.
                - STRUCTURED PRODUCTS: You MUST generate 5 products as a JSON array in the "products" field. 
                - Each product object should have: "name", "price" (in ₹), "description" (2-3 sentences), "pros" (array), "imageHint" (keyword for unsplash).
                RETURN ONLY JSON: { 
                    "title": "${title}", 
                    "intro": "...", 
                    "content": "HTML_STRING", 
                    "category": "Reviews", 
                    "tags": [...],
                    "products": [
                        { "name": "...", "price": "₹...", "description": "...", "pros": [...], "cons": [...], "imageHint": "..." },
                        ...
                    ]
                }.`;
            } else if (type === 'deals') {
                contentPrompt = `Acting as an expert Gadget Deal Hunter, write a 1000-1500 word URGENT DEAL ALERT for: "${title}". 
                RULES:
                - Focus on specific tech discounts (e.g. ₹2000 price drop).
                - Use urgent tone: "Hurry!", "Limited Time Deal".
                - Detail: Elaborate significantly on WHY this price drop is rare.
                - FAQ: Include 5 questions about the warranty and price history.
                RETURN ONLY JSON: { "title": "${title}", "intro": "...", "content": "HTML_STRING", "category": "Deals", "tags": [...] }.`;
            } else {
                contentPrompt = `Acting as a Senior Tech Lifestyle Editor, write a 1800-2200 word COMPREHENSIVE GADGET GUIDE for: "${title}". 
                RULES:
                - READABILITY: Use Grade 6-8 Simple English.
                - Structure: Deep analysis of smart hacks, usage scenarios, and 10+ bulleted optimization tips.
                - NEW: Add "Mega FAQ Section" with at least 8 detailed questions.
                - Focus: Solving a technical or lifestyle problem using gear.
                - NO general life advice. Stay within Smart Home / Tech Gear / Mobile optimization.
                RETURN ONLY JSON: { "title": "${title}", "intro": "...", "content": "HTML_STRING", "category": "Tips", "tags": [...] }.`;
            }

            const result = await callAI(contentPrompt);
            if (result?.error) return res.status(500).json({ success: false, error: result.error });
            
            // Re-inject custom improved title
            if (req.query.type === 'custom') result.title = title;

            return res.status(200).json({ success: true, draft: result });

        } else if (action === 'save-post') {
            // STEP 3: Finalize & Save
            const post = req.body;
            const docId = sanitizeSlug(post.title);
            const finalPost = {
                ...post,
                id: docId,
                slug: docId,
                status: 'published',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await fetch(`${BASE_URL}/blogPosts/${docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toFirestore(finalPost))
            });
            return res.status(200).json({ success: true, blogId: docId });

        } else if (action === 'extract-job-details') {
            // STEP 5: AI Job Extraction (Magic Fill)
            const { text } = req.body;
            if (!text) return res.status(400).json({ error: 'No text provided' });

            const prompt = `Extract job details from the following text into a structured JSON. 
            TEXT: """${text}"""
            
            RETURN ONLY JSON in this format:
            {
              "title": "Clean Job Title",
              "company": "Company Name",
              "location": "City, State or Remote",
              "type": "Full-time | Part-time | Contract | Remote",
              "salary": "₹ Amount if mentioned, otherwise leave empty",
              "description": "Short 2-3 sentence summary of the job",
              "category": "Pick best from: IT & Software, Marketing & Sales, Healthcare, Education, Finance, Govt Jobs, Engineering, Remote / Freelance, Others"
            }`;
            
            let jobDetails = await callAI(prompt);
            
            // Fallback to Gemini if Groq fails
            if (!jobDetails || jobDetails.error) {
                console.log('[MagicFill] Falling back to Gemini...');
                const geminiRes = await callGemini(prompt + "\nIMPORTANT: Return ONLY raw JSON.");
                if (geminiRes && typeof geminiRes === 'object') {
                    jobDetails = geminiRes;
                }
            }

            if (!jobDetails || jobDetails.error) return res.status(500).json({ success: false, error: jobDetails?.error || 'AI Extraction Failed' });
            return res.status(200).json({ success: true, jobDetails });

        } else if (action === 'increment-view') {
            // STEP 4: Atomic View Increment
            const { slug } = req.query;
            if (!slug) return res.status(400).json({ error: 'Slug required' });
            
            // Get current
            const curRes = await fetch(`${BASE_URL}/blogPosts/${slug}`);
            const curData = fromFirestore(await curRes.json());
            const newViews = (curData.views || 0) + 1;
            
            await fetch(`${BASE_URL}/blogPosts/${slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toFirestore({ views: newViews }))
            });
            return res.status(200).json({ success: true, views: newViews });

        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        if (!finalPost || !finalPost.content || finalPost.content.length < 100) {
            throw new Error("AI did not generate enough content. Please try again.");
        }

        const documentId = finalPost.id;
        // USE PATCH to overwrite existing post if the title is the same (Updates trending posts daily)
        await fetch(`${BASE_URL}/blogPosts/${documentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toFirestore(finalPost))
        });

        return res.status(200).json({ success: true, blogId: documentId });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
