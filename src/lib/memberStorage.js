/** localStorage keys — đồng bộ với NovelDetail / ChapterRead */

export const LS_FAVORITES = "mi_favorites";
export const LS_FOLLOWS = "mi_follows";
export const LS_BOOKMARKS = "mi_bookmarks";
export const LS_READING_HISTORY = "mi_reading_history";
/** string[] genre slug — thể loại quan tâm (trang thành viên) */
export const LS_MEMBER_GENRE_SLUGS = "mi_member_genre_slugs";

export function readNumericIdArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0))];
  } catch {
    return [];
  }
}

export function readGenreTagSlugs() {
  try {
    const raw = localStorage.getItem(LS_MEMBER_GENRE_SLUGS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .map((s) => String(s).trim().toLowerCase())
          .filter(Boolean)
      ),
    ];
  } catch {
    return [];
  }
}

export function writeGenreTagSlugs(slugs) {
  const normalized = [
    ...new Set(
      (slugs || [])
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  localStorage.setItem(LS_MEMBER_GENRE_SLUGS, JSON.stringify(normalized));
}

export function readReadingHistory() {
  try {
    const raw = localStorage.getItem(LS_READING_HISTORY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** `chapterId` (string) of the most recently opened chapter for this novel — same order as `mi_reading_history` (newest-first). */
export function readLastReadChapterIdForNovel(novelId) {
  if (novelId == null) return null;
  const nid = String(novelId);
  const hit = readReadingHistory().find((item) => String(item?.novelId) === nid);
  if (hit?.chapterId == null) return null;
  return String(hit.chapterId);
}

export function removeHistoryEntryByChapterId(chapterId) {
  const id = String(chapterId);
  const items = readReadingHistory().filter((e) => String(e.chapterId) !== id);
  localStorage.setItem(LS_READING_HISTORY, JSON.stringify(items));
  return items;
}

