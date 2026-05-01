import { m, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

interface NotificationPopupProps {
  show: boolean;
  onClose: () => void;
  onSubscribe: () => Promise<void>;
  loading: boolean;
  title: string;
  description: string;
  color?: 'blue' | 'emerald' | 'indigo';
}

export function NotificationPopup({ 
  show, 
  onClose, 
  onSubscribe, 
  loading, 
  title, 
  description,
  color = 'blue'
}: NotificationPopupProps) {
  
  const colorClasses = {
    blue: 'bg-sky-600',
    emerald: 'bg-emerald-600',
    indigo: 'bg-indigo-600'
  };

  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ opacity: 0, x: 100, y: 0 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 100, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100] max-w-[320px] w-full"
        >
          <div className={`${colorClasses[color]} rounded-2xl p-5 text-white shadow-2xl relative overflow-hidden group`}>
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors z-20"
            >
              <Icon name="x" size={16} />
            </button>

            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
                  <Icon name="bell" size={20} />
                </div>
                <h3 className="font-black text-sm leading-tight">{title}</h3>
              </div>
              
              <p className="text-white/80 text-xs font-medium leading-relaxed">
                {description}
              </p>

              <button 
                onClick={onSubscribe}
                disabled={loading}
                className="w-full bg-white text-slate-900 py-2.5 rounded-xl font-black text-xs hover:bg-opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon name="zap" size={14} />
                )}
                {loading ? 'Working...' : 'Notify Me'}
              </button>
            </div>

            {/* Abstract Background Decoration */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
