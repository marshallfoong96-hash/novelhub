/**
 * Propeller Ads (tag.min.js + data-zone) — no Google AdSense.
 *
 * Site verification reads static `index.html`: the main tag must live there (Step 2).
 * AdSlot only adds extra scripts if that head tag is absent (e.g. dev without index edit).
 *
 * Override with VITE_PROPELLER_* in .env. Disable: VITE_PROPELLER_TAG_ENABLED=false
 */

const DEFAULT_SCRIPT = "https://quge5.com/88/tag.min.js";
const DEFAULT_ZONE = "233290";

/** @type {string} */
export const PROPELLER_TAG_SCRIPT_SRC =
  import.meta.env.VITE_PROPELLER_TAG_SCRIPT?.trim() || DEFAULT_SCRIPT;

const ZONE_KEYS = {
  home: "VITE_PROPELLER_ZONE_HOME",
  detail: "VITE_PROPELLER_ZONE_DETAIL",
  chapterTop: "VITE_PROPELLER_ZONE_CHAPTER_TOP",
  chapterBottom: "VITE_PROPELLER_ZONE_CHAPTER_BOTTOM",
};

/** Zone id for `data-zone` on the tag script (per placement or global fallback). */
export function resolvePropellerZone(placement) {
  const envName = ZONE_KEYS[placement];
  const specific = envName ? import.meta.env[envName]?.trim() : "";
  const fallback =
    import.meta.env.VITE_PROPELLER_TAG_ZONE?.trim() ||
    import.meta.env.VITE_QU_TAG_ZONE?.trim() ||
    "";
  return specific || fallback || DEFAULT_ZONE;
}

export function isPropellerTagEnabled() {
  if (import.meta.env.VITE_PROPELLER_TAG_ENABLED === "false") return false;
  if (import.meta.env.VITE_QU_TAG_ENABLED === "false") return false;
  const z = resolvePropellerZone("home");
  return Boolean(PROPELLER_TAG_SCRIPT_SRC && z);
}
