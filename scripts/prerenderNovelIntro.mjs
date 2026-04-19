/**
 * Post-build: static HTML for SPA routes (same JS/CSS bundle):
 * - `dist/truyen/<id>/index.html` — novel intro (/truyen/:id)
 * - `dist/chapter/<id>/index.html` — chapter reader (/chapter/:id) when PRERENDER_CHAPTERS=1
 *
 * Configure (see .env.example):
 * - PRERENDER_NOVEL_IDS=12,34,56  (takes precedence)
 * - or PRERENDER_NOVEL_LIMIT=30   (top by view_count; needs Supabase env)
 * - PRERENDER_CHAPTERS=1           (optional: also emit chapter pages for those novels)
 * - PRERENDER_MAX_CHAPTER_FILES=25000  (safety cap)
 * - SITE_ORIGIN / VITE_SITE_URL — canonical & og:url (default https://mitruyen.me)
 *
 * Run automatically after `vite build` unless PRERENDER_SKIP=1.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { fetchAllChaptersForNovel } from "../src/lib/fetchAllChapters.js";

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

const DEFAULT_ORIGIN = "https://mitruyen.me";
const DETAIL = { width: 640, height: 900, quality: 82, resize: "cover" };
const WESERV = "https://images.weserv.nl";

function useWeservProxy() {
  const v = String(process.env.VITE_COVER_IMAGE_PROXY || "").trim().toLowerCase();
  return !(v === "off" || v === "false" || v === "0" || v === "none" || v === "disabled");
}

function normalizeLocalPath(url) {
  if (url == null || typeof url !== "string") return url;
  const t = url.trim();
  if (t === "/default-cover.jpg" || t === "/default-cover.jpeg" || t === "/default-cover.png") {
    return "/default-cover.webp";
  }
  return t;
}

function externalWeserv(trimmed, merged) {
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
  return `${WESERV}/?${params.toString()}`;
}

function normalizeCdnBase(raw) {
  let s = String(raw ?? "").trim();
  if (s.startsWith("//")) s = `https:${s}`;
  return s.replace(/\/$/, "");
}

function isPassThroughCdn(trimmed) {
  try {
    const u = new URL(trimmed);
    if (u.hostname.endsWith(".r2.dev")) return true;
    const hosts = String(process.env.VITE_CDN_COVER_HOSTS || process.env.CDN_COVER_HOSTS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (hosts.length && hosts.includes(u.hostname.toLowerCase())) return true;
    const base = normalizeCdnBase(
      process.env.VITE_CDN_COVER_BASE ||
        process.env.VITE_PUBLIC_ASSETS_BASE ||
        process.env.CDN_COVER_BASE
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

/** Match `detailCoverUrl` / coverImageUrl for OG — absolute URLs only where needed. */
function detailCoverAbsolute(raw, origin) {
  const merged = { ...DETAIL };
  if (raw == null || String(raw).trim() === "") {
    return `${origin.replace(/\/$/, "")}/default-cover.webp`;
  }
  let trimmed = normalizeLocalPath(String(raw).trim());
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) {
    return `${origin.replace(/\/$/, "")}${trimmed.startsWith("/") ? trimmed : "/" + trimmed.slice(2)}`;
  }
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return trimmed;
    if (isPassThroughCdn(trimmed)) return trimmed;
    if (u.hostname === "images.weserv.nl" || u.hostname.endsWith(".weserv.nl")) return trimmed;

    if (u.hostname.endsWith(".supabase.co")) {
      const m = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
      if (!m) {
        return useWeservProxy() ? externalWeserv(trimmed, merged) : trimmed;
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
    return useWeservProxy() ? externalWeserv(trimmed, merged) : trimmed;
  } catch {
    return trimmed;
  }
}

function escapeHtmlAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function plainTextFromDescription(htmlOrText, maxLen) {
  const t = String(htmlOrText ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1).trimEnd() + "…";
}

