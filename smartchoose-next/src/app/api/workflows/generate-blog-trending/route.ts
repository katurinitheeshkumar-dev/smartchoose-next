import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Inline AI caller (no workflow dependency)
async function callAI(prompt: string, isJson = false): Promise<any> {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: isJson ? { type: 'json_object' } : undefined,
        temperature: 0.7,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content || '').replace(/```(json|html)?\n?/gi, '').replace(/\n?```$/g, '').trim();
      return isJson ? JSON.parse(text) : text;
    }
  }
  throw new Error('No AI key available. Add GROQ_API_KEY to Vercel env.');
}

async function saveBlogToFirestore(blog: any): Promise<boolean> {
  const PROJECT_ID = 'smartchoose-official';
  const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/blogPosts`;

  function toVal(v: any): any {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toVal) } };
    if (typeof v === 'object') {
      const fields: any = {};
      for (const [k, val] of Object.entries(v)) fields[k] = toVal(val);
      return { mapValue: { fields } };
    }
    return { stringValue: String(v) };
  }

  const fields: any = {};
  for (const [k, v] of Object.entries(blog)) fields[k] = toVal(v);

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

export async function POST(req: Request) {
  try {
    // Auth: only allow from cron (via x-cron-secret) or admin
    const body = await req.json().catch(() => ({}));
    const cronSecret = req.headers.get('x-cron-secret');
    const isFromCron = cronSecret === process.env.CRON_SECRET;

    const now = new Date().toISOString();

    // Step 1: Find trending topic
    const topicPrompt = `Identify ONE high-traffic trending product topic for Indian shoppers right now. Focus on Electronics or Lifestyle. Return ONLY the topic title as a plain string, nothing else.`;
    const topic = await callAI(topicPrompt, false);

    // Step 2: Plan the blog metadata
    const metaPrompt = `As an SEO expert for SmartChoose.in (India's product discovery platform), create blog metadata for: "${topic}".
Return ONLY valid JSON:
{"title":"...","slug":"...","category":"Gadgets","intro":"...","seoTitle":"...","seoDescription":"...","tags":["...","...","..."]}`;
    const meta = await callAI(metaPrompt, true);

    // Step 3: Write body content
    const bodyPrompt = `Write a premium blog body for: "${meta.title}". Include 5-6 sections with <h2> tags, a comparison table, and Indian rupee prices. Return ONLY the HTML string.`;
    const bodyHtml = await callAI(bodyPrompt, false);

    // Step 4: Generate products & conclusion
    const productsPrompt = `Suggest 3 top products for blog: "${meta.title}" for Indian market.
Return ONLY valid JSON:
{"conclusion":"...","products":[{"id":"gen-1","name":"...","description":"...","pros":["..."],"price":"₹...","imageQuery":"..."}]}`;
    const extra = await callAI(productsPrompt, true);

    // Add image URLs to products
    if (extra.products) {
      extra.products = extra.products.map((p: any) => ({
        ...p,
        image: `https://image.pollinations.ai/prompt/${encodeURIComponent(p.imageQuery || p.name)}?width=400&height=300&nologo=true&seed=${Math.floor(Math.random() * 9999)}`,
      }));
    }

    // Step 5: Build final post
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(meta.title + ' product photography cinematic')}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 9999)}`;

    const blogPost = {
      ...meta,
      content: `${bodyHtml}<div>${extra.conclusion || ''}</div>`,
      products: extra.products || [],
      featuredImage: imageUrl,
      status: body.autoPublish || isFromCron ? 'published' : 'draft',
      type: 'product',
      template: 'standard',
      createdAt: now,
      updatedAt: now,
    };

    // Step 6: Save to Firestore
    const saved = await saveBlogToFirestore(blogPost);
    if (!saved) throw new Error('Firestore save failed');

    return NextResponse.json({
      success: true,
      title: meta.title,
      status: blogPost.status,
      time: now,
    });
  } catch (error: any) {
    console.error('[generate-blog-trending] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
