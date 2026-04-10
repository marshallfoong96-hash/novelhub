import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, isAdsConfigured, resolveAdSlot } from "../lib/adsConfig";

/**
 * Responsive display unit; lazy-loads when near viewport. Fixed min-height reduces CLS.
 * @param {'home'|'detail'|'chapterTop'|'chapterBottom'} placement
 */
export default function AdSlot({
  placement = "home",
  className = "",
  minHeightClass = "min-h-[100px]",
  label = "Quảng cáo"
}) {
  const containerRef = useRef(null);
  const insRef = useRef(null);
  const pushedRef = useRef(false);
  const [inView, setInView] = useState(false);

  const slotId = resolveAdSlot(placement);
  const active = isAdsConfigured(placement);

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
    if (!inView || !active || pushedRef.current) return;
    const ins = insRef.current;
    if (!ins) return;
    pushedRef.current = true;
    const run = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.warn("[ads]", e);
        pushedRef.current = false;
      }
    };
    setTimeout(run, 0);
  }, [inView, active]);

  return (
    <aside
      ref={containerRef}
      className={`ad-slot w-full max-w-4xl mx-auto ${className}`}
      aria-label={label}
    >
      <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <div
        className={`${minHeightClass} flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 overflow-hidden`}
      >
        {active ? (
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <span className="text-xs text-muted-foreground/80 px-4 text-center">
            Thêm VITE_ADSENSE_CLIENT và slot trong .env để hiển thị quảng cáo
          </span>
        )}
      </div>
    </aside>
  );
}
