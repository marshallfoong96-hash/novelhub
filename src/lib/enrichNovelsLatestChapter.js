/**
 * Attaches `latest_chapter_number` (max chapter_number per novel) for card subtitles.
 * Chunked `.in()` to avoid oversized requests when many IDs.
 */
export async function enrichNovelsWithLatestChapter(supabase, novels) {
  if (!supabase || !Array.isArray(novels) || novels.length === 0) return novels;
  const ids = [...new Set(novels.map((n) => n?.id).filter((id) => id != null))];
  if (ids.length === 0) return novels;

  const latest = {};
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data: rows, error } = await supabase
      .from('chapters')
      .select('novel_id, chapter_number')
      .in('novel_id', slice);
    if (error) {
      console.warn('[enrichNovelsLatestChapter]', error.message);
      continue;
    }
    (rows || []).forEach((r) => {
      const nid = r.novel_id;
      const n = Number(r.chapter_number);
      if (Number.isNaN(n)) return;
      const p = latest[nid];
      if (p == null || n > p) latest[nid] = n;
    });
  }

  return novels.map((n) => ({
    ...n,
    latest_chapter_number:
      n.latest_chapter_number != null && n.latest_chapter_number !== ''
        ? n.latest_chapter_number
        : (latest[n.id] ?? null),
  }));
}
