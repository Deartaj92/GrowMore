import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/useToast';
import ErrorBoundary from './components/ErrorBoundary';
import { finishBootSplash, getBootProgress, setBootProgress } from './utils/bootSplash';

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';

    const appVersion = process.env.REACT_APP_VERSION || process.env.npm_package_version || 'dev';
    const swUrl = `/sw.js?v=${encodeURIComponent(appVersion)}`;

    if (isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames
            .filter((cacheName) => cacheName.startsWith('growmore-'))
            .forEach((cacheName) => caches.delete(cacheName));
        });
      }
      return;
    }

    let hasPendingReload = false;
    const reloadForFreshWorker = () => {
      if (hasPendingReload) return;
      hasPendingReload = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', reloadForFreshWorker);

    navigator.serviceWorker.register(swUrl).then((registration) => {
      registration.update();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            registration.update();
          }
        });
      });
    }).catch(err => {
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

const BOOT_HANDOFF_MIN_MS = 380;
const BOOT_ABORT_MS = 12000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function Root() {
  const [offlineNotice, setOfflineNotice] = useState(false);

  useEffect(() => {
    const offlineTimer = window.setTimeout(() => {
      if (!navigator.onLine) {
        setOfflineNotice(true);
        // Automatically hide it after 4 seconds so it doesn't stay stuck
        setTimeout(() => setOfflineNotice(false), 4000);
      }
    }, 10000);

    const handleOnline = () => setOfflineNotice(false);
    window.addEventListener('online', handleOnline);

    let cancelled = false;

    const runBoot = async () => {
      const start = performance.now();
      setBootProgress(Math.max(getBootProgress(), 82));

      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
      if (cancelled) return;

      setBootProgress(Math.max(getBootProgress(), 90));

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      if (cancelled) return;

      setBootProgress(Math.max(getBootProgress(), 96));

      const elapsed = performance.now() - start;
      const waitMore = Math.max(0, BOOT_HANDOFF_MIN_MS - elapsed);
      await delay(waitMore);
      if (cancelled) return;

      finishBootSplash();
    };

    const bootPromise = runBoot();
    const timeoutPromise = delay(BOOT_ABORT_MS).then(() => {
      if (!cancelled) finishBootSplash();
    });

    void Promise.race([bootPromise, timeoutPromise]);

    return () => {
      cancelled = true;
      window.clearTimeout(offlineTimer);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <>
      {offlineNotice && (
        <div
          style={{
            position: 'fixed',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#94a3b8',
            fontSize: '0.9rem',
            textAlign: 'center',
            zIndex: 2147483646,
          }}
        >
          Starting in Offline Mode...
        </div>
      )}
      <ToastProvider theme="dark">
        <App />
      </ToastProvider>
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
