export const SHOPEE_AFFILIATE_URL = 'https://s.shopee.vn/2qQYMQXFhu';

let networkWarmed = false;

/**
 * Gọi khi vào trang đọc chương / mở gate — không prefetch HTML affiliate (tránh hit nhầm tracking);
 * chỉ dns-prefetch domain đích sau redirect (thường là shopee.vn).
 * Idempotent mỗi tab.
 */
export function warmShopeeAffiliateForReader() {
  if (networkWarmed || typeof document === 'undefined') return;
  networkWarmed = true;

  if (document.getElementById('mi-shopee-dns-landing')) return;
  const l = document.createElement('link');
  l.id = 'mi-shopee-dns-landing';
  l.rel = 'dns-prefetch';
  l.href = 'https://shopee.vn';
  document.head.appendChild(l);
}

/** Preload sticker dùng trên modal (tránh pop-up trống khi ảnh chưa về). */
export function preloadShopeeGateStickers(getSticker) {
  if (typeof Image === 'undefined' || typeof getSticker !== 'function') return;
  [0, 2].forEach((idx) => {
    try {
      const img = new Image();
      if ('fetchPriority' in img) img.fetchPriority = 'high';
      img.src = getSticker(idx);
    } catch {
      /* ignore */
    }
  });
}

/** Đã hiện / đã đóng gate Shopee trong tab này — không hiện lại đến khi đóng tab. */
export const SHOPEE_GATE_SESSION_KEY = 'mi_shopee_gate_shown_this_tab';

export function lastChapterStorageKey(novelId) {
  return `mi_shopee_last_ch_${novelId}`;
}

export function isShopeeGateSessionConsumed() {
  try {
    return sessionStorage.getItem(SHOPEE_GATE_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markShopeeGateSessionConsumed() {
  try {
    sessionStorage.setItem(SHOPEE_GATE_SESSION_KEY, '1');
  } catch {
    /* private mode */
  }
}
