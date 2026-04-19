/**
 * One-off: copy novel covers from Supabase Storage public URLs into Cloudflare R2 (S3 API),
 * then update `novels.cover_url` to the new public CDN URL.
 *
 * Requires in .env.local (do not commit secrets). `MIGRATE_*` overrides; else same names as Vercel:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   MIGRATE_R2_PUBLIC_BASE or PUBLIC_ASSETS_BASE or VITE_PUBLIC_ASSETS_BASE (https://pub-....r2.dev)
 *   VITE_SUPABASE_URL (or SUPABASE_URL)
 *   MIGRATE_SUPABASE_SERVICE_ROLE (recommended) or VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY
 *
 * Dry run: MIGRATE_DRY_RUN=1 npm run migrate:covers-r2
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

loadEnvFiles();

const DRY = String(process.env.MIGRATE_DRY_RUN || "").trim() === "1";

function r2Client() {
  const accountId =
    process.env.MIGRATE_R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
  const accessKeyId =
    process.env.MIGRATE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.MIGRATE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (or MIGRATE_R2_* equivalents)"
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function normalizePublicBase(raw) {
  let s = String(raw ?? "").trim();
  if (s.startsWith("//")) s = `https:${s}`;
  return s.replace(/\/$/, "");
}

async function main() {
  const bucket =
    process.env.MIGRATE_R2_BUCKET || process.env.R2_BUCKET_NAME;
  const publicBase = normalizePublicBase(
    process.env.MIGRATE_R2_PUBLIC_BASE ||
      process.env.PUBLIC_ASSETS_BASE ||
      process.env.VITE_PUBLIC_ASSETS_BASE
  );
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.MIGRATE_SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!bucket || !publicBase) {
    throw new Error(
      "Set R2_BUCKET_NAME and public base (MIGRATE_R2_PUBLIC_BASE or PUBLIC_ASSETS_BASE or VITE_PUBLIC_ASSETS_BASE)"
    );
  }
  if (!supabaseUrl) throw new Error("Set VITE_SUPABASE_URL");
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Set MIGRATE_SUPABASE_SERVICE_ROLE (preferred) or anon key");

  const supabase = createClient(supabaseUrl, key);
  const s3 = r2Client();

  const { data: rows, error } = await supabase.from("novels").select("id,cover_url").not("cover_url", "is", null);
  if (error) throw error;

  let migrated = 0;
  for (const row of rows || []) {
    const raw = row.cover_url;
    if (raw == null || String(raw).trim() === "") continue;
    const u = String(raw).trim();
    if (!u.includes("supabase.co") || !u.includes("/storage/v1/object/public/")) {
      console.log(`[skip] id=${row.id} not a Supabase Storage public URL`);
      continue;
    }

    const pathMatch = u.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    const ext = (pathMatch && pathMatch[1].split(".").pop()) || "jpg";
    const safeExt = /^[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : "jpg";
    const keyOut = `covers/novels/${row.id}.${safeExt}`;

    console.log(`[fetch] novel ${row.id} ...`);
    const res = await fetch(u);
    if (!res.ok) {
      console.warn(`[fail] download id=${row.id} ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());

    if (DRY) {
      console.log(`[dry-run] would put ${keyOut} (${buf.length} bytes)`);
      migrated += 1;
      continue;
    }

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: keyOut,
        Body: buf,
        ContentType: res.headers.get("content-type") || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const newUrl = `${publicBase}/${keyOut}`;
    const { error: upErr } = await supabase.from("novels").update({ cover_url: newUrl }).eq("id", row.id);
    if (upErr) {
      console.error(`[fail] update id=${row.id}`, upErr.message);
      continue;
    }
    console.log(`[ok] id=${row.id} -> ${newUrl}`);
    migrated += 1;
  }

  console.log(`Done. Migrated: ${migrated}${DRY ? " (dry run)" : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
