/**
 * PostgREST / Supabase thường giới hạn `max_rows` mỗi request (mặc định 1000).
 * Lặp `.range()` để lấy đủ mọi chương của một truyện.
 */
const PAGE = 1000;

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
