import { useEffect } from 'react';
import { X } from 'lucide-react';

/** Ảnh quét QR Mi Truyện — đặt file tại `public/donate-mi-truyen-qr.png` (thay thế ảnh cũ). */
export const DONATE_CARD_IMAGE = '/donate-mi-truyen-qr.png';

const DONATE_ALT =
  'Mi Truyện — quét mã QR chuyển khoản TECHCOMBANK. Thẻ có chữ Cảm ơn và logo Mi Truyện.';

export default function DonateModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="relative z-[1] max-h-[min(92vh,900px)] w-full max-w-lg overflow-auto rounded-2xl border border-border bg-card p-3 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-start justify-between gap-2 pl-1">
          <h2 id="donate-modal-title" className="text-base font-semibold text-foreground">
            Ủng hộ Mi Truyện
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="sr-only">{DONATE_ALT}</p>
        <img
          src={`${DONATE_CARD_IMAGE}?v=2`}
          alt={DONATE_ALT}
          className="mx-auto w-full max-w-md rounded-lg object-contain"
          loading="eager"
          decoding="async"
        />
        <p className="mt-3 px-1 text-center text-xs text-muted-foreground">
          Quét mã TECHCOMBANK trên ảnh — Cảm ơn bạn đã ủng hộ Mi Truyện
        </p>
      </div>
    </div>
  );
}
