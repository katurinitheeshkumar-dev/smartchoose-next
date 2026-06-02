import { NextResponse } from 'next/server';
import { getComparisonBySlug, searchProductsByKeyword, firestoreSave, type ComparisonPage } from '@/lib/db';
import { hasCommercialIntent, parseComparisonSlug, normalizeCacheKey } from '@/lib/commercial-intent';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function callGroq(prompt: string): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) throw new Error(`GROQ error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '')
    .replace(/```json\n?/gi, '').replace(/\n?```$/g, '').trim();
  return JSON.parse(text);
}

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const { slug } = body as { slug: string };

    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const normalizedSlug = normalizeCacheKey(slug);

    // ── 1. Commercial intent check ─────────────────────────────────────────
    const intent = hasCommercialIntent(slug);
    if (!intent.allowed) {
      return NextResponse.json({ error: intent.reason, blocked: true }, { status: 422 });
    }

    // ── 2. Cache-first: check if already in DB ─────────────────────────────
    const cached = await getComparisonBySlug(normalizedSlug);
    if (cached) {
      return NextResponse.json({
        success: true,
        fromCache: true,
        elapsed: `${((Date.now() - t0) / 1000).toFixed(1)}s`,
        page: cached,
      });
    }

    // ── 3. Parse products from slug ────────────────────────────────────────
    const parsed = parseComparisonSlug(slug);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid comparison slug. Use format: product-a-vs-product-b' }, { status: 400 });
    }

    const { productA, productB } = parsed;

    // ── 4. Search SmartChoose DB for real product data ─────────────────────
    const [dbProductsA, dbProductsB] = await Promise.all([
      searchProductsByKeyword(productA, 3),
      searchProductsByKeyword(productB, 3),
    ]);

    const fromDatabase = dbProductsA.length > 0 || dbProductsB.length > 0;

    // Build context for AI from DB products if found
    const dbContext = fromDatabase
      ? `SmartChoose Database Products Found:
Product A matches: ${dbProductsA.map(p => `${p.title} (₹${p.price}, ${p.rating}★)`).join(', ') || 'none'}
Product B matches: ${dbProductsB.map(p => `${p.title} (₹${p.price}, ${p.rating}★)`).join(', ') || 'none'}`
      : 'No exact database matches. Use your knowledge of these products for the Indian market.';

    // ── 5. Generate comparison with GROQ ──────────────────────────────────
    const comparisonData = await callGroq(`
You are a senior product expert for SmartChoose.in, India's #1 product comparison platform.

TASK: Create a detailed, specific comparison between "${productA}" and "${productB}" for Indian buyers.

${dbContext}

STRICT RULES:
- NEVER write generic content
- Always declare a clear WINNER with specific reasons
- Use Indian Rupee (₹) prices
- Focus on value-for-money for Indian market
- Be specific about model names, specs, and prices
- Every section must have actionable buying advice

MANDATORY SECTIONS (all required):
1. Quick Answer — Who wins and why (60-80 words, citable by ChatGPT/Perplexity)
2. Winner Section — Clear winner with 3 specific reasons
3. Comparison Table — 6-8 key specs side by side
4. Pros & Cons — For each product (3 pros, 2 cons each)
5. SmartChoose Verdict — Editorial recommendation (2-3 sentences)
6. FAQ Section — 5 buyer questions with specific answers
7. Affiliate Product Cards — 3 products total (winner + runner-up + budget alt)

Return ONLY valid JSON:
{
  "title": "${productA} vs ${productB}: Which Is Better for India in 2026?",
  "seoTitle": "${productA} vs ${productB} 2026 | SmartChoose",
  "seoDescription": "Detailed ${productA} vs ${productB} comparison with specs, prices, and SmartChoose verdict for India.",
  "quickAnswer": "60-80 word direct answer naming the winner and key reason. Include current ₹ prices. This gets cited by ChatGPT and Perplexity.",
  "winner": "Exact winner product name",
  "winnerReason": "3 specific reasons why this product wins for Indian buyers",
  "verdict": "2-3 sentence SmartChoose editorial verdict with clear recommendation and runner-up mention",
  "rating": 4.3,
  "comparisonTable": [
    {"feature": "Price", "productA": "₹X,XXX", "productB": "₹Y,YYY"},
    {"feature": "Key Spec 1", "productA": "value", "productB": "value"},
    {"feature": "Key Spec 2", "productA": "value", "productB": "value"},
    {"feature": "Battery/Runtime", "productA": "value", "productB": "value"},
    {"feature": "Warranty", "productA": "1 year", "productB": "1 year"},
    {"feature": "Best For", "productA": "use case", "productB": "use case"},
    {"feature": "SmartChoose Rating", "productA": "4.5/5", "productB": "4.2/5"}
  ],
  "content": "<h2>Detailed Comparison: ${productA} vs ${productB}</h2><p>specific content...</p><h2>Pros and Cons</h2><div class='pros-cons'><h3>${productA}</h3><p>Pros: specific pro 1, pro 2, pro 3</p><p>Cons: con 1, con 2</p><h3>${productB}</h3><p>Pros: pro 1, pro 2, pro 3</p><p>Cons: con 1, con 2</p></div><h2>Who Should Buy Which?</h2><p>specific guidance...</p>",
  "faq": [
    {"q": "Is ${productA} better than ${productB}?", "a": "Specific answer with specs and price comparison."},
    {"q": "Which has better value for money in India?", "a": "Specific answer with ₹ prices."},
    {"q": "Where to buy at the best price?", "a": "Amazon vs Flipkart price comparison."},
    {"q": "Which is better for [specific use case]?", "a": "Specific recommendation."},
    {"q": "Should I wait for a sale or buy now?", "a": "Practical buying advice for Indian shoppers."}
  ],
  "products": [
    {
      "id": "p1",
      "name": "Winner product exact name",
      "description": "70-word description focused on Indian buyer benefits",
      "pros": ["Specific pro 1", "Specific pro 2", "Specific pro 3"],
      "cons": ["Con 1", "Con 2"],
      "price": "₹X,XXX",
      "rating": 4.5,
      "bestFor": "Editor's Choice",
      "amazonLink": "https://www.amazon.in/s?k=${encodeURIComponent(productA)}",
      "flipkartLink": "https://www.flipkart.com/search?q=${encodeURIComponent(productA)}",
      "specifications": {"Key Spec": "Value", "Price": "₹X,XXX"},
      "imageQuery": "${productA} product photo"
    },
    {
      "id": "p2",
      "name": "Runner-up product exact name",
      "description": "70-word description",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1"],
      "price": "₹Y,YYY",
      "rating": 4.2,
      "bestFor": "Best Value",
      "amazonLink": "https://www.amazon.in/s?k=${encodeURIComponent(productB)}",
      "flipkartLink": "https://www.flipkart.com/search?q=${encodeURIComponent(productB)}",
      "specifications": {},
      "imageQuery": "${productB} product photo"
    },
    {
      "id": "p3",
      "name": "Budget alternative if available",
      "description": "60-word description",
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1"],
      "price": "₹Z,ZZZ",
      "rating": 4.0,
      "bestFor": "Budget Pick",
      "amazonLink": "https://www.amazon.in/s?k=budget+alternative",
      "flipkartLink": "https://www.flipkart.com/search?q=budget+alternative",
      "specifications": {},
      "imageQuery": "budget alternative product photo"
    }
  ]
}
`);

    // ── 6. Add product images ──────────────────────────────────────────────
    const seed = Math.floor(Math.random() * 9999);
    const products = (comparisonData.products || []).map((p: any, i: number) => ({
      ...p,
      image: p.image || `https://image.pollinations.ai/prompt/${encodeURIComponent(p.imageQuery || p.name)}?width=400&height=300&nologo=true&seed=${seed + i}`,
      affiliateLink: p.amazonLink || p.flipkartLink || '',
    }));

    // ── 7. Build final comparison page object ──────────────────────────────
    const now = new Date().toISOString();
    const page: Omit<ComparisonPage, 'id'> = {
      slug: normalizedSlug,
      productA,
      productB,
      title: comparisonData.title || `${productA} vs ${productB}`,
      quickAnswer: comparisonData.quickAnswer || '',
      winner: comparisonData.winner || productA,
      winnerReason: comparisonData.winnerReason || '',
      verdict: comparisonData.verdict || '',
      content: comparisonData.content || '',
      comparisonTable: comparisonData.comparisonTable || [],
      faq: comparisonData.faq || [],
      products,
      seoTitle: comparisonData.seoTitle || `${productA} vs ${productB} | SmartChoose`,
      seoDescription: comparisonData.seoDescription || '',
      rating: comparisonData.rating || null,
      fromDatabase,
      createdAt: now,
      updatedAt: now,
      views: 0,
    };

    // ── 8. Save to Firestore permanently ───────────────────────────────────
    const savedId = await firestoreSave('comparisons', page);
    const elapsed = `${((Date.now() - t0) / 1000).toFixed(1)}s`;

    console.log(`[COMPARE] ✓ Generated & cached: "${page.title}" in ${elapsed} | DB: ${fromDatabase}`);

    return NextResponse.json({
      success: true,
      fromCache: false,
      fromDatabase,
      elapsed,
      savedId,
      page: { ...page, id: savedId },
    });

  } catch (err: any) {
    const elapsed = `${((Date.now() - t0) / 1000).toFixed(1)}s`;
    console.error(`[COMPARE] ✗ Failed in ${elapsed}:`, err.message);
    return NextResponse.json({ error: err.message, elapsed }, { status: 500 });
  }
}
