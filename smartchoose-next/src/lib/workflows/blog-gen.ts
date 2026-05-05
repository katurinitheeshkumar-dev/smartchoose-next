import { BlogPost } from '@/types';

// Helper to call Gemini API from the server
async function callGemini(prompt: string, apiKey: string, isJson: boolean = false) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: isJson ? { response_mime_type: "application/json" } : {}
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini API Error: ${err.error?.message || 'Unknown'}`);
  }

  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  return isJson ? JSON.parse(text) : text;
}

/**
 * Vercel Workflow for AI Blog Generation
 */
export async function blogGenerationWorkflow(input: { title: string; style: string; apiKey: string }) {
  "use workflow";

  const { title, style, apiKey } = input;
  
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
    content: `<div>${meta.intro}</div>${bodyHtml}<div>${extra.conclusion}</div>`,
    products: extra.products,
    featuredImage: imageUrl,
    status: 'draft' as const,
    type: 'product' as const,
    template: 'standard' as const,
    createdAt: now,
    updatedAt: now,
  };
}

// Durable Steps using "use step"
async function planBlogStep(title: string, style: string, apiKey: string) {
  "use step";
  const prompt = `
    As an expert SEO strategist, create the metadata for a blog about: "${title}".
    Style: ${style}
    Return ONLY a JSON object:
    {
      "title": "Final SEO Title",
      "slug": "url-friendly-slug",
      "category": "Gadgets|Phones|Laptops|Lifestyle|Deals",
      "intro": "A 2-3 paragraph engaging introduction",
      "seoTitle": "Meta title (60 chars)",
      "seoDescription": "Meta description (155 chars)",
      "tags": ["tag1", "tag2", "tag3"]
    }
  `;
  return callGemini(prompt, apiKey, true);
}

async function writeContentStep(title: string, intro: string, apiKey: string) {
  "use step";
  const prompt = `
    Write the main body content for the blog: "${title}".
    Intro already written was: "${intro}"
    Requirements:
    - Write at least 4-6 detailed sections with <h2> and <h3> tags.
    - Use HTML format (headers, paragraphs, bold text).
    - Focus on quality, authority, and depth.
    - DO NOT include introduction or conclusion yet.
    Return ONLY the HTML string.
  `;
  return callGemini(prompt, apiKey, false);
}

async function generateProductsStep(title: string, apiKey: string) {
  "use step";
  const prompt = `
    Based on the blog title "${title}", suggest 3-5 relevant products.
    Also write a final conclusion paragraph.
    Return ONLY a JSON object:
    {
      "conclusion": "Final wrap-up paragraph",
      "products": [
        { "name": "Product Name", "description": "Quick reason to buy", "pros": ["Pro 1", "Pro 2"], "price": "Price", "affiliateLink": "" }
      ]
    }
  `;
  return callGemini(prompt, apiKey, true);
}
