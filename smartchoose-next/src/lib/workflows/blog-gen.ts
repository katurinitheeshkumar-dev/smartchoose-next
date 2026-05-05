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
    IMPORTANT: Return ONLY a valid JSON object. No markdown, no preamble.
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
  try {
    const raw = await callGemini(prompt, apiKey, false);
    // Clean potential markdown code blocks
    const cleanJson = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("PlanBlogStep Failed, using fallback", e);
    return {
      title: title,
      slug: title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, ''),
      category: 'Gadgets',
      intro: `Welcome to our comprehensive guide on ${title}. Today we dive deep into the best options available.`,
      seoTitle: title.slice(0, 60),
      seoDescription: `Learn everything about ${title} in this expert guide.`,
      tags: ['Gadgets', 'Guide']
    };
  }
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
  try {
    return await callGemini(prompt, apiKey, false);
  } catch (e) {
    return `<section><h2>Detailed Analysis of ${title}</h2><p>Content generation failed, but stay tuned for updates on this topic.</p></section>`;
  }
}

async function generateProductsStep(title: string, apiKey: string) {
  "use step";
  const prompt = `
    Based on the blog title "${title}", suggest 3 relevant products.
    Also write a final conclusion paragraph.
    IMPORTANT: Return ONLY a valid JSON object.
    {
      "conclusion": "Final wrap-up paragraph",
      "products": [
        { "id": "1", "name": "Product Name", "description": "Quick reason to buy", "pros": ["Pro 1", "Pro 2"], "price": "Price", "affiliateLink": "" }
      ]
    }
  `;
  try {
    const raw = await callGemini(prompt, apiKey, false);
    const cleanJson = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    return {
      conclusion: `In conclusion, ${title} is a great area to explore. We hope this guide helped you make a smart choice.`,
      products: []
    };
  }
}
