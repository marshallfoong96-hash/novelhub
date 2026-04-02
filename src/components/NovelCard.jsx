import { Link } from 'react-router-dom';
import { Eye, BookOpen, CheckCircle } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

function NovelCard({ novel, showStatus = false, variant = 'default' }) {
  if (variant === 'featured') {
    return (
      <Link to={`/truyen/${novel.slug}`} className="group block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary">
          <img
            src={novel.cover || '/default-cover.jpg'}
            alt={novel.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Status Badge */}
          {novel.status === 'completed' && (
            <span className="absolute top-3 right-3 px-2.5 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-md flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Complete
            </span>
          )}
          
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-accent transition-colors">
              {novel.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {novel.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatNumber(novel.viewCount)}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {novel.totalChapters} chapters
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/truyen/${novel.slug}`} className="group block">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-3">
        <img
          src={novel.cover || '/default-cover.jpg'}
          alt={novel.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Overlay with stats */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status Badge */}
        {showStatus && novel.status === 'completed' && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs font-semibold rounded">
            Complete
          </span>
        )}
        
        {/* Stats Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center justify-between text-xs text-foreground">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(novel.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {novel.totalChapters}
            </span>
          </div>
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-tight">
        {novel.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1">
        {novel.author || 'Unknown Author'}
      </p>
    </Link>
  );
}

export default NovelCard;
