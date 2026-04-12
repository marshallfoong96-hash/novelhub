/** Lowercase tokens treated as “no author” (bad imports, Table Editor placeholders, etc.). */
const AUTHOR_PLACEHOLDER_LOWER = new Set([
  'null',
  'undefined',
  'empty',
  'none',
  'n/a',
  '-',
  '--',
  '—',
  '(null)',
  '(none)',
  'unknown',
  'anonymous',
  'chưa rõ',
  'chua ro',
  'tbd',
  'todo',
]);

/**
 * Returns a trimmed author name, or '' if missing or a known placeholder (e.g. NULL, EMPTY from DB).
 * @param {unknown} author
 * @returns {string}
 */
export function normalizeAuthorLabel(author) {
  if (author == null) return '';
  const s = String(author).trim();
  if (s === '') return '';
  const lower = s.toLowerCase();
  if (AUTHOR_PLACEHOLDER_LOWER.has(lower)) return '';
  const upper = s.toUpperCase();
  if (upper === 'NULL' || upper === 'EMPTY' || upper === 'N/A') return '';
  return s;
}

// Format Number (e.g., 125000 -> 125K)
export const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Dòng phụ dưới tiêu đề thẻ truyện: **số chương** (không dùng tác giả / "Đang cập nhật").
 * Cần `latest_chapter_number` — Home gắn sẵn; list khác gọi `enrichNovelsWithLatestChapter`.
 */
export function novelChapterSubtitle(novel) {
  const raw = novel?.latest_chapter_number;
  const n = Number(raw);
  if (raw != null && !Number.isNaN(n)) {
    if (n <= 0) return 'Chưa có chương';
    return `${n.toLocaleString('vi-VN')} chương`;
  }
  return '—';
}

/**
 * Lượt hiển thị cho icon tim (Yêu thích) trên `novels`.
 * - Ưu tiên: `like_count`, `likes`, các cột favorite…
 * - Nếu bảng **không có** `likes` / `like_count` (PostgREST không trả key), dùng `follow_count`
 *   — nhiều project chỉ có cột này (như screenshot Supabase của bạn).
 * - Nếu đã có `likes` hoặc `like_count` (kể cả = 0) thì **không** gộp `follow_count` (tránh trùng với “Theo dõi”).
 */
export function novelLikeCount(novel) {
  if (!novel || typeof novel !== 'object') return 0;
  const hasLikesOrLikeCount =
    Object.prototype.hasOwnProperty.call(novel, 'likes') ||
    Object.prototype.hasOwnProperty.call(novel, 'like_count');

  const keys = [
    'like_count',
    'likes',
    'favorite_count',
    'favourite_count',
    'favorites_count',
    'luot_yeu_thich',
    'yeu_thich',
  ];

  let best = 0;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(novel, key)) continue;
    const v = novel[key];
    if (v == null || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) best = Math.max(best, n);
  }

  const stats = novel.stats;
  if (stats && typeof stats === 'object') {
    for (const key of ['likes', 'like_count', 'favorite_count']) {
      const v = stats[key];
      if (v == null || v === '') continue;
      const n = Number(v);
      if (Number.isFinite(n)) best = Math.max(best, n);
    }
  }

  if (!hasLikesOrLikeCount && Object.prototype.hasOwnProperty.call(novel, 'follow_count')) {
    const fc = Number(novel.follow_count);
    if (Number.isFinite(fc)) best = Math.max(best, fc);
  }

  return Math.max(0, best);
}

/**
 * Giá trị nền khi bấm Yêu thích để **ghi** vào cột `likes` (chỉ sửa `likes`, không sửa follow_count).
 * - Đã có cột `likes` trong JSON → dùng `likes`.
 * - Chưa có / null (trước khi chạy SQL) → dùng `follow_count` làm điểm xuất phát một lần.
 */
export function novelFavoriteWriteBase(novel) {
  if (!novel || typeof novel !== 'object') return 0;
  if (Object.prototype.hasOwnProperty.call(novel, 'likes')) {
    const n = Number(novel.likes);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  const fc = Number(novel.follow_count);
  return Number.isFinite(fc) ? Math.max(0, fc) : 0;
}

// Format Date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  
  return date.toLocaleDateString('vi-VN');
};

// Generate Slug
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};
