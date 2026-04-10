/**
 * In-memory TTL cache for async data (Vite/React SPA).
 * Next.js `fetch(..., { next: { revalidate: 300 } })` only exists on the server;
 * this gives a similar 5-minute freshness window per tab session and cuts repeat Supabase reads.
 */
const store = new Map();

/**
 * @template T
 * @param {string} key Stable cache key
 * @param {number} ttlMs Time-to-live in ms (e.g. 300_000 = 5 minutes)
 * @param {() => Promise<T>} factory
 * @param {{ shouldCache?: (data: T) => boolean }} [options] If `shouldCache` returns false, result is not stored (e.g. avoid caching empty lists).
 * @returns {Promise<T>}
 */
export async function fetchWithTtl(key, ttlMs, factory, options = {}) {
  const shouldCache =
    typeof options.shouldCache === "function" ? options.shouldCache : () => true;
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) {
    return hit.data;
  }
  const data = await factory();
  if (shouldCache(data)) {
    store.set(key, { at: now, data });
  }
  return data;
}

/** Clear one key or entire cache (e.g. after admin edits). */
export function clearTtlCache(key) {
  if (key) store.delete(key);
  else store.clear();
}

/** Force-set cached value (e.g. after a fresh `fetchAllGenresRows` in the menu). */
export function setTtlCache(key, data) {
  store.set(key, { at: Date.now(), data });
}
