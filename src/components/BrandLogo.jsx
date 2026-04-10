import { branding, getSticker } from "../lib/branding";

const variantSrc = {
  mark: branding.mark,
  main: branding.main,
  horizontal: branding.horizontal,
  mascot: branding.mascot,
};

/**
 * @param {{
 *   variant?: 'mark' | 'main' | 'horizontal' | 'mascot' | 'sticker',
 *   stickerIndex?: number,
 *   alt?: string,
 *   className?: string,
 *   imgClassName?: string,
 *   loading?: 'eager' | 'lazy',
 * }} props
 */
function BrandLogo({
  variant = "mark",
  stickerIndex = 0,
  alt = "Mi Truyen",
  className = "",
  imgClassName = "",
  loading = "lazy",
}) {
  const src =
    variant === "sticker" ? getSticker(stickerIndex) : variantSrc[variant] || branding.mark;

  const isHorizontal = variant === "horizontal";

  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden bg-card ${className}`.trim()}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        draggable={false}
        className={`select-none ${isHorizontal ? "h-full w-auto max-w-[min(100%,220px)] object-contain object-left" : "h-full w-full object-cover"} ${imgClassName}`.trim()}
      />
    </span>
  );
}

export default BrandLogo;
