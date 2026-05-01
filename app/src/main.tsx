import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { HelmetProvider } from 'react-helmet-async';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)

// Register Service Worker for PWA (Delayed to prioritize hydration)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const register = () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    };

    // Use requestIdleCallback if available, otherwise fallback to 4s delay
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => register(), { timeout: 4000 });
    } else {
      setTimeout(register, 4000);
    }
  });
}
