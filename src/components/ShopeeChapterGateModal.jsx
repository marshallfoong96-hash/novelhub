import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SHOPEE_AFFILIATE_URL, markShopeeGateSessionConsumed } from '../lib/shopeeGate';
import { branding, getSticker } from '../lib/branding';

/**
 * Một lần mỗi tab: lần đầu đọc tiến chương (cùng truyện) — đóng / CTA → không hiện lại đến khi đóng tab.
 */
export default function ShopeeChapterGateModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        markShopeeGateSessionConsumed();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const finish = () => {
    markShopeeGateSessionConsumed();
    onClose();
  };

  const handleCta = () => {
    window.open(SHOPEE_AFFILIATE_URL, '_blank', 'noopener,noreferrer');
    finish();
  };

  const handleDismiss = () => {
    finish();
  };

  /** 僅頂部左右兩顆，不與下方橘色 CTA 重疊；右側避開關閉鈕 */
  const deco = [
    { src: getSticker(0), className: 'left-3 top-3 -rotate-6', size: 'h-8 w-8 sm:h-9 sm:w-9' },
    { src: getSticker(2), className: 'right-14 top-3 rotate-6', size: 'h-8 w-8 sm:h-9 sm:w-9' },
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
          />
        ))}

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-[1] px-4 pb-4 pt-[2.75rem] text-center sm:pt-12">
          <h2 id="shopee-gate-title" className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">
            Mời bạn CLICK vào liên kết bên dưới để mở khóa toàn bộ chương truyện!
          </h2>
          <button
            type="button"
            onClick={handleCta}
            className="mt-3 text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
          >
            Mở ưu đãi Shopee (miễn phí)
          </button>

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

          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            {branding.siteName} và đội ngũ Editor xin chân thành cảm ơn.
          </p>
        </div>
      </div>
    </div>
  );
}
