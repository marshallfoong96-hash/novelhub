/**
 * Sau ~20 phút không tương tác, lần chạm/chuột đầu tiên chuyển tới link affiliate (mặc định TikTok).
 * Tắt: VITE_IDLE_AFFILIATE_URL=off
 * Đổi link: VITE_IDLE_AFFILIATE_URL=https://...
 */
const DEFAULT_URL = "https://vt.tiktok.com/ZS9LbDanX1svu-sdHUf/";
const IDLE_MS = 20 * 60 * 1000;

function throttle(fn, wait) {
  let last = 0;
  return (...args) => {
    const n = Date.now();
    if (n - last >= wait) {
      last = n;
      fn(...args);
    }
  };
}

export function initIdleAffiliateGate() {
  const env = import.meta.env.VITE_IDLE_AFFILIATE_URL?.trim();
  if (env === "0" || env === "off" || env === "false") {
    return () => {};
  }

  const url = env || DEFAULT_URL;
  let lastActivity = Date.now();

  const refreshActivity = () => {
    lastActivity = Date.now();
  };

  const onScrollKey = refreshActivity;
  const throttledMouse = throttle(refreshActivity, 4000);

  window.addEventListener("scroll", onScrollKey, { passive: true });
  window.addEventListener("keydown", onScrollKey);
  window.addEventListener("touchstart", refreshActivity, { passive: true });
  window.addEventListener("mousemove", throttledMouse, { passive: true });

  const onPointerDown = (e) => {
    if (Date.now() - lastActivity > IDLE_MS) {
      window.location.assign(url);
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }
      return;
    }
    refreshActivity();
  };

  window.addEventListener("pointerdown", onPointerDown, true);

  return () => {
    window.removeEventListener("scroll", onScrollKey);
    window.removeEventListener("keydown", onScrollKey);
    window.removeEventListener("touchstart", refreshActivity);
    window.removeEventListener("mousemove", throttledMouse);
    window.removeEventListener("pointerdown", onPointerDown, true);
  };
}
