import { useState } from 'react';
import { branding } from '../lib/branding';

export default function ReaderErrorState({
  title = 'Ôi không, tải dữ liệu thất bại.',
  message = 'Loading failed. Vui lòng kiểm tra mạng rồi thử lại.',
  retryLabel = 'Thử lại',
  onRetry,
  compact = false,
}) {
  const imageSize = compact ? 'h-20 w-20' : 'h-28 w-28';
  const [imgSrc, setImgSrc] = useState('/crying-onigiri.webp');

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'gap-2 px-3 py-4' : 'gap-3 px-4 py-6'
      }`}
      role="alert"
    >
      <img
        src={imgSrc}
        alt="Onigiri buồn đang khóc"
        className={`${imageSize} rounded-2xl object-cover shadow-sm ring-1 ring-border/60`}
        loading="lazy"
        decoding="async"
        onError={() => setImgSrc(branding.mascot)}
      />
      <p className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-foreground`}>{title}</p>
      <p className={`${compact ? 'text-xs' : 'text-sm'} max-w-md text-destructive`}>
        <span aria-hidden>🍙😭 </span>
        {message}
      </p>
      {typeof onRetry === 'function' ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/90"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
