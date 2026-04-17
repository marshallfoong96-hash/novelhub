/** Shopee affiliate product link (utm + tracking params from Shopee). */
export const SHOPEE_AFFILIATE_URL =
  'https://shopee.vn/product/1342960766/26470338673?credential_token=8wEwiDL7YDtwo76PKe2hcgs3ztXMAZU176RabL7HFe&exp_group=rollout&gads_t_sig=gqRjZGVrxHCFomtpsTE0MjUxOnRzc19zZGtfa2V5omt20QABpGFsZ2_SAAAAZKNkZWvAomN0xEAAAAAMRvS3L9OTXdZ5FJNxILig8p7lQ7pNpXYtdZAbsM8MQrkGmzJ0eOQRwaQfuYgAF9FAqYvxRTQ9oVrOjPOJqmNpcGhlcnRleHTElQAAAAwOZu43RKkgx-OrGOmdmcAxXp_Q7vUH5qnSf6pDyw5zJbsKfOulP0b4UWRZgOX_G8zAdjZVExnfnc_4hO1EpYKAuXXk6LcdBT1ks3rBddjbl8NUA9RQ6g5UhQBJVMoNA31V8FaHYR1X5mzR5qfPrQbxi2OPXTZ9AptmMa7p6Ojg2v8_XGAGU3elYhgXBQXZOp4a&mmp_pid=an_17365520542&uls_trackid=55dvgjrc0071&utm_campaign=id_ZZTmbEPbTB&utm_content=----&utm_medium=affiliates&utm_source=an_17365520542&utm_term=erfusxf2jfm1';

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
