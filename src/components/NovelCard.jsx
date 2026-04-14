import { Link } from 'react-router-dom';
import { Eye, CheckCircle } from 'lucide-react';
import { coverImageProps } from '../lib/coverImageProps';
import { formatNumber, novelChapterSubtitle } from '../utils/helpers';

function NovelCard({ novel, showStatus = false, variant = 'default', coverPriority = false }) {
  const imgExtra = coverImageProps(coverPriority);
  /** Lưới 3 cột mobile — bìa đầy ô, chữ nhỏ (tham chiếu LINE Webtoon). */
  if (variant === 'webtoon') {
    return (
      <Link to={`/truyen/${novel.id}`} className="group block min-w-0">
        <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-secondary ring-1 ring-border/40">
          <img
            src={novel.cover_url || '/default-cover.jpg'}
            alt={novel.title}
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
            {...imgExtra}
          />
          {showStatus && (
            <div className="absolute left-1 top-1 flex flex-col gap-0.5">
              {novel.status === 'completed' && (
                <span className="rounded px-1 py-0.5 bg-[hsl(var(--success))] text-[8px] font-bold leading-none text-white">
                  FULL
                </span>
              )}
            </div>
          )}
          <div className="absolute bottom-1 right-1">
            <span className="flex items-center gap-0.5 rounded bg-foreground/75 px-1 py-0.5 text-[8px] font-medium text-background">
              <Eye className="h-2 w-2 shrink-0" />
              {formatNumber(novel.view_count || 0)}
            </span>
          </div>
        </div>
        <div className="mt-1">
          <h3 className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground group-hover:text-accent sm:text-xs">
            {novel.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
            {novelChapterSubtitle(novel)}
          </p>
        </div>
      </Link>
    );
  }

  // Featured variant - larger card with more info
  if (variant === 'featured') {
    return (
      <Link to={`/truyen/${novel.id}`} className="group block">
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
          <img
            src={novel.cover_url || '/default-cover.jpg'}
            alt={novel.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            {...imgExtra}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {novel.status === 'completed' && (
              <span className="px-1.5 py-0.5 bg-[hsl(var(--success))] text-white text-[10px] font-bold rounded flex items-center gap-0.5">
                <CheckCircle className="w-2.5 h-2.5" />
                FULL
              </span>
            )}
          </div>
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">
              {novel.title}
            </h3>
            <p className="text-xs text-white/70 line-clamp-2 mb-2">
              {novel.description}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-white/60">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatNumber(novel.view_count || 0)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Compact variant - smaller, more info-dense
  if (variant === 'compact') {
    return (
      <Link to={`/truyen/${novel.id}`} className="group block">
        <div className="relative aspect-[2/3] rounded overflow-hidden bg-secondary">
          <img
            src={novel.cover_url || '/default-cover.jpg'}
            alt={novel.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            {...imgExtra}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          
          {/* Status Badges */}
          {showStatus && (
            <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
              {novel.status === 'completed' && (
                <span className="px-1.5 py-0.5 bg-[hsl(var(--success))] text-white text-[9px] font-bold rounded">
                  FULL
                </span>
              )}
            </div>
          )}
          
          {/* View count badge */}
          <div className="absolute bottom-1.5 right-1.5">
            <span className="px-1.5 py-0.5 bg-foreground/80 text-background text-[9px] font-medium rounded flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />
              {formatNumber(novel.view_count || 0)}
            </span>
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-tight">
            {novel.title}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
            {novelChapterSubtitle(novel)}
          </p>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link to={`/truyen/${novel.id}`} className="group block">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2">
        <img
          src={novel.cover_url || '/default-cover.jpg'}
          alt={novel.title}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          {...imgExtra}
        />
        
        {/* Overlay with stats */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status Badge */}
        {showStatus && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {novel.status === 'completed' && (
              <span className="px-2 py-0.5 bg-[hsl(var(--success))] text-white text-[10px] font-bold rounded flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                FULL
              </span>
            )}
          </div>
        )}
        
        {/* Stats Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center justify-between text-xs text-white">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(novel.view_count || 0)}
            </span>
          </div>
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-tight">
        {novel.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        {novelChapterSubtitle(novel)}
      </p>
    </Link>
  );
}

export default NovelCard;
