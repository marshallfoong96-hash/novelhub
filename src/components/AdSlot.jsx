import { useEffect, useRef, useState } from "react";
import {
  isPropellerTagEnabled,
  PROPELLER_INPAGE_SCRIPT_SRC,
  resolvePropellerInpageZone,
} from "../lib/adsConfig";

/**
 * Propeller In-Page Push — lazy injects provider snippet style near viewport.
 * @param {'home'|'detail'|'chapterTop'|'chapterBottom'} placement
 * @param {boolean} [compact] — narrower max width + shorter slot (e.g. chapter top)
 */
export default function AdSlot({
  placement = "home",
  className = "",
  minHeightClass = "min-h-[100px]",
  label = "Qu?ng cáo",
  compact = false,
}) {
  const containerRef = useRef(null);
  const scriptPushedRef = useRef(false);
  const [inView, setInView] = useState(false);

  const zone = resolvePropellerInpageZone(placement);
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

    const inject = () => {
      if (scriptPushedRef.current) return true;
      if (root.offsetWidth < 2) return false;
      const host = root.querySelector(".mi-propeller-tag-host");
      if (!host || host.querySelector("script[data-mi-propeller-placement]")) {
        scriptPushedRef.current = true;
        return true;
      }

      // Equivalent to:
      // <script>(function(s){s.dataset.zone='10922520',s.src='https://nap5k.com/tag.min.js'})(...appendChild(document.createElement('script')))</script>
      const s = document.createElement("script");
      s.src = PROPELLER_INPAGE_SCRIPT_SRC;
      s.dataset.zone = String(zone);
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
  const minH = compact ? "50px" : isChapterPlacement ? "54px" : "90px";
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
            style={{ minHeight: minH }}
          />
        ) : (
          <span className="text-xs text-muted-foreground/80 px-4 text-center">
            B?t Propeller: d?t VITE_PROPELLER_INPAGE_ZONE ho?c zone theo t?ng v? trí trong .env.
          </span>
        )}
      </div>
    </aside>
  );
}
