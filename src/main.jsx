import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './fonts/beVietnamPro.js';
import './index.css';
import { isChunkOrModuleLoadError, tryHardReloadOnceForStaleChunks } from './lib/chunkRecovery';

/** Rút ngắn TLS + TCP tới Supabase (API) trên lần tải đầu. */
(function preconnectSupabaseOrigin() {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (!raw || typeof document === 'undefined') return;
  try {
    const origin = new URL(raw).origin;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch {
    /* ignore invalid env */
  }
})();

/** Default: weserv proxy for external covers — dns-prefetch unless VITE_COVER_IMAGE_PROXY=off */
(function preconnectCoverProxy() {
  if (typeof document === "undefined") return;
  const v = String(import.meta.env.VITE_COVER_IMAGE_PROXY || "").trim().toLowerCase();
  if (v === "off" || v === "false" || v === "0" || v === "none" || v === "disabled") return;
  const link = document.createElement("link");
  link.rel = "dns-prefetch";
  link.href = "https://images.weserv.nl";
  document.head.appendChild(link);
})();

/** Warm cover CDN/R2 origin so first visible covers appear sooner on cold start. */
(function preconnectCoverCdn() {
  if (typeof document === "undefined") return;
  const raw =
    import.meta.env.VITE_PUBLIC_ASSETS_BASE ||
    import.meta.env.VITE_CDN_COVER_BASE ||
    "";
  if (!raw) return;
  try {
    const origin = new URL(raw).origin;
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = origin;
    preconnect.crossOrigin = "anonymous";
    document.head.appendChild(preconnect);

    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = origin;
    document.head.appendChild(dnsPrefetch);
  } catch {
    /* ignore invalid env */
  }
})();

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

/** Mi Truyện static cache — `/sw.js` reserved for third-party (e.g. verification / ad worker). Bump CACHE in mitruyen-static-sw.js after major asset changes. */
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      navigator.serviceWorker.register('/mitruyen-static-sw.js').catch(() => {});
    },
    { once: true }
  );
}
