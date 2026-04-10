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
