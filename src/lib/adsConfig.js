/**
 * Google AdSense (display) — script is in index.html; client id here must match.
 * Override with VITE_ADSENSE_CLIENT / VITE_ADSENSE_SLOT_* in .env if needed.
 */

export const ADSENSE_CLIENT =
  import.meta.env.VITE_ADSENSE_CLIENT?.trim() || "ca-pub-6602775323692698";

const SLOT_KEYS = {
  home: "VITE_ADSENSE_SLOT_HOME",
  detail: "VITE_ADSENSE_SLOT_DETAIL",
  chapterTop: "VITE_ADSENSE_SLOT_CHAPTER_TOP",
  chapterBottom: "VITE_ADSENSE_SLOT_CHAPTER_BOTTOM"
};

export function resolveAdSlot(placement) {
  const envName = SLOT_KEYS[placement];
  const specific = envName ? import.meta.env[envName]?.trim() : "";
  const fallback = import.meta.env.VITE_ADSENSE_SLOT_DEFAULT?.trim() || "";
  return specific || fallback || "";
}

export function isAdsConfigured(placement) {
  return Boolean(ADSENSE_CLIENT && resolveAdSlot(placement));
}

let scriptRequested = false;

/** Loads adsbygoogle.js once (call from App mount). Skips if already in index.html. */
export function loadAdsenseScript() {
  if (typeof document === "undefined") return;
  if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) {
    scriptRequested = true;
    return;
  }
  if (!ADSENSE_CLIENT || scriptRequested) return;
  if (document.querySelector("script[data-mi-adsense]")) {
    scriptRequested = true;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-mi-adsense", "1");
  document.head.appendChild(s);
  scriptRequested = true;
}
