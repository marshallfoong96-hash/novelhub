/**
 * In-memory TTL cache for async data (Vite/React SPA).
 * Next.js `fetch(..., { next: { revalidate: 300 } })` only exists on the server;
 * this gives a similar 5-minute freshness window per tab session and cuts repeat Supabase reads.
 *
 * Concurrent calls with the same `key` share one in-flight `factory()` (single-flight),
 * so e.g. Header + Home both calling `fetchGenresCached` on first paint only hit the network once.
 */
const store = new Map();
/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

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

  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const data = await factory();
        if (shouldCache(data)) {
          store.set(key, { at: Date.now(), data });
        }
        return data;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }
  return pending;
}

/** Clear one key or entire cache (e.g. after admin edits). */
export function clearTtlCache(key) {
  if (key) store.delete(key);
  else store.clear();
}

/** Clear every key whose string starts with `prefix` (e.g. `mitruyen:data:` after admin bulk edit). */
export function clearTtlCachePrefix(prefix) {
  const p = String(prefix || "");
  if (!p) return;
  for (const key of [...store.keys()]) {
    if (key.startsWith(p)) store.delete(key);
  }
}

/** Force-set cached value (e.g. after a fresh `fetchAllGenresRows` in the menu). */
export function setTtlCache(key, data) {
  store.set(key, { at: Date.now(), data });
}
