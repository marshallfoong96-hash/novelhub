/**
 * Client-side WebP conversion for uploads (covers, avatars, in-editor images).
 * Display-time WebP for remote URLs is handled by `coverImageUrl.js` (Supabase render / weserv).
 */

/**
 * @param {File|Blob} file
 * @param {{ quality?: number, maxEdge?: number }} [opts]
 * @returns {Promise<Blob>}
 */
export async function imageFileToWebpBlob(file, opts = {}) {
  const quality = typeof opts.quality === "number" ? opts.quality : 0.85;
  const maxEdge = opts.maxEdge != null ? opts.maxEdge : 2048;

  if (!file || typeof file !== "object") {
    throw new Error("imageFileToWebpBlob: expected File or Blob");
  }
  const type = "type" in file ? file.type : "";
  if (!type || !String(type).startsWith("image/")) {
    throw new Error("imageFileToWebpBlob: not an image/* file");
  }
  if (type === "image/webp") {
    return file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: "image/webp" });
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    let w = bitmap.width;
    let h = bitmap.height;
    if (maxEdge > 0 && Math.max(w, h) > maxEdge) {
      const scale = maxEdge / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("imageFileToWebpBlob: canvas 2d unsupported");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("imageFileToWebpBlob: toBlob failed"))),
        "image/webp",
        quality
      );
    });

    if (blob && blob.size > 0) return blob;
  } catch {
    /* decode / WebP encode unavailable — use original */
  } finally {
    try {
      bitmap?.close?.();
    } catch {
      /* ignore */
    }
  }

  return file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type });
}

/**
 * @param {string} originalName
 * @returns {string}
 */
export function toWebpFilename(originalName) {
  const base = String(originalName || "image").replace(/\.[^.]+$/, "");
  return `${base || "image"}.webp`;
}

/**
 * Upload a user-selected image to Supabase Storage as WebP (client-side encode).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} bucket
 * @param {string} objectPath path within bucket; extension replaced with `.webp`
 * @param {File|Blob} file
 * @param {{ upsert?: boolean, quality?: number, maxEdge?: number }} [opts]
 */
export async function uploadImageAsWebp(supabase, bucket, objectPath, file, opts = {}) {
  if (!supabase?.storage?.from) {
    throw new Error("uploadImageAsWebp: invalid supabase client");
  }
  const blob = await imageFileToWebpBlob(file, {
    quality: opts.quality,
    maxEdge: opts.maxEdge,
  });
  const path = String(objectPath || "")
    .trim()
    .replace(/\.(jpe?g|png|gif|bmp|webp)$/i, "") + ".webp";

  const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/webp",
    upsert: opts.upsert !== false,
  });

  if (error) throw error;
  return { path, data, blob };
}
