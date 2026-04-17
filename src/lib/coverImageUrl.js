/**
 * List / card covers — use Supabase Storage image transformation when URL is hosted there.
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 * (Dashboard → Storage → enable Image Transformations; Pro+ on hosted Supabase.)
 *
 * External URLs (non-supabase.co) are returned unchanged — optimize those at source or move to Storage.
 */

const DEFAULT_LIST = { width: 400, height: 560, quality: 82, resize: "cover" };
const DEFAULT_DETAIL = { width: 720, height: 1020, quality: 85, resize: "cover" };
const DEFAULT_THUMB = { width: 160, height: 224, quality: 78, resize: "cover" };

function isLocalAsset(url) {
  return typeof url === "string" && (url.startsWith("/") || url.startsWith("./"));
}

/**
 * @param {string | undefined | null} raw
 * @param {{ width?: number, height?: number, quality?: number, resize?: 'cover'|'contain'|'fill' }} [opts]
 * @returns {string}
 */
export function coverImageUrl(raw, opts = {}) {
  const merged = { ...DEFAULT_LIST, ...opts };
  if (raw == null || String(raw).trim() === "") return "/default-cover.jpg";
  const trimmed = String(raw).trim();
  if (isLocalAsset(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    if (!u.hostname.endsWith(".supabase.co")) return trimmed;

    const m = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
    if (!m) return trimmed;

    const pathAfterPublic = m[1];
    const base = `${u.protocol}//${u.host}/storage/v1/render/image/public/${pathAfterPublic}`;
    const q = new URLSearchParams();
    q.set("width", String(Math.min(2500, Math.max(1, merged.width))));
    if (merged.height != null) {
      q.set("height", String(Math.min(2500, Math.max(1, merged.height))));
    }
    q.set("quality", String(Math.min(100, Math.max(20, merged.quality))));
    q.set("resize", merged.resize || "cover");
    return `${base}?${q.toString()}`;
  } catch {
    return trimmed;
  }
}

/** Grids, NovelCard, home lists — ~400px wide WebP via Storage transform. */
export function listCoverUrl(raw) {
  return coverImageUrl(raw, DEFAULT_LIST);
}

/** Novel detail hero — larger but still bounded. */
export function detailCoverUrl(raw) {
  return coverImageUrl(raw, DEFAULT_DETAIL);
}

/** Header search / small rows. */
export function thumbCoverUrl(raw) {
  return coverImageUrl(raw, DEFAULT_THUMB);
}
