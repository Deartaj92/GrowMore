import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/useToast';
import ErrorBoundary from './components/ErrorBoundary';

// Handle chunk loading errors (common in production builds)
window.addEventListener('error', (event) => {
  // Check if it's a chunk loading error
  if (
    event.message.includes('Loading chunk') ||
    event.message.includes('Failed to fetch dynamically imported module') ||
    event.message.includes('ChunkLoadError')
  ) {
    console.error('Chunk loading error detected, reloading page...', event);
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
    console.error('Chunk loading promise rejection, reloading page...', event);
    window.location.reload();
  }
});

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider theme="dark">
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
