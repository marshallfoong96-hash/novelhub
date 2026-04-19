/**
 * List / card covers — prefer Supabase Storage `/render/image/` when URL is on your project.
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 *
 * **External** http(s) covers: default to WebP thumbnails via images.weserv.nl (see docs).
 * Some hosts block third-party fetch — set `VITE_COVER_IMAGE_PROXY=off` or upload to Storage.
 */

const DEFAULT_LIST = { width: 360, height: 504, quality: 80, resize: "cover" };
const DEFAULT_DETAIL = { width: 640, height: 900, quality: 82, resize: "cover" };
const DEFAULT_THUMB = { width: 144, height: 200, quality: 78, resize: "cover" };
const DEFAULT_AVATAR = { width: 128, height: 128, quality: 82, resize: "cover" };

const WESERV_ORIGIN = "https://images.weserv.nl";

function isLocalAsset(url) {
  return typeof url === "string" && (url.startsWith("/") || url.startsWith("./"));
}

/** Normalize env like `//host/path` or `https://host` for prefix match. */
function normalizeCdnBaseEnv(raw) {
  let s = String(raw ?? "").trim();
  if (s.startsWith("//")) s = `https:${s}`;
  return s.replace(/\/$/, "");
}

/** R2 / custom CDN — already WebP; skip weserv & Supabase render. */
function isPassThroughCdnUrl(trimmed) {
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const hosts = String(import.meta.env.VITE_CDN_COVER_HOSTS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (hosts.length && hosts.includes(u.hostname.toLowerCase())) return true;
    const base = normalizeCdnBaseEnv(
      import.meta.env.VITE_CDN_COVER_BASE || import.meta.env.VITE_PUBLIC_ASSETS_BASE
    );
    if (base) {
      const t = trimmed.replace(/\/$/, "");
      if (t === base || t.startsWith(`${base}/`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Prefer shipped WebP in `public/` when legacy JPG/PNG paths are still stored in DB. */
export function normalizeLocalPublicImagePath(url) {
  if (url == null || typeof url !== "string") return url;
  const t = url.trim();
  if (t === "/default-cover.jpg" || t === "/default-cover.jpeg" || t === "/default-cover.png") {
    return "/default-cover.webp";
  }
  return t;
}

/** Default: use weserv for non-Storage URLs. `VITE_COVER_IMAGE_PROXY=off` disables. */
function useWeservProxy() {
  const v = String(import.meta.env.VITE_COVER_IMAGE_PROXY || "").trim().toLowerCase();
  if (v === "off" || v === "false" || v === "0" || v === "none" || v === "disabled") {
    return false;
  }
  return true;
}

/**
 * External URLs → WebP thumbnails via wsrv.nl when proxy is enabled.
 * @see https://images.weserv.nl/docs/
 */
function externalCoverViaWeserv(trimmed, merged) {
  const w = Math.min(2500, Math.max(1, merged.width));
  const h = merged.height != null ? Math.min(2500, Math.max(1, merged.height)) : null;
  const q = Math.min(100, Math.max(20, merged.quality));
  const params = new URLSearchParams();
  params.set("url", trimmed);
  params.set("w", String(w));
  if (h != null) params.set("h", String(h));
  params.set("fit", merged.resize === "contain" ? "contain" : "cover");
  params.set("output", "webp");
  params.set("q", String(q));
  return `${WESERV_ORIGIN}/?${params.toString()}`;
}

/**
 * @param {string | undefined | null} raw
 * @param {{ width?: number, height?: number, quality?: number, resize?: 'cover'|'contain'|'fill' }} [opts]
 * @returns {string}
 */
export function coverImageUrl(raw, opts = {}) {
  const merged = { ...DEFAULT_LIST, ...opts };
  if (raw == null || String(raw).trim() === "") return "/default-cover.webp";
  const trimmed = normalizeLocalPublicImagePath(String(raw).trim());
  if (isLocalAsset(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return trimmed;
    if (isPassThroughCdnUrl(trimmed)) return trimmed;
    if (u.hostname === "images.weserv.nl" || u.hostname.endsWith(".weserv.nl")) return trimmed;

    if (u.hostname.endsWith(".supabase.co")) {
      const m = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
      if (!m) {
        if (useWeservProxy()) return externalCoverViaWeserv(trimmed, merged);
        return trimmed;
      }

      const pathAfterPublic = m[1];
      const base = `${u.protocol}//${u.host}/storage/v1/render/image/public/${pathAfterPublic}`;
      const q = new URLSearchParams();
      q.set("width", String(Math.min(2500, Math.max(1, merged.width))));
      if (merged.height != null) {
        q.set("height", String(Math.min(2500, Math.max(1, merged.height))));
      }
      q.set("quality", String(Math.min(100, Math.max(20, merged.quality))));
      q.set("resize", merged.resize || "cover");
      q.set("format", "webp");
      return `${base}?${q.toString()}`;
    }

    if (useWeservProxy()) {
      return externalCoverViaWeserv(trimmed, merged);
    }

    return trimmed;
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

/** Avatars & small profile images — WebP via same pipeline as covers. */
export function avatarImageUrl(raw) {
  return coverImageUrl(raw, DEFAULT_AVATAR);
}
