export const SHOPEE_AFFILIATE_URL = 'https://s.shopee.vn/2qQYMQXFhu';

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
