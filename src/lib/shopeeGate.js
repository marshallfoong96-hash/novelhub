/** Shopee affiliate product link (utm + tracking params from Shopee). */
export const SHOPEE_AFFILIATE_URL =
  'https://shopee.vn/product/1103552734/23859356643?credential_token=8wEwiDL7YDdAYvRkQDVYQkdhVX4qviJExfFr5voz6H&exp_group=rollout&gads_t_sig=gqRjZGVrxHCFomtpsTE0MjUxOnRzc19zZGtfa2V5omt20QABpGFsZ2_SAAAAZKNkZWvAomN0xEAAAAAMRvS3L9OTXdZ5FJNxILig8p7lQ7pNpXYtdZAbsM8MQrkGmzJ0eOQRwaQfuYgAF9FAqYvxRTQ9oVrOjPOJqmNpcGhlcnRleHTElQAAAAzxcLYbOjjnUclEOBPOBkAH7RBqbpLnaIzeHmyyeAnj2ptFR9NvXDpGb47t-AI88mW1LlC5LmPticmPiq8A3XYlZzGzEVKLL63Siz722dWzhUumcKNw7zjyTakkCQrOzq8pLpqPZwX3U_UDVjQL6bQQIegyxtJcvDWbfWib8gs00oE6fv2eFgs5I4jtcdvA5HIZ&mmp_pid=an_17339790535&uls_trackid=55dv7dg2005q&utm_campaign=id_HSfgUxGdG1&utm_content=----&utm_medium=affiliates&utm_source=an_17339790535&utm_term=erfnq8mrkgyv';

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
