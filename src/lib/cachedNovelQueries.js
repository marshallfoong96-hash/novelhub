import { fetchWithTtl, clearTtlCache, clearTtlCachePrefix } from "./ttlCache";
import { fetchChapterTocForNovel } from "./fetchAllChapters";
import { MITRUYEN_DATA_CACHE_PREFIX } from "./cacheDataPrefix";

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

// --- Novel detail / reader (`MITRUYEN_DATA_CACHE_PREFIX` — clear with `clearTtlCachePrefix` or `clearNovelTtlForId`) ---

const P = MITRUYEN_DATA_CACHE_PREFIX;
const TTL_NOVEL_DETAIL_MS = 3 * 60 * 1000;

/** After view_count RPC or admin edits — drop row + TOC + genre junction for one book. */
export function clearNovelTtlForId(novelId) {
  const n = Number(novelId);
  if (Number.isNaN(n)) return;
  clearTtlCache(`${P}novel:row:detail:v1:${n}`);
  clearTtlCache(`${P}novel:ng:v1:${n}`);
  clearTtlCache(`${P}novel:toc:v1:${n}`);
  clearTtlCachePrefix(`${P}novel:row:reader:v1:${n}:`);
}

export async function fetchNovelRowDetailByIdCached(supabase, novelId) {
  const id = Number(novelId);
  if (!supabase || Number.isNaN(id)) return null;
  return fetchWithTtl(
    `${P}novel:row:detail:v1:${id}`,
    TTL_NOVEL_DETAIL_MS,
    async () => {
      const { data, error } = await supabase.from("novels").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    { shouldCache: (d) => d != null && d.id != null }
  );
}

/** Reader chrome — small select; key includes select string. */
export async function fetchNovelRowReaderByIdCached(supabase, novelId, select) {
  const id = Number(novelId);
  if (!supabase || Number.isNaN(id)) return null;
  const sel = String(select || "id,title,cover_url");
  return fetchWithTtl(
    `${P}novel:row:reader:v1:${id}:${sel}`,
    TTL_NOVEL_DETAIL_MS,
    async () => {
      const { data, error } = await supabase.from("novels").select(sel).eq("id", id).single();
      if (error) throw error;
      return data;
    },
    { shouldCache: (d) => d != null && d.id != null }
  );
}

export async function fetchNovelGenresJunctionCached(supabase, novelId) {
  const id = Number(novelId);
  if (!supabase || Number.isNaN(id)) return [];
  return fetchWithTtl(
    `${P}novel:ng:v1:${id}`,
    TTL_NOVEL_DETAIL_MS,
    async () => {
      const { data, error } = await supabase.from("novel_genres").select("genre_id").eq("novel_id", id);
      if (error) throw error;
      return data ?? [];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}

export async function fetchGenresMiniByIdsCached(supabase, genreIds) {
  if (!supabase) return [];
  const list = [
    ...new Set((genreIds || []).map(Number).filter((n) => !Number.isNaN(n))),
  ].sort((a, b) => a - b);
  if (list.length === 0) return [];
  const key = `${P}novel:genresMini:v1:${list.join(",")}`;
  return fetchWithTtl(
    key,
    TTL_NOVEL_DETAIL_MS,
    async () => {
      const { data, error } = await supabase.from("genres").select("id,name,slug").in("id", list);
      if (error) throw error;
      return data ?? [];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}

export async function fetchChapterTocForNovelCached(supabase, novelId) {
  const nid = Number(novelId);
  if (!supabase || Number.isNaN(nid)) return [];
  return fetchWithTtl(
    `${P}novel:toc:v1:${nid}`,
    TTL_NOVEL_DETAIL_MS,
    () => fetchChapterTocForNovel(supabase, nid),
    { shouldCache: (d) => Array.isArray(d) }
  );
}
