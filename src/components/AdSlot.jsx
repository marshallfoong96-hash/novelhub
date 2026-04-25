import { useEffect, useRef, useState } from "react";
import {
  isPropellerTagEnabled,
  PROPELLER_TAG_SCRIPT_SRC,
  resolvePropellerZone,
} from "../lib/adsConfig";

/**
 * Propeller (tag.min.js) — lazy-injects when near viewport. Fixed min-height reduces CLS.
 * @param {'home'|'detail'|'chapterTop'|'chapterBottom'} placement
 * @param {boolean} [compact] — narrower max width + shorter slot (e.g. chapter top)
 */
export default function AdSlot({
  placement = "home",
  className = "",
  minHeightClass = "min-h-[100px]",
  label = "Quảng cáo",
  compact = false,
}) {
  const containerRef = useRef(null);
  const scriptPushedRef = useRef(false);
  const [inView, setInView] = useState(false);

  const zone = resolvePropellerZone(placement);
  const active = isPropellerTagEnabled();
  const isChapterPlacement = placement === "chapterTop" || placement === "chapterBottom";

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: "180px 0px", threshold: 0 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !active || scriptPushedRef.current) return;
    const root = containerRef.current;
    if (!root) return;

    /** Step 2 in `index.html` already loads the main tag — avoid duplicate `<script>` (and satisfy verification). */
    const headTagPresent =
      typeof document !== "undefined" &&
      document.querySelector("script[data-mi-propeller-head-tag]");

    const inject = () => {
      if (scriptPushedRef.current) return true;
      if (root.offsetWidth < 2) return false;
      const host = root.querySelector(".mi-propeller-tag-host");
      if (!host || host.querySelector("script[data-mi-propeller-placement]")) {
        scriptPushedRef.current = true;
        return true;
      }
      if (headTagPresent) {
        scriptPushedRef.current = true;
        return true;
      }
      const s = document.createElement("script");
      s.src = PROPELLER_TAG_SCRIPT_SRC;
      s.async = true;
      s.setAttribute("data-cfasync", "false");
      s.setAttribute("data-zone", zone);
      s.setAttribute("data-mi-propeller-placement", placement);
      host.appendChild(s);
      scriptPushedRef.current = true;
      return true;
    };

    if (inject()) return undefined;

    const ro = new ResizeObserver(() => {
      if (inject()) ro.disconnect();
    });
    ro.observe(root);
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (inject()) ro.disconnect();
      });
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id1);
    };
  }, [inView, active, placement, zone]);

  const maxW = compact ? "max-w-md" : isChapterPlacement ? "max-w-md" : "max-w-4xl";
  const insMinH = compact ? "50px" : isChapterPlacement ? "54px" : "90px";
  const shellClass = isChapterPlacement
    ? `${minHeightClass} max-h-[92px] sm:max-h-[104px]`
    : minHeightClass;

  return (
    <aside
      ref={containerRef}
      className={`ad-slot w-full ${maxW} mx-auto ${className}`}
      aria-label={label}
    >
      <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <div
        className={`${shellClass} flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 overflow-hidden`}
      >
        {active ? (
          <div
            className="mi-propeller-tag-host w-full max-w-full flex flex-col items-center justify-center px-1"
            style={{ minHeight: insMinH }}
          />
        ) : (
          <span className="text-xs text-muted-foreground/80 px-4 text-center">
            Bật Propeller: đặt VITE_PROPELLER_TAG_ZONE (hoặc zone theo từng vị trí trong .env.example).
          </span>
        )}
      </div>
    </aside>
  );
}
