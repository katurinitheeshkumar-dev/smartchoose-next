"use client";
import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';

interface AIBlogGeneratorProps {
  onClose: () => void;
  onGenerated: (post: any) => void;
}

export function AIBlogGenerator({ onClose, onGenerated }: AIBlogGeneratorProps) {
  const { settings, updateSettings } = useDatabase();
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<'professional' | 'engaging' | 'listicle' | 'how-to'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [showKeyInput, setShowKeyInput] = useState(!settings.geminiApiKey);

  const handleGenerate = async () => {
    if (!title.trim()) return;
    if (!apiKey.trim()) {
      setShowKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setStatus('Analyzing title and SEO keywords...');

    try {
      // 1. Save API key if it's new
      if (apiKey !== settings.geminiApiKey) {
        await updateSettings({ geminiApiKey: apiKey });
      }

      // 2. Call Gemini API directly (Client-side for now as requested)
      setStatus('Generating high-quality SEO content...');
      
      const prompt = `
        You are a professional SEO content writer. Generate a comprehensive blog post in JSON format for the title: "${title}".
        Style: ${style}
        Language: English (Professional)
        
        Requirements:
        - 100% SEO Optimized.
        - Engaging Intro.
        - At least 3-5 product-style blocks if applicable (with name, description, pros).
        - Detailed conclusion.
        - Meta description and SEO title.
        - Tags (comma separated).
        
        The JSON structure MUST be:
        {
          "title": "Full engaging title",
          "slug": "url-friendly-slug",
          "category": "One of: Gadgets, Phones, Laptops, Lifestyle, Deals",
          "intro": "Engaging introduction paragraph",
          "content": "Detailed HTML content for the body",
          "seoTitle": "SEO title (60 chars)",
          "seoDescription": "Meta description (155 chars)",
          "tags": ["tag1", "tag2"],
          "products": [
            {
              "name": "Product Name",
              "description": "Short review",
              "pros": ["Pro 1", "Pro 2"],
              "price": "Approx Price (e.g. ₹19,999)",
              "affiliateLink": ""
            }
          ]
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      const data = await response.json();
      const generatedJson = JSON.parse(data.candidates[0].content.parts[0].text);

      // 3. Generate a high-quality AI image using Pollinations.ai
      setStatus('Generating high-quality AI images...');
      const imagePrompt = `High quality professional photography for blog post about ${generatedJson.title}, cinematic lighting, 8k resolution, commercial style`;
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1200&height=800&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
      
      generatedJson.featuredImage = imageUrl;
      generatedJson.status = 'draft';

      setStatus('Finalizing blog post...');
      setTimeout(() => {
        onGenerated(generatedJson);
        setIsGenerating(false);
      }, 1000);

    } catch (err) {
      console.error('Generation failed:', err);
      alert('Generation failed. Please check your API key and try again.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <m.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-emerald-500/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-200">
              <Icon name="sparkles" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">AI Blog Generator</h2>
              <p className="text-slate-500 text-sm">Create professional SEO blogs in seconds</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <Icon name="x" size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {showKeyInput && (
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-4">
              <label className="block text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Gemini API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API key here..."
                  className="flex-1 px-4 py-2 rounded-xl border border-emerald-200 text-sm font-mono"
                />
                <button 
                  onClick={() => setShowKeyInput(false)}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  Save Key
                </button>
              </div>
              <p className="text-[10px] text-emerald-600 mt-2">
                * Your key is stored securely in your settings. Get it from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline">Google AI Studio</a>.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Blog Title / Topic *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Best Smartwatches under 5000 in India 2024"
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 text-lg font-bold focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['professional', 'engaging', 'listicle', 'how-to'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                    style === s ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {isGenerating ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-amber-100 border-t-amber-500 rounded-full animate-spin" />
                <Icon name="sparkles" size={32} className="absolute inset-0 m-auto text-amber-500 animate-pulse" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-900">Generating Magic...</p>
                <p className="text-slate-500 text-sm animate-pulse">{status}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!title.trim()}
              className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              GENERATE SEO BLOG POST
            </button>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            SmartChoose AI uses Gemini 2.0 Flash for instant, high-quality content generation.
          </p>
        </div>
      </m.div>
    </div>
  );
}
