"use client";
import { useState, useEffect } from 'react';

import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';

interface AIBlogGeneratorProps {
  onClose: () => void;
  onGenerated: (post: any, autoPublish?: boolean) => void;
}

export function AIBlogGenerator({ onClose, onGenerated }: AIBlogGeneratorProps) {
  const { settings, updateSettings } = useDatabase();
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<'professional' | 'engaging' | 'listicle' | 'how-to'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [showKeyInput, setShowKeyInput] = useState(!settings.geminiApiKey);
  const [isVerifying, setIsVerifying] = useState(false);
  const [autoPublishMode, setAutoPublishMode] = useState(false);

  // Sync with global settings if they update
  useEffect(() => {
    if (settings.geminiApiKey) {
      setApiKey(settings.geminiApiKey);
      setShowKeyInput(false);
    }
  }, [settings.geminiApiKey]);


  const handleGenerate = async (publishImmediately: boolean = false) => {
    setAutoPublishMode(publishImmediately);
    if (!title.trim() || !apiKey.trim()) {
      setShowKeyInput(true);
      return;
    }

    setIsGenerating(true);
    setStatus('Initializing Durable Workflow...');
    
    try {
      // 1. Start the workflow
      const startRes = await fetch('/api/workflows/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          style, 
          apiKey: apiKey.trim(),
          openaiApiKey: settings.openaiApiKey,
          secretKey: 'optional-secret' // In real app, this would be from env
        })

      });

      if (!startRes.ok) {
        const err = await startRes.json();
        throw new Error(err.error || 'Failed to start workflow');
      }

      const { runId } = await startRes.json();
      
      // 2. Poll for status
      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`/api/workflows/status?runId=${runId}`);
          const data = await statusRes.json();

          if (data.status?.toUpperCase() === 'COMPLETED') {
            setStatus('Success! Finalizing...');
            if (data.output) {
              onGenerated(data.output, publishImmediately);
              setIsGenerating(false);
            } else {
              throw new Error('Workflow completed but no output received.');
            }
            return;
          }

          if (data.status?.toUpperCase() === 'FAILED') {
            throw new Error(data.error || 'Workflow failed');
          }

          // Update status message based on current steps
          const lastStep = data.steps?.filter((s: any) => s.type === 'step').pop();
          if (lastStep) {
            setStatus(`Running: ${lastStep.name || 'Processing'}...`);
          }

          // Poll again in 2 seconds
          setTimeout(pollStatus, 2000);
        } catch (err: any) {
          alert(`Generation failed: ${err.message}`);
          setIsGenerating(false);
        }
      };

      pollStatus();

    } catch (err: any) {
      console.error('Generation failed:', err);
      alert(`Generation failed: ${err.message}`);
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
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${settings.geminiApiKey && settings.geminiApiKey !== 'Nitheesh' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {settings.geminiApiKey && settings.geminiApiKey !== 'Nitheesh' ? 'Gemini: Ready' : 'Gemini: Missing'}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${settings.openaiApiKey ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {settings.openaiApiKey ? 'OpenAI: Active' : 'OpenAI: No Key'}
                </span>
              </div>
            </div>

          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <Icon name="x" size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {showKeyInput && (
            <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-emerald-700 uppercase tracking-widest">Gemini API Key</label>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline flex items-center gap-1"
                >
                  <Icon name="external-link" size={10} />
                  Get Key from AI Studio
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value.trim())}
                  placeholder="Paste your key here..."
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-emerald-200 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-all"
                />
                <button 
                  onClick={async () => {
                    if (!apiKey) return alert('Please enter a key first');
                    try {
                      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
                      });

                      if (res.ok) {
                        alert('✅ API Key is valid and working!');
                        await updateSettings({ geminiApiKey: apiKey });
                        setShowKeyInput(false);
                      } else {
                        const data = await res.json();
                        alert(`❌ Invalid Key: ${data.error?.message || 'Please check your key'}`);
                      }
                    } catch (e) {
                      alert('❌ Connection failed. Check your internet.');
                    }
                  }}
                  className="px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Verify & Save
                </button>
              </div>
              <p className="text-[10px] text-emerald-500 italic">
                * Trimming whitespace automatically. Please ensure billing is enabled in AI Studio for higher limits.
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
            <div className="space-y-3">
              <button
                onClick={() => handleGenerate(false)}
                disabled={!title.trim()}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
              >
                <Icon name="sparkles" size={20} />
                GENERATE AS DRAFT
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={!title.trim()}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
              >
                <Icon name="zap" size={20} />
                GENERATE &amp; AUTO-PUBLISH ✓
              </button>
              <p className="text-center text-[10px] text-slate-400">Auto-Publish: Blog is instantly live on your website</p>
            </div>
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
