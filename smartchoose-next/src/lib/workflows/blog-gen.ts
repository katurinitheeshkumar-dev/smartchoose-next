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

// Helper to clean AI response from markdown formatting
function cleanAIResponse(text: string): string {
  return text
    .replace(/```(html|json|markdown|)\n?/gi, '') // Remove opening ```tags
    .replace(/\n?```$/g, '')                    // Remove closing ```
    .trim();
}

/**
 * UNIFIED AI CALLER (Supports Gemini & OpenAI)
 */
async function callAI(
  prompt: string, 
  keys: { geminiApiKey?: string, openaiApiKey?: string }, 
  isJson: boolean = false,
  enableSearch: boolean = false
) {
  const { geminiApiKey, openaiApiKey } = keys;
  const groqApiKey = process.env.GROQ_API_KEY || ""; 

  // Try Groq FIRST (Llama 3 - Completely Free & Fast)
  if (groqApiKey) {
    try {
      const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", 
          messages: [{ role: "user", content: prompt }],
          response_format: isJson ? { type: "json_object" } : undefined,
          temperature: 0.7
        })
      });

      if (res.ok) {
        const data = await res.json();
        let text = data.choices?.[0]?.message?.content || '';
        text = cleanAIResponse(text);
        if (isJson) return JSON.parse(text);
        return text;
      } else {
        const err = await res.json();
        console.warn(`Groq API Error: ${err.error?.message || 'Unknown'}. Falling back to Gemini...`);
      }
    } catch (e: any) {
      console.warn(`Groq Connection Failed: ${e.message}. Falling back to Gemini...`);
    }
  }

  // Try Gemini Second
  if (geminiApiKey) {
    try {
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: isJson ? { 
          response_mime_type: "application/json",
          temperature: 0.7,
          topP: 0.95
        } : {
          temperature: 0.8,
          topP: 0.95
        }
      };

      if (enableSearch) {
        body.tools = [{ googleSearchRetrieval: {} }];
      }

      let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      // Fallback if search grounding fails (e.g. rate limit, free tier limitations)
      if (!res.ok && enableSearch) {
        console.warn("Gemini Google Search Grounding failed (likely due to free tier limits). Retrying without search grounding...");
        delete body.tools;
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        const data = await res.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = cleanAIResponse(text);
        if (isJson) return JSON.parse(text);
        return text;
      } else {
        const err = await res.json();
        console.warn(`Gemini API Error: ${err.error?.message || 'Unknown'}. Falling back to OpenAI if available.`);
      }
    } catch (e) {
      console.warn("Gemini connection failed. Falling back to OpenAI if available.");
    }
  }

  // Try OpenAI as Fallback
  if (openaiApiKey) {
    try {
      const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Use mini for cost efficiency and speed
          messages: [{ role: "user", content: prompt }],
          response_format: isJson ? { type: "json_object" } : undefined,
          temperature: 0.7
        })
      });

      if (res.ok) {
        const data = await res.json();
        let text = data.choices?.[0]?.message?.content || '';
        text = cleanAIResponse(text);
        if (isJson) return JSON.parse(text);
        return text;
      } else {
        const err = await res.json();
        throw new Error(`OpenAI API Error: ${err.error?.message || 'Unknown'}`);
      }
    } catch (e: any) {
      throw new Error(`AI Service Failure: ${e.message}`);
    }
  }

  throw new Error("No valid AI API keys provided or all services failed.");
}

/**
 * WORKFLOWS
 */

/**
 * NEW: Workflow for Daily Auto-Post (Trending Topic)
 */
export async function dailyAutoPostWorkflow(input: { apiKey?: string, openaiApiKey?: string }) {
  "use workflow";
  const keys = { geminiApiKey: input.apiKey, openaiApiKey: input.openaiApiKey };

  // 0. Verify at least one key is valid
  await verifyAIKeysStep(keys);

  // 1. Get blog generation strategy from settings
  const settings = await getSettingsStep();
  let isTrending = true;
  
  if (settings.blogStrategy === 'evergreen') {
    isTrending = false;
  } else if (settings.blogStrategy === 'split') {
    // Alternate daily between Trending and Evergreen/Universal
    const day = new Date().getDate();
    isTrending = (day % 2 === 0);
  }

  // 2. Find a topic (live search grounding or evergreen pool)
  const trendingTopic = await findTrendingTopicStep(keys, isTrending);

  // 3. Run the generation steps
  const meta = await planBlogStep(trendingTopic, 'engaging', keys);
  const bodyHtml = await writeContentStep(meta.title, meta.intro, keys);
  const extra = await generateProductsStep(meta.title, keys);

  // 4. Finalize Image
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

  // 5. Save to Firestore
  const saved = await saveBlogPostStep(blogPost);
  
  if (!saved) {
    throw new Error("Failed to save blog post to Firestore.");
  }

  return { success: true, title: meta.title };
}

/**
 * Vercel Workflow for AI Blog Generation (Manual Trigger)
 */
