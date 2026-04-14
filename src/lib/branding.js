/**
 * Mi Truyen — onigiri brand assets (Vite resolves these to hashed URLs in production).
 * Add/rename files under src/assets/branding/ and update imports here.
 */
import mark from "../assets/branding/onigiri-mark.webp";
import main from "../assets/branding/onigiri-main.webp";
import horizontal from "../assets/branding/onigiri-horizontal.webp";
import mascot from "../assets/branding/onigiri-mascot.webp";
import sticker01 from "../assets/branding/onigiri-01.webp";
import sticker02 from "../assets/branding/onigiri-02.webp";
import sticker03 from "../assets/branding/onigiri-03.webp";
import sticker04 from "../assets/branding/onigiri-04.webp";
import sticker05 from "../assets/branding/onigiri-05.webp";
import sticker06 from "../assets/branding/onigiri-06.webp";

/** @typedef {'mark' | 'main' | 'horizontal' | 'mascot' | 'sticker'} BrandImageVariant */

export const branding = {
  siteName: "Mi Truyen",
  domain: "mitruyen.me",
  mark,
  main,
  horizontal,
  mascot,
  stickers: [sticker01, sticker02, sticker03, sticker04, sticker05, sticker06],
};

export function getSticker(index) {
  const list = branding.stickers;
  if (!list.length) return branding.mark;
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}
