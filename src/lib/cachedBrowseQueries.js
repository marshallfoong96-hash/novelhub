import { fetchWithTtl } from "./ttlCache";
import { MITRUYEN_DATA_CACHE_PREFIX } from "./cacheDataPrefix";

const P = MITRUYEN_DATA_CACHE_PREFIX;
const TTL_BROWSE_MS = 3 * 60 * 1000;
const TTL_BROWSE_COUNT_MS = 90 * 1000;
const TTL_CHAPTER_RANGE_MS = 2 * 60 * 1000;

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const CATEGORY_META_CHUNK = 120;

/**
 * Sorted novel ids for category browse (junction + legacy `genre_id`, then by `created_at` desc).
 */
export async function fetchCategorySortedIdsCached(supabase, genreId) {
  const gid = Number(genreId);
  if (!supabase || Number.isNaN(gid)) return [];
  return fetchWithTtl(
    `${P}browse:categoryIds:v1:${gid}`,
    TTL_BROWSE_MS,
    async () => {
      const merged = new Set();
      const { data: junctionRows, error: junctionError } = await supabase
        .from("novel_genres")
        .select("novel_id")
        .eq("genre_id", gid);
      if (!junctionError && junctionRows) {
        junctionRows.forEach((row) => merged.add(row.novel_id));
      }
      const { data: directRows } = await supabase.from("novels").select("id").eq("genre_id", gid);
      (directRows || []).forEach((row) => merged.add(row.id));
      const ids = [...merged];
      if (ids.length === 0) return [];
      const chunks = chunkArray(ids, CATEGORY_META_CHUNK);
      const minimal = [];
      for (const part of chunks) {
        const { data: metaRows, error: metaError } = await supabase
          .from("novels")
          .select("id,created_at,view_count")
          .in("id", part);
        if (metaError) throw metaError;
        minimal.push(...(metaRows || []));
      }
      minimal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return minimal.map((m) => m.id);
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}

export async function fetchBrowseNovelCountCached(supabase, mode) {
  const m = String(mode || "all");
  if (!supabase) return 0;
  return fetchWithTtl(
    `${P}browse:count:v1:${m}`,
    TTL_BROWSE_COUNT_MS,
    async () => {
      let q = supabase.from("novels").select("*", { count: "exact", head: true });
      if (m === "completed") q = q.eq("status", "completed");
      if (m === "ongoing") q = q.eq("status", "ongoing");
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    { shouldCache: (c) => typeof c === "number" && c >= 0 }
  );
}

/** One `.range(from, to)` page — mirrors `BrowseNovels` `buildQuery`. */
export async function fetchBrowseNovelSliceCached(supabase, mode, from, to) {
  const m = String(mode || "all");
  if (!supabase) return [];
  return fetchWithTtl(
    `${P}browse:novelSlice:v1:${m}:${from}:${to}`,
    TTL_BROWSE_MS,
    async () => {
      let query = supabase.from("novels").select("*").range(from, to);
      if (m === "hot") {
        query = query.order("view_count", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      if (m === "completed") query = query.eq("status", "completed");
      if (m === "ongoing") query = query.eq("status", "ongoing");
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}

const NOVEL_STATS_CHUNK = 200;

async function latestChapterNumberMapInternal(supabase, novelIds) {
  const counts = {};
  const ids = [...new Set((novelIds || []).filter((id) => id != null))];
  for (let i = 0; i < ids.length; i += NOVEL_STATS_CHUNK) {
    const slice = ids.slice(i, i + NOVEL_STATS_CHUNK);
    const { data: statRows, error } = await supabase.rpc("novel_chapter_stats", {
      p_novel_ids: slice,
    });
    if (error) throw error;
    (statRows || []).forEach((row) => {
      const nid = row.novel_id;
      const cn = row.latest_chapter_number;
      if (nid == null || cn == null) return;
      const n = Number(cn);
      if (!Number.isNaN(n)) counts[nid] = n;
    });
  }
  return counts;
}

/**
 * Full `novels` list + chapter stats — heavy; one bundle per tab (filter by chapter count is client-side).
 */
export async function fetchChapterRangeNovelsAndStatsCached(supabase) {
  if (!supabase) return { list: [], counts: {} };
  return fetchWithTtl(
    `${P}browse:chapterRangeBundle:v1:global`,
    TTL_CHAPTER_RANGE_MS,
    async () => {
      const { data: allNovels, error: novelsError } = await supabase
        .from("novels")
        .select("*")
        .order("created_at", { ascending: false });
      if (novelsError) throw novelsError;
      const list = allNovels || [];
      const novelIds = list.map((n) => n.id).filter((id) => id != null);
      const counts = await latestChapterNumberMapInternal(supabase, novelIds);
      return { list, counts };
    },
    { shouldCache: (x) => x != null && Array.isArray(x.list) && x.counts != null && typeof x.counts === "object" }
  );
}

/** Merged novel ids in a genre — NovelDetail “related” candidate pool. */
export async function fetchNovelIdsForGenreMergedCached(supabase, genreId) {
  const gid = Number(genreId);
  if (!supabase || Number.isNaN(gid)) return [];
  return fetchWithTtl(
    `${P}browse:genreNovelIds:v1:${gid}`,
    TTL_BROWSE_MS,
    async () => {
      const merged = new Set();
      const { data: junctionRows, error: junctionError } = await supabase
        .from("novel_genres")
        .select("novel_id")
        .eq("genre_id", gid);
      if (!junctionError && junctionRows) {
        junctionRows.forEach((row) => merged.add(row.novel_id));
      }
      const { data: directRows } = await supabase.from("novels").select("id").eq("genre_id", gid);
      (directRows || []).forEach((row) => merged.add(row.id));
      return [...merged];
    },
    { shouldCache: (d) => Array.isArray(d) }
  );
}
