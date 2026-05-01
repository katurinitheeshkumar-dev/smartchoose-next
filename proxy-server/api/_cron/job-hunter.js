import { db } from '../_lib/firebase-admin';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ADZUNA_APP_ID = 'c091152f';
const ADZUNA_APP_KEY = '5fbf0a38893fb5ab6b8ec848e22ee1bb';
const GEMINI_API_KEY = 'AIzaSyD7kWC8z8q77xLiyP49GiZJohqh-MuIXfE';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;


import { sendJobNotification } from '../notifications';

const FEEDS = [
  { url: 'https://www.safalta.com/rss/other-govt-jobs.xml', category: 'Govt Jobs' }
];

function normalizeLink(link) {
  if (!link) return "";
  try {
    const url = new URL(link);
    url.search = ""; // Remove all tracking params
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch (e) {
    return link.replace(/\/$/, "").toLowerCase();
  }
}

function generateJobId(title, company, source = 'auto') {
  const slug = (title + "-" + company).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${source}-${slug}`;
}

async function callAI(prompt) {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: "You are an expert recruitment AI. Return ONLY JSON." }, { role: "user", content: prompt }],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });
    const data = await res.json();
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch (e) { return { error: e.message }; }
}

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
      if (text.includes('{')) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
      }
      return text.trim();
    } catch (e) { return text.trim(); }
  } catch (e) { return { error: e.message }; }
}


function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = url.searchParams.get('mode');
  const results = { discovered: 0, added: [], errors: [] };

  try {
    if (!db) throw new Error("Database not initialized");

    // 1. Fetch Existing Data
    const snapshot = await db.collection('jobs').limit(500).get();
    const existingLinks = snapshot.docs.map(doc => normalizeLink(doc.data().applyLink)).filter(Boolean);
    const existingKeys = new Set(snapshot.docs.map(doc => `${doc.data().title.toLowerCase()}|${doc.data().company.toLowerCase()}`));

    const settingsDoc = await db.collection('settings').doc('site_settings').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    // 2. Adzuna Discovery
    const userQuery = url.searchParams.get('q');
    let refinedQuery = userQuery || 'Latest Freshers India';

    if (userQuery) {
      console.log(`[JobHunter] Refining user query: ${userQuery}`);
      const refinement = await callGemini(`Translate this job search query into a short, comma-separated list of keywords optimized for a job search engine like Adzuna. Query: "${userQuery}". Return ONLY the keywords.`);
      if (typeof refinement === 'string' && refinement.length > 0 && !refinement.includes('error')) {
        refinedQuery = refinement;
        console.log(`[JobHunter] Refined to: ${refinedQuery}`);
      }
    }

    const queries = [refinedQuery];

    for (const q of queries) {
      const adzRes = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=5&what=${encodeURIComponent(q)}&content-type=application/json`);
      const adzData = await adzRes.json();

      if (adzData.results) {
        for (const adJob of adzData.results) {
          const normLink = normalizeLink(adJob.redirect_url);
          if (existingLinks.includes(normLink)) continue;

          const prompt = `Convert this job into a clean, professional JSON object for my website. 
          Fields: { "title", "company", "location", "type", "salary", "description", "category" }. 
          Rules: Fix capitalization, remove junk text. Category MUST be one of: IT & Software, Marketing & Sales, Healthcare, Education, Finance, Govt Jobs, Engineering, Remote / Freelance, Others.
          Data: ${adJob.title} at ${adJob.company?.display_name}. Location: ${adJob.location?.display_name}. Description: ${adJob.description}`;
          
          let details = await callGemini(prompt + "\nRETURN ONLY JSON.");
          if (!details || details.error || !details.title) {
            details = await callAI(prompt);
          }

          if (details.error) continue;

          const jobKey = `${details.title.toLowerCase()}|${details.company.toLowerCase()}`;
          if (existingKeys.has(jobKey)) continue;

          const finalJob = {
            ...details,
            applyLink: adJob.redirect_url,
            status: mode === 'instant' ? "active" : "draft",
            postedAt: new Date().toISOString(),
            views: 0
          };

          const docId = generateJobId(finalJob.title, finalJob.company, 'adz');
          await db.collection('jobs').doc(docId).set(finalJob, { merge: true });
          results.added.push(finalJob.title);
          
          // Notifications & Broadcast
          await sendJobNotification(finalJob.title, finalJob.company, docId).catch(() => {});
          
          if (mode === 'instant') {
            await fetch("https://smartchoose-proxy.vercel.app/api/social-broadcast", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ job: finalJob, settings: settings })
            }).catch(e => console.error("Broadcast failed:", e.message));
          }
        }
      }
    }

    return res.status(200).json({ success: true, added: results.added.length, jobs: results.added });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