function buildHeadInjection({ title, description, canonical, ogImage, novelId }) {
  const desc = escapeHtmlAttr(description);
  const ttl = escapeHtmlAttr(title);
  const canon = escapeHtmlAttr(canonical);
  const ogI = escapeHtmlAttr(ogImage);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    url: canonical,
    image: ogImage,
    description: plainTextFromDescription(description, 500),
  });

  return `
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${canon}" />
    <meta property="og:type" content="book" />
    <meta property="og:site_name" content="Mi Truyen" />
    <meta property="og:title" content="${ttl}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${canon}" />
    <meta property="og:image" content="${ogI}" />
    <meta property="og:image:secure_url" content="${ogI}" />
    <meta property="og:locale" content="vi_VN" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ttl}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogI}" />
    <meta name="prerender-novel-id" content="${String(novelId)}" />
    <script type="application/ld+json">${jsonLd.replace(/</g, "\\u003c")}</script>
  `.trim();
}

function buildNoscript({ title, authorLabel, description }) {
  const p = plainTextFromDescription(description, 600);
  return `
<noscript>
  <div style="max-width:42rem;margin:1.5rem auto;padding:1rem;font-family:system-ui,sans-serif;line-height:1.5;color:#111">
    <h1 style="font-size:1.25rem;margin-bottom:0.5rem">${escapeHtmlAttr(title)}</h1>
    <p style="font-size:0.875rem;color:#555;margin-bottom:1rem">${escapeHtmlAttr(authorLabel)}</p>
    <p style="white-space:pre-wrap;font-size:0.9rem">${escapeHtmlAttr(p)}</p>
    <p style="margin-top:1rem;font-size:0.8rem;color:#888">Mi Truyện — cần bật JavaScript để xem đầy đủ.</p>
  </div>
</noscript>`.trim();
}

function buildChapterHeadInjection({
  title,
  description,
  canonical,
  ogImage,
  chapterId,
  novelTitle,
  novelCanonical,
  chapterSchemaName,
}) {
  const desc = escapeHtmlAttr(description);
  const ttl = escapeHtmlAttr(title);
  const canon = escapeHtmlAttr(canonical);
  const ogI = escapeHtmlAttr(ogImage);
  const chName = chapterSchemaName || plainTextFromDescription(title, 160);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Chapter",
    name: chName,
    url: canonical,
    isPartOf: {
      "@type": "Book",
      name: novelTitle,
      url: novelCanonical,
    },
  });

  return `
    <meta name="description" content="${desc}" />
    <link rel="canonical" href="${canon}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Mi Truyen" />
    <meta property="og:title" content="${ttl}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:url" content="${canon}" />
    <meta property="og:image" content="${ogI}" />
    <meta property="og:image:secure_url" content="${ogI}" />
    <meta property="og:locale" content="vi_VN" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ttl}" />
    <meta name="twitter:description" content="${desc}" />
    <meta name="twitter:image" content="${ogI}" />
    <meta name="prerender-chapter-id" content="${String(chapterId)}" />
    <script type="application/ld+json">${jsonLd.replace(/</g, "\\u003c")}</script>
  `.trim();
}

function buildChapterNoscript({ novelTitle, novelPath, chapterNumber, chapterTitle, excerpt }) {
  const ex = plainTextFromDescription(excerpt, 1200);
  return `
<noscript>
  <div style="max-width:42rem;margin:1.5rem auto;padding:1rem;font-family:system-ui,sans-serif;line-height:1.5;color:#111">
    <p style="font-size:0.875rem;margin-bottom:0.75rem"><a href="${escapeHtmlAttr(novelPath)}">${escapeHtmlAttr(novelTitle)}</a></p>
    <h1 style="font-size:1.125rem;margin-bottom:0.75rem">Chương ${escapeHtmlAttr(String(chapterNumber))}: ${escapeHtmlAttr(chapterTitle)}</h1>
    <p style="white-space:pre-wrap;font-size:0.9rem">${escapeHtmlAttr(ex)}</p>
    <p style="margin-top:1rem;font-size:0.8rem;color:#888">Mi Truyện — cần bật JavaScript để xem đầy đủ.</p>
  </div>
</noscript>`.trim();
}

