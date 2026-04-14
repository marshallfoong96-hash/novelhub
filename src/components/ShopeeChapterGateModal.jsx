import { useEffect } from 'react';
import {
  SHOPEE_AFFILIATE_URL,
  markShopeeGateSessionConsumed,
  warmShopeeAffiliateForReader,
} from '../lib/shopeeGate';
import { branding, getSticker } from '../lib/branding';

/**
 * Một lần mỗi tab: lần đầu đọc tiến chương (cùng truyện) — chỉ đóng sau khi bấm liên kết Shopee; không hiện lại đến khi đóng tab.
 * CTA / ảnh trang trí: ưu tiên nút bấm (không phụ thuộc ảnh sticker); preconnect + prefetch URL khi mở.
 */
export default function ShopeeChapterGateModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    warmShopeeAffiliateForReader();
  }, [open]);

  if (!open) return null;

  const finish = () => {
    markShopeeGateSessionConsumed();
    onClose();
  };

  const handleCta = () => {
    window.open(SHOPEE_AFFILIATE_URL, '_blank', 'noopener,noreferrer');
    finish();
  };

  /** Chỉ hai sticker góc trên — không đè lên CTA cam. */
  const deco = [
    { src: getSticker(0), className: 'left-3 top-3 -rotate-6', size: 'h-8 w-8 sm:h-9 sm:w-9' },
    { src: getSticker(2), className: 'right-3 top-3 rotate-6', size: 'h-8 w-8 sm:h-9 sm:w-9' },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopee-gate-title"
    >
      <div className="relative my-auto w-full max-w-md overflow-visible rounded-2xl border border-border bg-card shadow-2xl">
        {deco.map((d, i) => (
          <img
            key={i}
            src={d.src}
            alt=""
            className={`pointer-events-none absolute z-0 select-none rounded-full object-cover opacity-85 shadow-sm ring-2 ring-white/40 dark:ring-white/10 ${d.className} ${d.size}`}
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ))}

        <div className="relative z-[1] px-4 pb-4 pt-10 text-center sm:pt-12">
          <h2 id="shopee-gate-title" className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">
            Mời bạn CLICK vào liên kết bên dưới để mở khóa toàn bộ chương truyện!
          </h2>

          <button
            type="button"
            onClick={handleCta}
            className="mt-4 w-full overflow-hidden rounded-xl border border-orange-200 bg-gradient-to-br from-[#fff5f0] to-[#ffe8dc] shadow-inner transition hover:opacity-95 dark:border-orange-900/50 dark:from-orange-950/40 dark:to-orange-950/20"
          >
            <div className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-1 px-3 py-4 sm:aspect-[24/9]">
              <span className="text-xs font-bold uppercase tracking-wide text-[#ee4d2d]">
                Shopee
              </span>
              <span className="text-xs font-semibold text-foreground/90">
                Nhấn để xem ưu đãi — hỗ trợ {branding.siteName}
              </span>
            </div>
          </button>

          <a
            href={SHOPEE_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
            onClick={(e) => {
              e.preventDefault();
              handleCta();
            }}
          >
            Mở ưu đãi Shopee (miễn phí)
          </a>

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {branding.siteName} và đội ngũ Editor xin chân thành cảm ơn.
          </p>
        </div>
      </div>
    </div>
  );
}
