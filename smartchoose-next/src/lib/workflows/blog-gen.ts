import { BlogPost } from '@/types';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

/**
 * UTILITIES
 */

// Helper to convert JS object to Firestore REST API format
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(toFirestoreValue)
      }
    };
  }
  if (typeof val === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return {
      mapValue: { fields }
    };
  }
  return { stringValue: String(val) };
}

// Helper to clean Gemini response from markdown formatting
function cleanGeminiResponse(text: string): string {
  return text
    .replace(/```(html|json|markdown|)\n?/gi, '') // Remove opening ```tags
    .replace(/\n?```$/g, '')                    // Remove closing ```
    .trim();
}

// Helper to call Gemini API from the server
async function callGemini(prompt: string, apiKey: string, isJson: boolean = false) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: isJson ? { 
        response_mime_type: "application/json",
        temperature: 0.7,
        topP: 0.95
      } : {
        temperature: 0.8,
        topP: 0.95
      }
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini API Error: ${err.error?.message || 'Unknown'}`);
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Always clean the response from potential markdown wrappers
  text = cleanGeminiResponse(text);
  
  if (isJson) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", text);
      throw new Error("Gemini returned invalid JSON format.");
    }
  }
  
  return text;
}

/**
 * WORKFLOWS
 */

/**
 * NEW: Workflow for Daily Auto-Post (Trending Topic)
 */
export async function dailyAutoPostWorkflow(input: { apiKey: string }) {
  "use workflow";
  const { apiKey } = input;

  // 0. Verify Key
  await verifyApiKeyStep(apiKey);

  // 1. Find a trending topic
  const trendingTopic = await findTrendingTopicStep(apiKey);

  // 2. Run the generation steps
  const meta = await planBlogStep(trendingTopic, 'engaging', apiKey);
  const bodyHtml = await writeContentStep(meta.title, meta.intro, apiKey);
  const extra = await generateProductsStep(meta.title, apiKey);

  // 3. Finalize Image
  const imagePrompt = `High quality professional photography for blog post about ${meta.title}, cinematic lighting, 8k resolution, commercial style`;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

  const now = new Date().toISOString();
  const blogPost = {
    ...meta,
    content: `${bodyHtml}<div>${extra.conclusion}</div>`,
    products: extra.products,
    featuredImage: imageUrl,
    status: 'published' as const,
    type: 'product' as const,
    template: 'standard' as const,
    createdAt: now,
    updatedAt: now,
  };

  // 4. Save to Firestore
  const saved = await saveBlogPostStep(blogPost);
  
  if (!saved) {
    throw new Error("Failed to save blog post to Firestore.");
  }

  return { success: true, title: meta.title };
}

/**
 * Vercel Workflow for AI Blog Generation (Manual Trigger)
 */
export async function blogGenerationWorkflow(input: { title: string; style: string; apiKey: string }) {
  "use workflow";

  const { title, style, apiKey } = input;
  
  // 0. Verify Key
  await verifyApiKeyStep(apiKey);

  // 1. Plan Blog (Metadata & Intro)
  const meta = await planBlogStep(title, style, apiKey);
  
  // 2. Write Body Content
  const bodyHtml = await writeContentStep(meta.title, meta.intro, apiKey);
  
  // 3. Generate Products & Conclusion
  const extra = await generateProductsStep(meta.title, apiKey);
  
  // 4. Finalize & Return
  const imagePrompt = `High quality professional photography for blog post about ${meta.title}, cinematic lighting, 8k resolution, commercial style`;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

  const now = new Date().toISOString();
  return {
    ...meta,
    content: `${bodyHtml}<div>${extra.conclusion}</div>`,
    products: extra.products,
    featuredImage: imageUrl,
    status: 'draft' as const,
    type: 'product' as const,
    template: 'standard' as const,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * STEPS
 */

/**
 * verifyApiKeyStep: Ensures the Gemini API key is valid before starting work.
 */
async function verifyApiKeyStep(apiKey: string) {
  "use step";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`API Key Verification Failed: ${err.error?.message || 'Unknown'}`);
    }
    return true;
  } catch (e: any) {
    throw new Error(`Connection Error during API verification: ${e.message}`);
  }
}

async function planBlogStep(title: string, style: string, apiKey: string) {
  "use step";
  const prompt = `
    As an expert SEO strategist for SmartChoose.in (India's leading product discovery platform), create the metadata for a HIGH-CONVERSION blog about: "${title}".
    Style: ${style} (Premium Magazine Style)
    TARGET: Budget-conscious yet quality-seeking Indian buyers.
    
    REQUIREMENTS:
    - TITLE: Must be a "Power Title" with numbers or strong emotional hooks (e.g. "Don't Buy Until You Read This", "Ultimate 2026 Guide").
    - SLUG: Clean, SEO-friendly URL slug.
    - CATEGORY: One of [Gadgets, Phones, Laptops, Lifestyle, Deals, Smartwatch, Earbuds].
    - INTRO: A highly engaging 3-paragraph introduction (350 words). 
      * Paragraph 1: The "Hook" - identify a common pain point.
      * Paragraph 2: The "Expert Insight" - why this topic matters right now in India.
      * Paragraph 3: The "Promise" - what the reader will learn.
    - SEO: Optimized for 2026 search trends.
    
    Return ONLY a valid JSON object:
    {
      "title": "...",
      "slug": "...",
      "category": "...",
      "intro": "...",
      "seoTitle": "...",
      "seoDescription": "...",
      "tags": ["...", "...", "..."]
    }
  `;
  return await callGemini(prompt, apiKey, true);
}

async function writeContentStep(title: string, intro: string, apiKey: string) {
  "use step";
  const prompt = `
    Write the DEEP TECHNICAL ANALYSIS and BODY CONTENT for a premium authority blog: "${title}".
    Intro already written: "${intro}"
    
    CONTENT STRUCTURE REQUIREMENTS:
    1. 6-8 Detailed Sections using <h2> and <h3> tags.
    2. INCLUDE A COMPARISON TABLE: Use <table>, <thead>, <tbody>, <tr>, <th>, <td> tags. Compare at least 3 categories (e.g. Price, Battery, Value).
    3. EXPERT VERDICT SECTIONS: Add a small section in each main block called "SmartChoose Verdict" using <strong>.
    4. TONE: Authoritative, helpful, and sophisticated.
    5. FORMATTING: Use bold text for key specifications. Use <ul> for feature lists.
    6. INDIAN CONTEXT: Mention Rupee (₹) prices, Indian brands, and local usage scenarios.
    
    IMPORTANT: STICK TO CORRECT SPELLING (e.g., "Smartwatch" NOT "Smartch Whatch").
    IMPORTANT: DO NOT include the introduction or conclusion.
    Return ONLY the HTML string.
  `;
  return await callGemini(prompt, apiKey, false);
}

async function generateProductsStep(title: string, apiKey: string) {
  "use step";
  const prompt = `
    Suggest 3-5 high-quality products for the blog: "${title}".
    Target: Indian market.
    
    FOR EACH PRODUCT:
    - ID: "gen-X"
    - NAME: Full official name.
    - DESCRIPTION: 60-word persuasive summary.
    - PROS: 3-4 bullet points.
    - PRICE: In ₹ (Approx).
    - IMAGE: Generate a high-quality prompt for Pollinations. 
      Format: "https://image.pollinations.ai/prompt/[SCENE_DESCRIPTION]?width=800&height=600&nologo=true"
    
    CONCLUSION: A powerful 250-word wrap-up that gives a definitive recommendation on what to buy and why.
    
    Return ONLY a valid JSON object:
    {
      "conclusion": "...",
      "products": [
        { 
          "id": "...", 
          "name": "...", 
          "description": "...", 
          "pros": ["...", "..."], 
          "price": "...", 
          "affiliateLink": "...",
          "image": "..."
        }
      ]
    }
  `;
  return await callGemini(prompt, apiKey, true);
}

async function findTrendingTopicStep(apiKey: string) {
  "use step";
  const prompt = `
    Identify ONE high-traffic trending shopping topic in India today (May 2026).
    Focus: Electronics, Home Tech, or Personal Care.
    Topic must be "Search Optimized" - e.g. "Best Noise Cancelling Earbuds under 3000 (May 2026)".
    Return ONLY the title string.
  `;
  return await callGemini(prompt, apiKey, false);
}

async function saveBlogPostStep(blogPost: any) {
  "use step";
  const PROJECT_ID = 'smartchoose-official';
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogPosts`;

  try {
    // Convert blogPost to Firestore REST format using the robust helper
    const fields: any = {};
    for (const [key, value] of Object.entries(blogPost)) {
      fields[key] = toFirestoreValue(value);
    }

    const res = await fetch(FIRESTORE_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firestore save failed: ${res.status} - ${err}`);
    }
    
    return true;
  } catch (e) {
    console.error('Failed to save blog post via REST:', e);
    return false;
  }
}