export async function blogGenerationWorkflow(input: { title: string; style: string; apiKey?: string, openaiApiKey?: string }) {
  "use workflow";

  const { title, style, apiKey, openaiApiKey } = input;
  const keys = { geminiApiKey: apiKey, openaiApiKey: openaiApiKey };
  
  // 0. Verify Keys
  await verifyAIKeysStep(keys);

  // 1. Plan Blog (Metadata & Intro)
  const meta = await planBlogStep(title, style, keys);
  
  // 2. Write Body Content
  const bodyHtml = await writeContentStep(meta.title, meta.intro, keys);
  
  // 3. Generate Products & Conclusion
  const extra = await generateProductsStep(meta.title, keys);
  
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
 * NEW: Deep Research Workflow (24h Simulation)
 * Generates 3 premium drafts with intentional 'Thinking' pauses.
 */
export async function deepResearchWorkflow(input: { apiKey?: string, openaiApiKey?: string }) {
  "use workflow";
  const keys = { geminiApiKey: input.apiKey, openaiApiKey: input.openaiApiKey };
  const total = 3;

  // 0. Start Research Tracking
  await updateDeepResearchStatusStep({ active: true, count: 0, total });

  try {
    for (let i = 0; i < total; i++) {
      // 1. Find/Verify Topic
      const topic = await findTrendingTopicStep(keys);
      
      // 2. Research & Generate
      const meta = await planBlogStep(topic, 'professional', keys);
      const bodyHtml = await writeContentStep(meta.title, meta.intro, keys);
      const extra = await generateProductsStep(meta.title, keys);

      // 3. Save as Draft
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(meta.title)}?width=1200&height=800&nologo=true&seed=${Math.random()}`;
      const now = new Date().toISOString();
      await saveBlogPostStep({
        ...meta,
        content: `${bodyHtml}<div>${extra.conclusion}</div>`,
        products: extra.products,
        featuredImage: imageUrl,
        status: 'draft',
        type: 'product',
        template: 'standard',
        createdAt: now,
        updatedAt: now
      });

      // 4. Update Progress
      await updateDeepResearchStatusStep({ active: true, count: i + 1, total });
      
      // 5. Pause (Simulate deep editorial thinking)
      // For real 24h over 3 blogs, we'd wait 8 hours each.
      // await workflow.wait(60 * 60 * 8); 
    }
  } finally {
    // 6. Complete
    await updateDeepResearchStatusStep({ active: false });
  }

  return { success: true };
}



/**
 * STEPS
 */

/**
 * verifyAIKeysStep: Ensures at least one API key is valid.
 */
async function verifyAIKeysStep(keys: { geminiApiKey?: string, openaiApiKey?: string }) {
  "use step";
  const { geminiApiKey, openaiApiKey } = keys;
  const groqApiKey = process.env.GROQ_API_KEY || "";
  
  if (!geminiApiKey && !openaiApiKey && !groqApiKey) {
    throw new Error("DEBUG: No API keys found in the workflow input. Please ensure settings are saved.");
  }

  let groqError = "Not provided";
  let geminiError = "Not provided";
  let openaiError = "Not provided";

  if (groqApiKey) {
    try {
      const res = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5
        })
      });
      if (res.ok) return { provider: 'groq' };
      
      const errData = await res.json();
      groqError = `Status ${res.status}: ${errData.error?.message || JSON.stringify(errData)}`;
    } catch (e: any) {
      groqError = `Fetch Error: ${e.message}`;
    }
  }

  if (geminiApiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
      });
      if (res.ok) return { provider: 'gemini' };
      
      const errData = await res.json();
      geminiError = `Status ${res.status}: ${errData.error?.message || JSON.stringify(errData)}`;
      console.error("DIAGNOSTIC: Gemini Fail:", geminiError);
    } catch (e: any) {
      geminiError = `Fetch Error: ${e.message}`;
    }
  }

  if (openaiApiKey) {
    try {
      const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5
        })
      });
      if (res.ok) return { provider: 'openai' };
      
      const errData = await res.json();
      openaiError = `Status ${res.status}: ${errData.error?.message || JSON.stringify(errData)}`;
      console.error("DIAGNOSTIC: OpenAI Fail:", openaiError);
    } catch (e: any) {
      openaiError = `Fetch Error: ${e.message}`;
    }
  }

  // THROW THE FULL DIAGNOSTIC TO THE UI
  throw new Error(`CRITICAL: AI Keys Failed Verification.\n\nGROQ: ${groqError}\n\nGEMINI: ${geminiError}\n\nOPENAI: ${openaiError}\n\nAction: Please verify your keys start with 'gsk_' (Groq), 'AIza' (Gemini) or 'sk-proj' (OpenAI) and have billing/credits active.`);
}



async function planBlogStep(title: string, style: string, keys: any) {
  "use step";
  const prompt = `
    As an expert SEO strategist for SmartChoose.in (India's leading product discovery platform), create the metadata for a HIGH-CONVERSION blog about: "${title}".
    Style: ${style} (Premium Magazine Style)
    TARGET: Budget-conscious yet quality-seeking Indian buyers.
    
    REQUIREMENTS:
    - TITLE: Must be a "Power Title" with numbers or strong emotional hooks.
    - SLUG: Clean, SEO-friendly URL slug.
    - CATEGORY: One of [Gadgets, Phones, Laptops, Lifestyle, Deals, Smartwatch, Earbuds].
    - INTRO: A punchy, highly engaging introduction (MAX 3 SENTENCES). Focus on a single strong hook.
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
  return await callAI(prompt, keys, true);
}

async function writeContentStep(title: string, intro: string, keys: any) {
  "use step";
  const prompt = `
    Write the DEEP TECHNICAL ANALYSIS and BODY CONTENT for a premium authority blog: "${title}".
    Intro already written: "${intro}"
    
    CONTENT STRUCTURE REQUIREMENTS:
    1. 6-8 Detailed Sections using <h2> and <h3> tags.
    2. INCLUDE A COMPARISON TABLE: Use <table> tags. Compare at least 3 categories.
    3. EXPERT VERDICT SECTIONS: Add "SmartChoose Verdict" using <strong>.
    4. TONE: Authoritative and sophisticated.
    5. INDIAN CONTEXT: Mention Rupee (₹) prices and Indian brands.
    
    Return ONLY the HTML string.
  `;
  return await callAI(prompt, keys, false);
}

async function generateProductsStep(title: string, keys: any) {
  "use step";
  const prompt = `
    Suggest 3-5 high-quality products for the blog: "${title}".
    Target: Indian market.
    
    FOR EACH PRODUCT:
    - NAME: Full official name.
    - DESCRIPTION: 60-word persuasive summary.
    - PROS: 3-4 bullet points.
    - PRICE: In ₹ (Approx).
    - IMAGE_QUERY: A short descriptive query for a product photo (e.g., "iphone 17 pro max natural titanium").
    
    CONCLUSION: A powerful 250-word wrap-up with a definitive recommendation.
    
    Return ONLY a valid JSON object:
    {
      "conclusion": "...",
      "products": [
        { 
          "id": "gen-X", 
          "name": "...", 
          "description": "...", 
          "pros": ["...", "..."], 
          "price": "...", 
          "imageQuery": "..."
        }
      ]
    }

  `;
  const res = await callAI(prompt, keys, true);
  const data = JSON.parse(res);
  
  if (data.products) {
    data.products = data.products.map((p: any) => ({
      ...p,
      image: `https://image.pollinations.ai/prompt/${encodeURIComponent(p.imageQuery || p.name)}?width=400&height=300&nologo=true&seed=${Math.floor(Math.random() * 1000)}`
    }));
  }

  return data;
}

async function findTrendingTopicStep(keys: any, isTrending: boolean = true) {
  "use step";
  if (isTrending) {
    const prompt = `Identify ONE high-traffic trending shopping topic in India today. Focus: Electronics or Lifestyle. Return ONLY the title string.`;
    return await callAI(prompt, keys, false, true); // Enable Google Search Grounding
  } else {
    const categories = ["Smartphones", "Smartwatches", "Earbuds", "Laptops", "Gadgets", "Lifestyle"];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const prompt = `Identify ONE high-traffic evergreen product buying guide or comparison guide topic for Indian consumers. Focus on the category: ${category}. Return ONLY the title string.`;
    return await callAI(prompt, keys, false, false); // No Search Grounding needed
  }
}

async function getSettingsStep() {
  "use step";
  const PROJECT_ID = 'smartchoose-official';
  const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/site_settings`;
  try {
    const res = await fetch(URL);
    if (!res.ok) return {};
    const data = await res.json();
    const fields = data.fields || {};
    const settings: any = {};
    for (const [k, v] of Object.entries(fields)) {
      if ((v as any).stringValue !== undefined) settings[k] = (v as any).stringValue;
      else if ((v as any).booleanValue !== undefined) settings[k] = (v as any).booleanValue;
    }
    return settings;
  } catch (e) {
    return {};
  }
}

async function saveBlogPostStep(blogPost: any) {
  "use step";
  const PROJECT_ID = 'smartchoose-official';
  const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogPosts`;

  try {
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
async function updateDeepResearchStatusStep(status: { active: boolean, count?: number, total?: number }) {
  "use step";
  const PROJECT_ID = 'smartchoose-official';
  
  const fields: any = {
    deepResearchActive: { booleanValue: status.active }
  };
  
  const masks = ['deepResearchActive'];

  if (status.active) {
    fields.deepResearchStart = { stringValue: new Date().toISOString() };
    fields.deepResearchCount = { integerValue: status.count || 0 };
    fields.deepResearchTotal = { integerValue: status.total || 0 };
    masks.push('deepResearchStart', 'deepResearchCount', 'deepResearchTotal');
  }

  const maskStr = masks.map(m => `updateMask.fieldPaths=${m}`).join('&');
  const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/settings/site_settings?${maskStr}`;

  await fetch(URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
}

