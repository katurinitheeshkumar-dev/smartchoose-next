import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Inline AI caller using GROQ (fastest, free)
async function callGroq(prompt: string, isJson = false): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set in Vercel env');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: isJson ? { type: 'json_object' } : undefined,
      temperature: 0.7,
      max_tokens: isJson ? 1500 : 2500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GROQ error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '')
    .replace(/```(json|html)?\n?/gi, '')
    .replace(/\n?```$/g, '')
    .trim();

  return isJson ? JSON.parse(text) : text;
}

// Save directly to Firestore REST API
async function saveBlog(blog: any): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/smartchoose-official/databases/(default)/documents/blogPosts`;

  function toVal(v: any): any {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'string') return { stringValue: v };
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

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

export async function GET(req: Request) {
  const startTime = Date.now();
  try {
    // 1. Auth check
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // 2. Find trending topic (short prompt = fast)
    const topic = await callGroq(
      'Give me ONE trending product name or category popular with Indian shoppers right now (e.g. "Best Budget 5G Smartphones 2025"). Return ONLY the topic title, nothing else.',
      false
    );

    // 3. Generate blog metadata
    const meta = await callGroq(
      `Create SEO blog metadata for SmartChoose.in about: "${topic}". Return ONLY valid JSON with keys: title, slug, category (one of: Gadgets/Phones/Laptops/Lifestyle/Deals), intro (2 sentences), seoTitle, seoDescription, tags (array of 5 strings).`,
      true
    );

    // 4. Write blog body (concise)
    const bodyHtml = await callGroq(
      `Write a concise but high-quality blog body for: "${meta.title}". Include 4 sections with <h2> tags and one HTML comparison table. Use Indian Rupee (₹) prices. Return ONLY the HTML.`,
      false
    );

    // 5. Generate products list
    const productsData = await callGroq(
      `Suggest 3 products for blog: "${meta.title}" for Indian market. Return ONLY valid JSON: {"conclusion":"2-sentence wrap-up","products":[{"id":"p1","name":"...","description":"60 words...","pros":["...","..."],"price":"₹...","imageQuery":"short photo description"}]}`,
      true
    );

    // Add image URLs
    const products = (productsData.products || []).map((p: any) => ({
      ...p,
      image: `https://image.pollinations.ai/prompt/${encodeURIComponent(p.imageQuery || p.name)}?width=400&height=300&nologo=true&seed=${Math.floor(Math.random() * 9999)}`,
    }));

    const seed = Math.floor(Math.random() * 9999);
    const featuredImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(meta.title + ' product photography')}?width=1200&height=800&nologo=true&seed=${seed}`;

    const blogPost = {
      ...meta,
      content: `${bodyHtml}<div>${productsData.conclusion || ''}</div>`,
      products,
      featuredImage,
      status: 'published',
      type: 'product',
      template: 'standard',
      createdAt: now,
      updatedAt: now,
    };

    // 6. Save to Firestore
    const saved = await saveBlog(blogPost);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!saved) throw new Error('Firestore save failed');

    console.log(`[CRON] Blog published: "${meta.title}" in ${elapsed}s`);

    return NextResponse.json({
      success: true,
      title: meta.title,
      elapsed: `${elapsed}s`,
      time: now,
    });
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[CRON] Failed after ${elapsed}s:`, error.message);
    return NextResponse.json({ error: error.message, elapsed: `${elapsed}s` }, { status: 500 });
  }
}
