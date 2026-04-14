/**
 * Mục lục (metadata chương) trong sessionStorage — đổi tab vẫn nhanh, đóng tab xóa.
 * Tránh đụng quota: không ghi nếu payload quá lớn.
 */

const KEY_PREFIX = 'mi_reader_toc_v1:';
const MAX_AGE_MS = 45 * 60 * 1000;
/** ~4MB an toàn hơn giới hạn 5MB của sessionStorage */
const MAX_JSON_CHARS = 3_800_000;

function key(novelId) {
  return `${KEY_PREFIX}${Number(novelId)}`;
}

/**
 * @returns {Array<{id, chapter_number, title}> | null}
 */
export function getCachedTocRows(novelId) {
  if (typeof sessionStorage === 'undefined') return null;
  const nid = Number(novelId);
  if (Number.isNaN(nid)) return null;
  try {
    const raw = sessionStorage.getItem(key(nid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { at, rows } = parsed || {};
    if (!Array.isArray(rows) || typeof at !== 'number') return null;
    if (Date.now() - at > MAX_AGE_MS) return null;
    return rows;
  } catch {
    return null;
  }
}

/**
 * @param {number} novelId
 * @param {Array<{id, chapter_number, title}>} rows
 */
export function setCachedTocRows(novelId, rows) {
  if (typeof sessionStorage === 'undefined') return;
  const nid = Number(novelId);
  if (Number.isNaN(nid) || !Array.isArray(rows)) return;
  try {
    const payload = JSON.stringify({ at: Date.now(), rows });
    if (payload.length > MAX_JSON_CHARS) return;
    sessionStorage.setItem(key(nid), payload);
  } catch {
    /* quota hoặc private mode */
  }
}

export function clearCachedToc(novelId) {
  if (typeof sessionStorage === 'undefined') return;
  const nid = Number(novelId);
  if (Number.isNaN(nid)) return;
  try {
    sessionStorage.removeItem(key(nid));
  } catch {
    /* ignore */
  }
}

/** Trang đọc chỉ cần các cột này — không `select('*')`. */
export const READER_CHAPTER_SELECT =
  'id, novel_id, chapter_number, title, content';

/** Header / lịch sử / mục lục — không cần description JSON lớn. */
export const READER_NOVEL_SELECT = 'id, title, cover_url';

export const READER_TOC_METADATA_SELECT = 'id, chapter_number, title';
