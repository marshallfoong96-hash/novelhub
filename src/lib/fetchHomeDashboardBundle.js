import { supabase, isSupabaseConfigured } from "./supabase";
import { fetchGenresCached, primeGenresCache } from "./cachedQueries";

export const HOME_NOVEL_LIST_SELECT =
  "id,title,cover_url,view_count,status,created_at,description,likes,follow_count";

const HOME_NOVEL_RECENT = 120;
const HOME_NOVEL_HOT = 120;

function applyChapterStats(novels, statRows) {
  const firstChapterMap = {};
  const latestChapterMap = {};
  if (Array.isArray(statRows)) {
    statRows.forEach((row) => {
      const nid = row.novel_id;
      if (row.first_chapter_id != null) firstChapterMap[nid] = row.first_chapter_id;
      if (row.latest_chapter_number != null) {
        const cn = Number(row.latest_chapter_number);
        if (!Number.isNaN(cn)) latestChapterMap[nid] = cn;
      }
    });
  }
  return novels.map((novel) => ({
    ...novel,
    first_chapter_id: firstChapterMap[novel.id] || null,
    latest_chapter_number: latestChapterMap[novel.id] ?? null,
  }));
}

async function fetchChapterStatsFallback(novelIds) {
  if (!supabase || novelIds.length === 0) return [];
  const { data: statRows, error: statError } = await supabase.rpc("novel_chapter_stats", {
    p_novel_ids: novelIds,
  });
  if (!statError && Array.isArray(statRows)) return statRows;
  console.warn(
    "[Home] novel_chapter_stats RPC — chạy `supabase/novel_chapter_stats.sql`. Fallback:",
    statError?.message || statError
  );
  const chapterResult = await supabase
    .from("chapters")
    .select("id,novel_id,chapter_number")
    .in("novel_id", novelIds)
    .order("chapter_number", { ascending: true });
  const chapterRows = chapterResult.data || [];
  const firstChapterMap = {};
  const latestChapterMap = {};
  chapterRows.forEach((chapter) => {
    const nid = chapter.novel_id;
    if (!firstChapterMap[nid]) firstChapterMap[nid] = chapter.id;
    const cn = Number(chapter.chapter_number);
    if (nid != null && !Number.isNaN(cn)) {
      const prev = latestChapterMap[nid];
      if (prev == null || cn > prev) latestChapterMap[nid] = cn;
    }
  });
  return novelIds.map((novel_id) => ({
    novel_id,
    first_chapter_id: firstChapterMap[novel_id] ?? null,
    latest_chapter_number: latestChapterMap[novel_id] ?? null,
  }));
}

/**
 * Legacy multi-request path (if `home_dashboard` RPC is missing or errors).
 * @returns {Promise<{ novelsWithFirstChapter: object[], genresData: object[] }>}
 */
export async function fetchHomeDashboardLegacy() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }

  const genresData = await fetchGenresCached();

  const [recentRes, hotRes] = await Promise.all([
    supabase
      .from("novels")
      .select(HOME_NOVEL_LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(HOME_NOVEL_RECENT),
    supabase
      .from("novels")
      .select(HOME_NOVEL_LIST_SELECT)
      .order("view_count", { ascending: false })
      .limit(HOME_NOVEL_HOT),
  ]);

  if (recentRes.error) throw recentRes.error;
  if (hotRes.error) throw hotRes.error;

  const merged = new Map();
  for (const n of recentRes.data || []) merged.set(n.id, n);
  for (const n of hotRes.data || []) merged.set(n.id, n);
  const novels = [...merged.values()];
  const novelIds = novels.map((novel) => novel.id);
  const statRows = await fetchChapterStatsFallback(novelIds);
  const novelsWithFirstChapter = applyChapterStats(novels, statRows);

  return { novelsWithFirstChapter, genresData };
}

/**
 * Preferred: one RPC for genres + lists + stats. Falls back to {@link fetchHomeDashboardLegacy}.
 */
export async function fetchHomeDashboardBundle() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.rpc("home_dashboard", {
    p_recent_limit: HOME_NOVEL_RECENT,
    p_hot_limit: HOME_NOVEL_HOT,
  });

  if (error || data == null || typeof data !== "object") {
    console.warn("[Home] home_dashboard RPC unavailable, using legacy fetches:", error?.message || error);
    return fetchHomeDashboardLegacy();
  }

  const genresData = Array.isArray(data.genres) ? data.genres : [];
  primeGenresCache(genresData);

  const recent = Array.isArray(data.recent) ? data.recent : [];
  const hot = Array.isArray(data.hot) ? data.hot : [];
  const merged = new Map();
  for (const n of recent) merged.set(n.id, n);
  for (const n of hot) merged.set(n.id, n);
  const novels = [...merged.values()];
  const statRows = Array.isArray(data.chapter_stats) ? data.chapter_stats : [];
  const novelsWithFirstChapter = applyChapterStats(novels, statRows);

  return { novelsWithFirstChapter, genresData };
}

/**
 * Independent ranking windows by read volume.
 * Preferred: RPC `novel_rankings_windows` over event table; fallback keeps current behavior.
 */
export async function fetchHomeRankingWindows() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase.rpc("novel_rankings_windows", {
    p_limit: 50,
  });

  if (!error && data && typeof data === "object") {
    const day = Array.isArray(data.day) ? data.day : [];
    const week = Array.isArray(data.week) ? data.week : [];
    const month = Array.isArray(data.month) ? data.month : [];
    return { day, week, month };
  }

  // Fallback: keep showing total view_count ranking if RPC is not installed yet.
  const { novelsWithFirstChapter } = await fetchHomeDashboardLegacy();
  const byViews = [...novelsWithFirstChapter].sort(
    (a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0)
  );
  return { day: byViews, week: byViews, month: byViews };
}
