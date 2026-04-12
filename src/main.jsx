import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isChunkOrModuleLoadError, tryHardReloadOnceForStaleChunks } from './lib/chunkRecovery';

/** Vite: prefetch / dynamic import can fail with stale chunk after deploy (same as lazyWithRetry). */
window.addEventListener('vite:preloadError', (event) => {
  const err = event?.payload;
  if (isChunkOrModuleLoadError(err) && tryHardReloadOnceForStaleChunks()) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
