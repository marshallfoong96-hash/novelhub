/**
 * Propeller setup:
 * - Push Notifications tag stays in index.html <head> for installation verification.
 * - In-Page Push tag is injected in AdSlot (lazy) using provider's inline snippet style.
 */

const DEFAULT_INPAGE_SCRIPT_SRC = "https://nap5k.com/tag.min.js";
const DEFAULT_INPAGE_ZONE = "10922520";

/** @type {string} */
export const PROPELLER_INPAGE_SCRIPT_SRC =
  import.meta.env.VITE_PROPELLER_INPAGE_SCRIPT?.trim() || DEFAULT_INPAGE_SCRIPT_SRC;

const ZONE_KEYS = {
  home: "VITE_PROPELLER_ZONE_HOME",
  detail: "VITE_PROPELLER_ZONE_DETAIL",
  chapterTop: "VITE_PROPELLER_ZONE_CHAPTER_TOP",
  chapterBottom: "VITE_PROPELLER_ZONE_CHAPTER_BOTTOM",
};

export function resolvePropellerInpageZone(placement) {
  const envName = ZONE_KEYS[placement];
  const specific = envName ? import.meta.env[envName]?.trim() : "";
  const fallback =
    import.meta.env.VITE_PROPELLER_INPAGE_ZONE?.trim() ||
    import.meta.env.VITE_PROPELLER_TAG_ZONE?.trim() ||
    import.meta.env.VITE_QU_TAG_ZONE?.trim() ||
    "";
  return specific || fallback || DEFAULT_INPAGE_ZONE;
}

export function isPropellerTagEnabled() {
  if (import.meta.env.VITE_PROPELLER_TAG_ENABLED === "false") return false;
  if (import.meta.env.VITE_QU_TAG_ENABLED === "false") return false;
  const zone = resolvePropellerInpageZone("home");
  return Boolean(PROPELLER_INPAGE_SCRIPT_SRC && zone);
}
