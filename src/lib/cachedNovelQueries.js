import { fetchWithTtl } from "./ttlCache";

/** Short — search & title match. */
const TTL_SEARCH_MS = 60 * 1000;
/** By-id lists (notifications, bookmarks, profile). */
const TTL_BY_IDS_MS = 2 * 60 * 1000;
/** Hot leaderboard rows (view_count). */
const TTL_HOT_MS = 3 * 60 * 1000;

const SEARCH_SELECT = "id,title,author,cover_url,view_count";

function normalizeKeyword(keyword) {
  return String(keyword || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sortedIdKey(ids) {
  return [...new Set(ids)]
    .filter((id) => id != null)
    .map(String)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(",");
}

/** Title search — always fetch up to 8 rows; same cache for dropdown + Enter submit. */
export async function fetchNovelsTitleSearchRowsCached(supabase, keyword) {
  const q = normalizeKeyword(keyword);
  if (!q) return [];
  const cacheKey = `mitruyen:novels:titleSearch:v1:${q}`;
  return fetchWithTtl(
    cacheKey,
    TTL_SEARCH_MS,
    async () => {
      const { data, error } = await supabase
        .from("novels")
        .select(SEARCH_SELECT)
        .ilike("title", `%${q}%`)
        .order("view_count", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}

/** `.in(id, …)` with stable cache key (sorted ids + select list). */
export async function fetchNovelsByIdsCached(supabase, ids, select, options = {}) {
  const ttl = options.ttlMs ?? TTL_BY_IDS_MS;
  const list = [...new Set((ids || []).filter((id) => id != null))];
  if (list.length === 0) return [];
  const key = `mitruyen:novels:byIds:v1:${select}:${sortedIdKey(list)}`;
  return fetchWithTtl(
    key,
    ttl,
    async () => {
      const { data, error } = await supabase.from("novels").select(select).in("id", list);
      if (error) throw error;
      return data ?? [];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}

/**
 * Hot list by view_count — shared by search fallback & any “top N” cards.
 */
export async function fetchHotNovelCardsCached(supabase, limit = 6) {
  const lim = Math.min(48, Math.max(1, Number(limit) || 6));
  const key = `mitruyen:novels:hotCards:v1:${lim}`;
  return fetchWithTtl(
    key,
    TTL_HOT_MS,
    async () => {
      const { data, error } = await supabase
        .from("novels")
        .select(SEARCH_SELECT)
        .order("view_count", { ascending: false })
        .limit(lim);
      if (error) throw error;
      return data ?? [];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}
