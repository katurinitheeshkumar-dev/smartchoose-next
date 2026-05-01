"use client";
import { useEffect } from 'react';
import { Icon } from './Icon';

interface ToastProps {
  message: string;
  show: boolean;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, show, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onClose, duration]);

  if (!show) return null;

  const iconMap = {
    success: 'check-circle',
    error: 'alert-circle',
    info: 'info'
  };

  const bgMap = {
    success: 'from-sky-500 to-teal-500',
    error: 'from-red-500 to-red-600',
    info: 'from-blue-500 to-blue-600'
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-[9999] transform transition-all duration-300 ${
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`bg-gradient-to-r ${bgMap[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px]`}>
        <Icon name={iconMap[type]} size={20} />
        <span className="font-medium text-sm">{message}</span>
        <button 
          onClick={onClose}
          className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}

export default Toast;
