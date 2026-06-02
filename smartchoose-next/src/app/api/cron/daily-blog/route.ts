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
You are a senior product expert and affiliate marketing writer for SmartChoose.in, India's #1 product discovery platform.

CRITICAL RULES — NEVER BREAK:
- Never write generic or vague content
- Every article must be specific, data-driven, and India-market focused
- Use real Indian Rupee (₹) prices
- Focus ONLY on "Best X under ₹Y", product comparisons, or buying guides
- Content must be citable by ChatGPT, Perplexity, Gemini, and Copilot

CONTENT TYPES (pick one trending topic):
✅ "Top 5 Budget Smartphones Under ₹15,000 in 2026"
✅ "Best Mechanical Keyboards Under ₹2,000 for Indian Gamers"
✅ "Best Noise-Cancelling Earbuds Under ₹3,000"
❌ "What Is a Keyboard" (NEVER write generic explainer content)
❌ "History of Smartphones" (NEVER write history articles)

FOR COMPARISON PAGES, always include:
1. Quick Answer (who wins and why)
2. Winner Section (clear winner with reason)
3. Comparison Table (specs side-by-side)
4. Pros & Cons (for each product)
5. SmartChoose Verdict (editorial recommendation)
6. FAQ Section (5 buyer questions)
7. Affiliate Product Cards (with Amazon + Flipkart links)

Return ONLY valid JSON with this exact structure:
{
  "title": "Top 5 [Product] Under ₹[Price] in 2026 — Best Picks for India",
  "slug": "url-friendly-slug-2026",
  "category": "Gadgets",
  "intro": "2-sentence engaging intro with specific product mention and price",
  "seoTitle": "Top 5 [Product] Under ₹[Price] 2026 | SmartChoose",
  "seoDescription": "Find the best [product] under ₹[price] in India. Expert-tested picks with Amazon & Flipkart prices. Updated June 2026.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "quickAnswer": "In 60-80 words: direct answer to 'what is the best X under ₹Y'. Name the top pick, say why it wins, mention price. This section gets cited by ChatGPT and Perplexity.",
  "highlights": ["Key highlight 1 with specific data", "Key highlight 2", "Key highlight 3", "Key highlight 4"],
  "bodyHtml": "<h2>Why These Are The Best Picks</h2><p>detailed content...</p><h2>Full Comparison Table</h2><table><tr><th>Feature</th><th>Product A</th><th>Product B</th><th>Product C</th></tr><tr><td>Price</td><td>₹X</td><td>₹Y</td><td>₹Z</td></tr></table><h2>Who Should Buy What</h2><p>...</p>",
  "winner": "Exact product name that wins overall",
  "verdict": "2-3 sentence SmartChoose editorial verdict. Name the winner, explain why, mention the runner-up. Be specific.",
  "rating": 4.3,
  "bestFor": "Best Value",
  "faq": [
    {"q": "Specific buyer question about the product category?", "a": "Specific, helpful answer with product recommendation and price."},
    {"q": "Another practical buyer question?", "a": "Practical answer with specific model recommendation."},
    {"q": "Question about which platform to buy from?", "a": "Amazon vs Flipkart comparison for this product."},
    {"q": "Question about warranty or after-sales?", "a": "Answer about warranty, service centers, etc."},
    {"q": "Question for a specific use case?", "a": "Recommendation for that specific use case with price."}
  ],
  "conclusion": "2-sentence conclusion reinforcing the top recommendation.",
  "products": [
    {
      "id": "p1",
      "name": "Exact Product Name with Model Number",
      "description": "70-word description focused on key benefits for Indian users",
      "pros": ["Specific pro 1", "Specific pro 2", "Specific pro 3"],
      "cons": ["Honest con 1", "Honest con 2"],
      "price": "₹X,XXX",
      "rating": 4.5,
      "bestFor": "Editor's Choice",
      "amazonLink": "https://www.amazon.in/s?k=product+name",
      "flipkartLink": "https://www.flipkart.com/search?q=product+name",
      "specifications": {"Battery": "5000mAh", "Display": "6.5 inch FHD+", "RAM": "8GB"},
      "imageQuery": "product name professional photo white background"
    },
    {
      "id": "p2",
      "name": "Exact Product Name 2",
      "description": "70-word description",
      "pros": ["Pro 1", "Pro 2", "Pro 3"],
      "cons": ["Con 1", "Con 2"],
      "price": "₹X,XXX",
      "rating": 4.2,
      "bestFor": "Best Value",
      "amazonLink": "https://www.amazon.in/s?k=product2",
      "flipkartLink": "https://www.flipkart.com/search?q=product2",
      "specifications": {"Battery": "4000mAh", "Display": "6.1 inch"},
      "imageQuery": "product 2 name photo"
    },
    {
      "id": "p3",
      "name": "Exact Product Name 3",
      "description": "70-word description",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1"],
      "price": "₹X,XXX",
      "rating": 4.0,
      "bestFor": "Budget Pick",
      "amazonLink": "https://www.amazon.in/s?k=product3",
      "flipkartLink": "https://www.flipkart.com/search?q=product3",
      "specifications": {},
      "imageQuery": "product 3 name photo"
    }
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
      // AI-First fields for search engine optimization
      quickAnswer: blogData.quickAnswer || '',
      highlights: blogData.highlights || [],
      winner: blogData.winner || '',
      verdict: blogData.verdict || '',
      rating: blogData.rating || null,
      bestFor: blogData.bestFor || '',
      faq: blogData.faq || [],
      lastReviewed: now,
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
