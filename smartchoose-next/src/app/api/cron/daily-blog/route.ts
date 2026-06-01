import { NextResponse } from 'next/server';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function callGroq(prompt: string, isJson = false): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: isJson ? { type: 'json_object' } : undefined,
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) throw new Error(`GROQ ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '')
    .replace(/```(json|html)?\n?/gi, '').replace(/\n?```$/g, '').trim();
  return isJson ? JSON.parse(text) : text;
}

async function saveBlog(blog: any): Promise<boolean> {
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
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/smartchoose-official/databases/(default)/documents/blogPosts`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }
  );
  return res.ok;
}

export async function GET(req: Request) {
  const t0 = Date.now();
  try {
    // Auth
    if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const seed = Math.floor(Math.random() * 9999);

    // ONE single AI call — generates everything at once (fastest approach)
    const blogData = await callGroq(`
You are a blog writer for SmartChoose.in, India's product discovery platform.

Generate a complete blog post for Indian shoppers. Pick a trending product topic yourself.

Return ONLY valid JSON with this exact structure:
{
  "title": "engaging title with numbers",
  "slug": "url-friendly-slug",
  "category": "Gadgets",
  "intro": "2-sentence engaging intro",
  "seoTitle": "SEO optimized title under 60 chars",
  "seoDescription": "meta description under 160 chars",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "bodyHtml": "<h2>Section 1</h2><p>content...</p><h2>Section 2</h2><p>content with ₹ prices...</p><h2>Section 3</h2><p>content...</p>",
  "conclusion": "2-sentence conclusion paragraph",
  "products": [
    {"id":"p1","name":"Product Name","description":"60-word description","pros":["pro1","pro2"],"price":"₹XX,XXX","imageQuery":"product photo query"},
    {"id":"p2","name":"Product Name","description":"60-word description","pros":["pro1","pro2"],"price":"₹XX,XXX","imageQuery":"product photo query"},
    {"id":"p3","name":"Product Name","description":"60-word description","pros":["pro1","pro2"],"price":"₹XX,XXX","imageQuery":"product photo query"}
  ]
}
`, true);

    // Add image URLs
    const products = (blogData.products || []).map((p: any) => ({
      ...p,
      image: `https://image.pollinations.ai/prompt/${encodeURIComponent(p.imageQuery || p.name)}?width=400&height=300&nologo=true&seed=${seed}`,
    }));

    const blogPost = {
      title: blogData.title,
      slug: blogData.slug,
      category: blogData.category,
      intro: blogData.intro,
      seoTitle: blogData.seoTitle,
      seoDescription: blogData.seoDescription,
      tags: blogData.tags || [],
      content: `${blogData.bodyHtml || ''}<div>${blogData.conclusion || ''}</div>`,
      products,
      featuredImage: `https://image.pollinations.ai/prompt/${encodeURIComponent((blogData.title || 'product') + ' photography')}?width=1200&height=800&nologo=true&seed=${seed}`,
      status: 'published',
      type: 'product',
      template: 'standard',
      createdAt: now,
      updatedAt: now,
    };

    const saved = await saveBlog(blogPost);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (!saved) throw new Error('Firestore save failed');
    console.log(`[CRON] ✓ Blog published: "${blogPost.title}" in ${elapsed}s`);

    return NextResponse.json({ success: true, title: blogPost.title, elapsed: `${elapsed}s`, time: now });
  } catch (err: any) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[CRON] ✗ Failed in ${elapsed}s:`, err.message);
    return NextResponse.json({ error: err.message, elapsed: `${elapsed}s` }, { status: 500 });
  }
}
