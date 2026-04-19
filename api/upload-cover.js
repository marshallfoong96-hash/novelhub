/**
 * Vercel Serverless — POST /api/upload-cover
 * Same contract as Cloudflare Pages `functions/api/upload-cover.js`:
 * Authorization: Bearer <supabase_access_token>, body = WebP bytes,
 * X-Upload-Path: safe key like covers/genres/1.webp
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME,
 * PUBLIC_ASSETS_BASE (or R2_PUBLIC_BASE / VITE_PUBLIC_ASSETS_BASE),
 * SUPABASE_URL + SUPABASE_ANON_KEY (or VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { buffer } from "node:stream/consumers";

const MAX_BYTES = 6 * 1024 * 1024;

function safeObjectKey(raw) {
  const s = String(raw || "").trim();
  if (!s || s.length > 180) return null;
  if (!/^[a-zA-Z0-9/_-]+\.webp$/i.test(s)) return null;
  if (s.includes("..") || s.startsWith("/")) return null;
  return s;
}

function normalizePublicBase() {
  let s = String(
    process.env.PUBLIC_ASSETS_BASE ||
      process.env.R2_PUBLIC_BASE ||
      process.env.VITE_PUBLIC_ASSETS_BASE ||
      ""
  ).trim();
  if (s.startsWith("//")) s = `https:${s}`;
  return s.replace(/\/$/, "");
}

async function validateSupabaseUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing session" };
  }
  const url = String(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""
  ).replace(/\/$/, "");
  const anon = String(
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
  ).trim();
  if (!url || !anon) {
    return { ok: false, status: 500, error: "Server missing Supabase config" };
  }
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: auth,
      apikey: anon,
    },
  });
  if (!r.ok) return { ok: false, status: 401, error: "Invalid or expired session" };
  return { ok: true };
}

function getS3Client() {
  const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await validateSupabaseUser(req);
  if (!session.ok) {
    res.status(session.status).json({ error: session.error });
    return;
  }

  const s3 = getS3Client();
  const bucket = String(process.env.R2_BUCKET_NAME || "").trim();
  if (!s3 || !bucket) {
    res.status(500).json({
      error:
        "R2 not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    });
    return;
  }

  const publicBase = normalizePublicBase();
  if (!publicBase) {
    res.status(500).json({
      error:
        "PUBLIC_ASSETS_BASE (or R2_PUBLIC_BASE / VITE_PUBLIC_ASSETS_BASE) not set",
    });
    return;
  }

  const len = Number(req.headers["content-length"] || 0);
  if (len > MAX_BYTES) {
    res.status(413).json({ error: "File too large (max 6MB)" });
    return;
  }

  const suggested = req.headers["x-upload-path"] || "";
  const key = safeObjectKey(suggested) || `covers/up-${Date.now()}.webp`;

  let buf;
  try {
    buf = await buffer(req);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Could not read body" });
    return;
  }

  if (buf.byteLength > MAX_BYTES) {
    res.status(413).json({ error: "Body too large" });
    return;
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buf,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "R2 upload failed" });
    return;
  }

  const url = `${publicBase}/${key}`;
  res.status(200).json({ url, key });
}
