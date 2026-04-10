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
 * @returns {Promise<T>}
 */
export async function fetchWithTtl(key, ttlMs, factory) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) {
    return hit.data;
  }
  const data = await factory();
  store.set(key, { at: now, data });
  return data;
}

/** Clear one key or entire cache (e.g. after admin edits). */
export function clearTtlCache(key) {
  if (key) store.delete(key);
  else store.clear();
}
