import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useDatabase } from '@/contexts/DatabaseContext';

export function AdminAgentControl() {
  const { settings, updateSettings } = useDatabase();
  const [isSyncing, setIsSyncing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'posting'>('idle');
  
  // Settings for Autopilot (Stored in site_settings for simplicity)
  const autopilotEnabled = settings.autopilotEnabled || false;
  const lastAutoPost = settings.lastAutoPost || '';

  const toggleAutopilot = async () => {
    setIsSyncing(true);
    const newStatus = !autopilotEnabled;
    await updateSettings({ autopilotEnabled: newStatus });
    
    // NEW: If turned ON, trigger an immediate background 'Thinking' task to prepare a draft
    if (newStatus) {
      setAgentStatus('analyzing');
      fetch('https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=autopilot&ts=' + Date.now())
        .then(() => setTimeout(() => setAgentStatus('idle'), 3000))
        .catch(() => setAgentStatus('idle'));
    }
    
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Heartbeat Logic: Check every 5 minutes if we need a post (9 AM and 7 PM)
  useEffect(() => {
    if (!autopilotEnabled) {
      setAgentStatus('idle');
      return;
    }

    const checkAutopilot = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const todayKey = now.toDateString(); // "Wed Apr 02 2026"
      
      // Get the last post details
      const lastPostLog = settings.lastAutoPostLog || { date: '', window: '' };
      
      // Slots: 9:00 AM (9) and 7:00 PM (19)
      let targetWindow = '';
      if (currentHour === 9) targetWindow = 'morning';
      if (currentHour === 19) targetWindow = 'evening';

      // If we are EXACTLY in a target slot hour and haven't posted for it today
      if (targetWindow && (lastPostLog.date !== todayKey || lastPostLog.window !== targetWindow)) {
        setAgentStatus('analyzing');
        try {
          // Action=autopilot in the proxy now prepares a DRAFT or PUBLISHES based on logic
          const res = await fetch('https://smartchoose-proxy.vercel.app/api/ai-blog-helper.js?action=autopilot&mode=live', { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            setAgentStatus('posting');
            await updateSettings({ 
              lastAutoPost: new Date().toISOString(),
              lastAutoPostLog: { date: todayKey, window: targetWindow }
            });
            setTimeout(() => setAgentStatus('idle'), 5000);
          }
        } catch (e) {
          console.error('[Autopilot] Scheduled Task Failed:', e);
          setAgentStatus('idle');
        }
      }
    };

    const interval = setInterval(checkAutopilot, 1000 * 60 * 5); // 5 mins
    checkAutopilot(); // Initial check

    return () => clearInterval(interval);
  }, [autopilotEnabled, lastAutoPost, updateSettings]);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden relative group">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 opacity-50" />
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
        {/* Agent Avatar / Icon */}
        <div className="relative">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-500 ${
            agentStatus !== 'idle' ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-100'
          }`}>
            <Icon 
              name={agentStatus === 'posting' ? 'send' : (agentStatus === 'analyzing' ? 'search' : 'cpu')} 
              size={36} 
              className={agentStatus !== 'idle' ? 'text-white' : 'text-slate-400'} 
            />
          </div>
          <AnimatePresence>
            {autopilotEnabled && (
              <m.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" 
              />
            )}
          </AnimatePresence>
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">SmartChoose AI Agent</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              autopilotEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {autopilotEnabled ? 'Autopilot Active' : 'Idle'}
            </span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {agentStatus === 'analyzing' ? 'Scanning global trends for high-traffic topics...' : 
             agentStatus === 'posting' ? 'Writing and publishing 10-point professional blog...' : 
             'Standing by. The agent handles SEO, trends, and daily posting 24/7.'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleAutopilot}
            disabled={isSyncing}
            className={`relative w-16 h-8 rounded-full p-1 transition-all duration-300 ${
              autopilotEnabled ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          >
            <m.div
              animate={{ x: autopilotEnabled ? 32 : 0 }}
              className="w-6 h-6 bg-white rounded-full shadow-md"
            />
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {autopilotEnabled ? 'Disable' : 'Enable'}
          </span>
        </div>
      </div>

      {/* Progress Line (Visible during action) */}
      <AnimatePresence>
        {agentStatus !== 'idle' && (
          <m.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            className="absolute bottom-0 left-0 h-1 bg-emerald-500 z-20" 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
