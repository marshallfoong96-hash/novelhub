import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History, BookOpen, Clock } from "lucide-react";
import { coverImageProps } from "../lib/coverImageProps";
import { listCoverUrl } from "../lib/coverImageUrl";

function ReadingHistory() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mi_reading_history");
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-accent" />
        <h1 className="text-xl font-bold text-foreground">Lich su doc truyen</h1>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">Chưa có lịch sử đọc.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {items.map((item, idx) => (
            <Link
              key={`${item.chapterId}-${item.readAt}`}
              to={`/chapter/${item.chapterId}`}
              className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors"
            >
              <img
                src={listCoverUrl(item.coverUrl)}
                alt={item.title}
                className="w-12 h-16 object-contain rounded bg-secondary"
                {...coverImageProps(idx < 10)}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-foreground line-clamp-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Chuong {item.chapterNumber}: {item.chapterTitle}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {new Date(item.readAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReadingHistory;
