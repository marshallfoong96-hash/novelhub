/**
 * Client-side WebP conversion for uploads (covers, avatars, in-editor images).
 * Display-time WebP for remote URLs is handled by `coverImageUrl.js` (Supabase render / weserv).
 */
import watermarkFullLogo from "../assets/branding/onigiri-watermark-full.png";

async function loadImageFromBlob(blob) {
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    const ready = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
    img.src = url;
    return await ready;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function drawWatermark(ctx, width, height, watermarkUrl, opacity) {
  if (!ctx || !watermarkUrl || width <= 0 || height <= 0) return;
  const logo = new Image();
  logo.decoding = "async";
  logo.crossOrigin = "anonymous";
  const ready = new Promise((resolve, reject) => {
    logo.onload = resolve;
    logo.onerror = reject;
  });
  logo.src = watermarkUrl;
  await ready;

  const targetWidth = Math.max(74, Math.round(Math.min(width * 0.24, 190)));
  const scale = targetWidth / Math.max(logo.width, 1);
  const targetHeight = Math.max(40, Math.round(logo.height * scale));
  const margin = Math.max(8, Math.round(width * 0.015));
  const x = width - targetWidth - margin;
  const y = margin;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(logo, x, y, targetWidth, targetHeight);
  ctx.restore();
}

/**
 * @param {File|Blob} file
 * @param {{ quality?: number, maxEdge?: number, applyWatermark?: boolean, watermarkSrc?: string, watermarkOpacity?: number }} [opts]
 * @returns {Promise<Blob>}
 */
export async function imageFileToWebpBlob(file, opts = {}) {
  const quality = typeof opts.quality === "number" ? opts.quality : 0.85;
  const maxEdge = opts.maxEdge != null ? opts.maxEdge : 2048;
  const applyWatermark = opts.applyWatermark === true;
  const watermarkSrc = String(opts.watermarkSrc || watermarkFullLogo || "").trim();
  const watermarkOpacity =
    typeof opts.watermarkOpacity === "number"
      ? Math.max(0.1, Math.min(1, opts.watermarkOpacity))
      : 0.9;

  if (!file || typeof file !== "object") {
    throw new Error("imageFileToWebpBlob: expected File or Blob");
  }
  const type = "type" in file ? file.type : "";
  if (!type || !String(type).startsWith("image/")) {
    throw new Error("imageFileToWebpBlob: not an image/* file");
  }
  let bitmap;
  let imageEl;
  try {
    const useBitmap = typeof createImageBitmap === "function";
    if (useBitmap) {
      bitmap = await createImageBitmap(file);
    } else {
      imageEl = await loadImageFromBlob(file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type }));
    }
    let w = bitmap ? bitmap.width : imageEl?.width || 0;
    let h = bitmap ? bitmap.height : imageEl?.height || 0;
    if (w <= 0 || h <= 0) throw new Error("imageFileToWebpBlob: decode failed");
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
    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, w, h);
    } else if (imageEl) {
      ctx.drawImage(imageEl, 0, 0, w, h);
    }
    if (applyWatermark && watermarkSrc) {
      await drawWatermark(ctx, w, h, watermarkSrc, watermarkOpacity);
    }

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
