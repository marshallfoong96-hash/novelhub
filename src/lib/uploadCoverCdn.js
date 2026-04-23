/**
 * Upload WebP cover to Cloudflare R2 via Pages Function `/api/upload-cover`.
 * Enable with VITE_CDN_UPLOAD_ENABLED=true (and deploy Functions + R2 binding).
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { imageFileToWebpBlob, toWebpFilename } from "./imageToWebp";

function cdnUploadEnabled() {
  return String(import.meta.env.VITE_CDN_UPLOAD_ENABLED || "")
    .trim()
    .toLowerCase() === "true";
}

/**
 * @param {File|Blob} file — image/*; converted to WebP client-side
 * @param {string} objectKey — e.g. covers/novels/12.webp (letters, numbers, / _ - only)
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadCoverToR2Cdn(file, objectKey) {
  if (!cdnUploadEnabled()) {
    throw new Error("CDN upload disabled — set VITE_CDN_UPLOAD_ENABLED=true");
  }
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase not configured");
  }

  const key = String(objectKey || "")
    .trim()
    .replace(/^[\\/]+/, "");
  if (!key || !/^[a-zA-Z0-9/_-]+\.webp$/i.test(key)) {
    throw new Error("Invalid upload path (use covers/.../name.webp)");
  }

  const blob = await imageFileToWebpBlob(file, {
    quality: 0.88,
    maxEdge: 2048,
    applyWatermark: true,
  });
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new Error("Please sign in to upload");
  }

  const res = await fetch("/api/upload-cover", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/webp",
      "X-Upload-Path": key,
    },
    body: blob,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Upload failed (${res.status})`);
  }
  if (!json.url) {
    throw new Error("Upload response missing url");
  }
  return { url: json.url, key: json.key || key };
}

/**
 * @param {File} file
 * @param {string} folder — e.g. "covers/genres"
 * @param {string} id — numeric id or slug fragment
 */
export async function uploadGenreCoverFile(file, folder, id) {
  const base = String(folder || "covers/genres").replace(/^[\\/]+/, "").replace(/\/$/, "");
  const name = toWebpFilename(`${id}-${file.name || "cover"}`);
  const key = `${base}/${name}`;
  return uploadCoverToR2Cdn(file, key);
}
