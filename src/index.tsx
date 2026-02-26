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
  // Check if it's a chunk loading error
  if (
    event.message.includes('Loading chunk') ||
    event.message.includes('Failed to fetch dynamically imported module') ||
    event.message.includes('ChunkLoadError')
  ) {
    // Reload the page to get fresh chunks
    window.location.reload();
  }
});

// Handle unhandled promise rejections (e.g., from dynamic imports)
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('Loading chunk') ||
    event.reason?.message?.includes('Failed to fetch dynamically imported module')
  ) {
    window.location.reload();
  }
});

const SPLASH_DURATION_MS = 2600;

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {showSplash && <Loader fullScreenDark size="medium" centered />}
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