/** Inject title, head meta, noscript into Vite-built index shell. */
function buildStaticHtml(template, pageTitle, headBlock, noscript) {
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtmlAttr(pageTitle)}</title>`);
  if (!html.includes("</head>")) return null;
  html = html.replace("</head>", `${headBlock}\n</head>`);
  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>\n    ${noscript}\n`);
  } else {
    html = html.replace("</body>", `${noscript}\n</body>`);
  }
  return html;
}

function prerenderChaptersEnabled() {
  const v = String(process.env.PRERENDER_CHAPTERS || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function resolveNovelIds(supabase) {
  const rawIds = String(process.env.PRERENDER_NOVEL_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (rawIds.length > 0) return [...new Set(rawIds)];

  const limit = Math.min(500, Math.max(0, parseInt(process.env.PRERENDER_NOVEL_LIMIT || "0", 10) || 0));
  if (limit <= 0 || !supabase) return [];

  const { data, error } = await supabase
    .from("novels")
    .select("id")
    .order("view_count", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.warn("[prerenderNovelIntro] fetch ids:", error.message);
    return [];
  }
  return (data || []).map((r) => r.id).filter((id) => id != null);
}

function normalizeAuthorLabel(author) {
  if (author == null || String(author).trim() === "") return "Tác giả";
  return String(author).trim();
}

async function main() {
  if (String(process.env.PRERENDER_SKIP || "").trim() === "1") {
    console.log("[prerenderNovelIntro] skip (PRERENDER_SKIP=1)");
    return;
  }

  const indexPath = path.join(ROOT, "dist", "index.html");
  if (!fs.existsSync(indexPath)) {
    console.warn("[prerenderNovelIntro] dist/index.html missing — run vite build first.");
    process.exit(0);
  }

  let template = fs.readFileSync(indexPath, "utf8");
  /** Avoid duplicate meta: strip homepage SEO block; prerender injects per-novel tags. */
  template = template
    .replace(/<meta name="description"[^>]*>/gi, "")
    .replace(/<link rel="canonical"[^>]*>/gi, "")
    .replace(/<meta property="og:url"[^>]*>/gi, "")
    .replace(/<meta property="og:title"[^>]*>/gi, "")
    .replace(/<meta property="og:description"[^>]*>/gi, "")
    .replace(/<meta property="og:type"[^>]*>/gi, "")
    .replace(/<meta property="og:image[^>]*>/gi, "")
    .replace(/<meta property="og:locale"[^>]*>/gi, "")
    .replace(/<meta name="twitter:[^>]*>/gi, "");

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = url && key ? createClient(url, key) : null;

  const ids = await resolveNovelIds(supabase);
  if (ids.length === 0) {
    console.log(
      "[prerenderNovelIntro] no IDs — set PRERENDER_NOVEL_IDS or PRERENDER_NOVEL_LIMIT (>0) + Supabase env."
    );
    return;
  }
  if (!supabase) {
    console.warn(
      "[prerenderNovelIntro] missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — cannot fetch novel rows."
    );
    return;
  }

  const origin = (
    process.env.SITE_ORIGIN ||
    process.env.VITE_SITE_URL ||
    DEFAULT_ORIGIN
  )
    .replace(/\/$/, "");

  const { data: novelRows, error: novelFetchErr } = await supabase.from("novels").select("*").in("id", ids);
  if (novelFetchErr) {
    console.warn("[prerenderNovelIntro] batch fetch novels:", novelFetchErr.message);
    return;
  }
  const novelById = new Map((novelRows || []).map((r) => [r.id, r]));

  let written = 0;
  for (const novelId of ids) {
    const novel = novelById.get(novelId);
    if (!novel) {
      console.warn(`[prerenderNovelIntro] skip id=${novelId}: not found`);
      continue;
    }

    const titleBase = novel.title ? String(novel.title).trim() : `Truyện #${novelId}`;
    const pageTitle = `${titleBase} | Mi Truyen`;
    const authorLabel = normalizeAuthorLabel(novel.author);
    const descPlain =
      plainTextFromDescription(novel.description, 220) ||
      `${titleBase} — ${authorLabel}. Đọc online tại Mi Truyện.`;
    const canonical = `${origin}/truyen/${novelId}`;
    const ogImage = detailCoverAbsolute(novel.cover_url, origin);

    const headBlock = buildHeadInjection({
      title: pageTitle,
      description: descPlain,
      canonical,
      ogImage,
      novelId,
    });

    const noscript = buildNoscript({
      title: titleBase,
      authorLabel,
      description: novel.description || descPlain,
    });

    const html = buildStaticHtml(template, pageTitle, headBlock, noscript);
    if (!html) {
      console.warn("[prerenderNovelIntro] malformed index.html (no </head>)");
      continue;
    }

    const dir = path.join(ROOT, "dist", "truyen", String(novelId));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
    written += 1;
    console.log("[prerenderNovelIntro] wrote", `/truyen/${novelId}/index.html`);
  }

  let chaptersWritten = 0;
  const doChapters = prerenderChaptersEnabled();
  const maxChapterFiles = Math.min(
    100000,
    Math.max(0, parseInt(process.env.PRERENDER_MAX_CHAPTER_FILES || "25000", 10) || 25000)
  );

  if (doChapters && maxChapterFiles > 0) {
    for (const novelId of ids) {
      if (chaptersWritten >= maxChapterFiles) break;
      const novel = novelById.get(novelId);
      if (!novel) continue;

      const titleBase = novel.title ? String(novel.title).trim() : `Truyện #${novelId}`;
      const novelCanonical = `${origin}/truyen/${novelId}`;
      const ogImage = detailCoverAbsolute(novel.cover_url, origin);

      let chapters;
      try {
        chapters = await fetchAllChaptersForNovel(
          supabase,
          novelId,
          "id, novel_id, chapter_number, title, content"
        );
      } catch (e) {
        console.warn(`[prerenderNovelIntro] chapters novel ${novelId}:`, e?.message || e);
        continue;
      }

      for (const ch of chapters || []) {
        if (chaptersWritten >= maxChapterFiles) break;
        const cid = ch.id;
        if (cid == null) continue;

        const chNum = ch.chapter_number != null ? String(ch.chapter_number) : "?";
        const chTitle = ch.title ? String(ch.title).trim() : `Chương ${chNum}`;
        const headline = `Chương ${chNum}: ${chTitle}`;
        const pageTitleCh = `${headline} — ${titleBase} | Mi Truyen`;
        const excerptSource = ch.content != null ? String(ch.content) : novel.description || "";
        const descPlain = plainTextFromDescription(excerptSource, 240) || `${headline} — ${titleBase}.`;
        const canonicalCh = `${origin}/chapter/${cid}`;

        const headBlockCh = buildChapterHeadInjection({
          title: pageTitleCh,
          description: descPlain,
          canonical: canonicalCh,
          ogImage,
          chapterId: cid,
          novelTitle: titleBase,
          novelCanonical,
          chapterSchemaName: headline,
        });

        const noscriptCh = buildChapterNoscript({
          novelTitle: titleBase,
          novelPath: novelCanonical,
          chapterNumber: chNum,
          chapterTitle: chTitle,
          excerpt: excerptSource || descPlain,
        });

        const htmlCh = buildStaticHtml(template, pageTitleCh, headBlockCh, noscriptCh);
        if (!htmlCh) continue;

        const chDir = path.join(ROOT, "dist", "chapter", String(cid));
        fs.mkdirSync(chDir, { recursive: true });
        fs.writeFileSync(path.join(chDir, "index.html"), htmlCh, "utf8");
        chaptersWritten += 1;
        console.log("[prerenderNovelIntro] wrote", `/chapter/${cid}/index.html`);
      }
    }
  } else if (doChapters) {
    console.log("[prerenderNovelIntro] PRERENDER_CHAPTERS set but PRERENDER_MAX_CHAPTER_FILES=0 — skip chapters.");
  }

  console.log(
    `[prerenderNovelIntro] done — intro ${written}/${ids.length}, chapter ${chaptersWritten}${doChapters ? "" : " (set PRERENDER_CHAPTERS=1 to enable)"}.`
  );
}

main().catch((e) => {
  console.error("[prerenderNovelIntro]", e);
  process.exit(1);
});
