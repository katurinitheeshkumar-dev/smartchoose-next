import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/ui/custom/Icon';
import { useAdmin } from '@/contexts/AdminContext';
import { useDatabase } from '@/contexts/DatabaseContext';

export function AdminLogin() {
  const { showLogin, setShowLogin, login, loginError, clearLoginError } = useAdmin();
  const { settings } = useDatabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Clear form when modal opens/closes
  useEffect(() => {
    if (showLogin) {
      setEmail('');
      setPassword('');
      clearLoginError();
    }
  }, [showLogin, clearLoginError]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLogin) {
        setShowLogin(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogin, setShowLogin]);

  if (!showLogin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      setEmail('');
      setPassword('');
    }
  };

  const handleClose = () => {
    setShowLogin(false);
    clearLoginError();
  };

  return (
    <AnimatePresence>
      {showLogin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <m.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-xl border border-slate-100 overflow-hidden shrink-0">
                  <img 
                    src={settings.logo && settings.logo !== '/logo.png' ? settings.logo : '/logo.png'} 
                    alt={settings.siteName || 'Logo'} 
                    className="w-full h-full object-contain p-2" 
                  />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Admin Access</h2>
              <p className="text-slate-500 mt-2">Enter your credentials to continue</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Icon name="mail" size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="Enter email"
                    autoFocus
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Icon name="lock" size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                    placeholder="Enter password"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <m.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2"
                >
                  <Icon name="alert-circle" size={16} />
                  {loginError}
                </m.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Icon name="log-in" size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Keyboard shortcut hint only - NO credentials */}
            <p className="text-center text-xs text-slate-400 mt-6">
              Press <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-600">Ctrl</kbd> + <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-600">Shift</kbd> + <kbd className="px-2 py-1 bg-slate-100 rounded text-slate-600">A</kbd> to open
            </p>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AdminLogin;
