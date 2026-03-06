import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import Loader from './components/Loader';

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('SW registration failed: ', err);
    });
  });
}

// Handle chunk loading errors (common in production builds)
window.addEventListener('error', (event) => {
  if (
    event.message.includes('Loading chunk') ||
    event.message.includes('Failed to fetch dynamically imported module') ||
    event.message.includes('ChunkLoadError')
  ) {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      console.warn('Offline: Postponing asset reload until connection is restored.');
    }
  }
});

// Handle unhandled promise rejections (e.g., from dynamic imports)
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('Loading chunk') ||
    event.reason?.message?.includes('Failed to fetch dynamically imported module')
  ) {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      console.warn('Offline: Postponing asset reload until connection is restored.');
    }
  }
});

const SPLASH_DURATION_MS = 2600;

function Root() {
  const [showSplash, setShowSplash] = useState(true);
  const [offlineNotice, setOfflineNotice] = useState(false);

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);

    // If it takes >10s and we're offline, show a hint
    const offlineTimer = setTimeout(() => {
      if (!navigator.onLine) setOfflineNotice(true);
    }, 10000);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(offlineTimer);
    };
  }, []);

  return (
    <>
      {showSplash && (
        <div style={{ position: 'relative' }}>
          <Loader fullScreenDark size="medium" centered />
          {offlineNotice && (
            <div style={{
              position: 'fixed', bottom: '20%', left: '50%', transform: 'translateX(-50%)',
              color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', zIndex: 10001
            }}>
              Starting in Offline Mode...
            </div>
          )}
        </div>
      )}
      {!showSplash && (
        <ToastProvider theme="dark">
          <App />
        </ToastProvider>
      )}
    </>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);
