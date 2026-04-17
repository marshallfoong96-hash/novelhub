/**
 * Ensures `public/*.webp` assets exist: converts sibling .png/.jpg when present,
 * else writes a small neutral placeholder WebP.
 * Run: node scripts/ensure-webp-public.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("Install sharp: npm install sharp --save-dev");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, "..", "public");

function ensureDir() {
  if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });
}

async function placeholder(w, h, outName) {
  const out = path.join(pub, outName);
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: { r: 226, g: 232, b: 240 },
    },
  })
    .webp({ quality: 82 })
    .toFile(out);
  console.log("placeholder", outName);
}

async function convertOrPlaceholder(fromBase, outWebp, { w, h, maxW } = {}) {
  const exts = [".png", ".jpg", ".jpeg"];
  let found = null;
  for (const e of exts) {
    const p = path.join(pub, fromBase + e);
    if (fs.existsSync(p)) {
      found = p;
      break;
    }
  }
  const out = path.join(pub, outWebp);
  if (found) {
    let img = sharp(found);
    if (maxW) img = img.resize({ width: maxW, withoutEnlargement: true });
    await img.webp({ quality: 85 }).toFile(out);
    console.log("webp", found, "->", outWebp);
  } else {
    await placeholder(w || 400, h || 560, outWebp);
  }
}

async function main() {
  ensureDir();

  await convertOrPlaceholder("default-cover", "default-cover.webp", { w: 400, h: 560 });
  await convertOrPlaceholder("branding-cast", "branding-cast.webp", { maxW: 1400 });
  await convertOrPlaceholder("crying-onigiri", "crying-onigiri.webp", { w: 320, h: 320 });
  await convertOrPlaceholder("donate-mi-truyen-qr", "donate-mi-truyen-qr.webp", { maxW: 900 });
  await convertOrPlaceholder("favicon", "favicon.webp", { w: 64, h: 64 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
