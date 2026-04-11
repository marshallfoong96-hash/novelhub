import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SHOPEE_AFFILIATE_URL } from '../lib/shopeeGate';
import { branding } from '../lib/branding';

/**
 * Pop-up khi sang chương số lớn hơn chương vừa đọc (liền kề hoặc nhảy cóc) trong cùng truyện.
 * CTA: mở Shopee tab mới + đóng modal (đã ở đúng chương).
 */
export default function ShopeeChapterGateModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
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

  const handleCta = () => {
    window.open(SHOPEE_AFFILIATE_URL, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleDismiss = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopee-gate-title"
    >
      <div className="relative my-auto w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-4 pb-4 pt-10 text-center">
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
