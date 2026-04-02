import { Link } from 'react-router-dom';
import { Eye, BookOpen } from 'lucide-react';
import { formatNumber } from '../utils/helpers';

function NovelCard({ novel, showStatus = false }) {
  return (
    <Link to={`/truyen/${novel.slug}`} className="group">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-gray-100">
        <img
          src={novel.cover || '/default-cover.jpg'}
          alt={novel.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {showStatus && novel.status === 'completed' && (
          <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
            FULL
          </span>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center gap-2 text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {formatNumber(novel.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {novel.totalChapters}
            </span>
          </div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-500 transition-colors">
        {novel.title}
      </h3>
    </Link>
  );
}

export default NovelCard;
