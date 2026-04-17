/**
 * PostgREST / Supabase thường giới hạn `max_rows` mỗi request (mặc định 1000).
 * Lặp `.range()` để lấy đủ mọi chương của một truyện.
 */
const PAGE = 1000;

/** Khớp RPC `novel_chapter_toc` — không có `content`. */
const TOC_METADATA_FALLBACK_SELECT =
  "id, novel_id, chapter_number, title, created_at";

/**
 * Mục lục một truyện — ưu tiên RPC một vòng (`supabase/novel_chapter_toc.sql`).
 * Fallback: `fetchAllChaptersForNovel` (nhiều request .range).
 */
export async function fetchChapterTocForNovel(supabase, novelId) {
  const nid = Number(novelId);
  if (!supabase || Number.isNaN(nid)) return [];

  const { data, error } = await supabase.rpc("novel_chapter_toc", {
    p_novel_id: nid,
  });

  if (!error && Array.isArray(data)) return data;

  console.warn(
    "[fetchChapterTocForNovel] novel_chapter_toc RPC — chạy supabase/novel_chapter_toc.sql. Fallback:",
    error?.message || error
  );
  return fetchAllChaptersForNovel(supabase, nid, TOC_METADATA_FALLBACK_SELECT);
}

export async function fetchAllChaptersForNovel(supabase, novelId, select = '*') {
  const nid = Number(novelId);
  if (!supabase || Number.isNaN(nid)) return [];

  const rows = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('chapters')
      .select(select)
      .eq('novel_id', nid)
      .order('chapter_number', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}
