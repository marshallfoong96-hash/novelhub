/**
 * Attaches `latest_chapter_number` (max chapter_number per novel) for card subtitles.
 *
 * Uses `novel_chapter_stats` RPC (server-side GROUP BY) — same as Home. The previous
 * approach queried `chapters` with `.in('novel_id', …)` and pulled *every* chapter row
 * for those novels, which becomes very slow as total chapter count grows.
 *
 * If the RPC is missing, falls back to one small query per novel (max chapter only).
 * Deploy: `supabase/novel_chapter_stats.sql`.
 */

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
async function fallbackMaxChapterByNovel(supabase, novelIds) {
  const latest = {};
  const BATCH = 20;
  for (let j = 0; j < novelIds.length; j += BATCH) {
    const batch = novelIds.slice(j, j + BATCH);
    await Promise.all(
      batch.map(async (nid) => {
        const { data, error } = await supabase
          .from('chapters')
          .select('chapter_number')
          .eq('novel_id', nid)
          .order('chapter_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data) return;
        const n = Number(data.chapter_number);
        if (!Number.isNaN(n)) latest[nid] = n;
      })
    );
  }
  return latest;
}

export async function enrichNovelsWithLatestChapter(supabase, novels) {
  if (!supabase || !Array.isArray(novels) || novels.length === 0) return novels;
  const ids = [...new Set(novels.map((n) => n?.id).filter((id) => id != null))];
  if (ids.length === 0) return novels;

  const latest = {};
  const CHUNK = 200;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data: statRows, error: rpcError } = await supabase.rpc('novel_chapter_stats', {
      p_novel_ids: slice,
    });

    if (!rpcError && Array.isArray(statRows)) {
      statRows.forEach((row) => {
        const nid = row.novel_id;
        const cn = row.latest_chapter_number;
        if (nid == null || cn == null) return;
        const n = Number(cn);
        if (!Number.isNaN(n)) latest[nid] = n;
      });
    } else {
      console.warn(
        '[enrichNovelsWithLatestChapter] novel_chapter_stats RPC — run supabase/novel_chapter_stats.sql. Using per-novel fallback:',
        rpcError?.message || rpcError
      );
      Object.assign(latest, await fallbackMaxChapterByNovel(supabase, slice));
    }
  }

  return novels.map((n) => ({
    ...n,
    latest_chapter_number:
      n.latest_chapter_number != null && n.latest_chapter_number !== ''
        ? n.latest_chapter_number
        : (latest[n.id] ?? null),
  }));
}
