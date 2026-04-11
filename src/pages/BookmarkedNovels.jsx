import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import NovelCard from "../components/NovelCard";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function readBookmarkIds() {
  try {
    const raw = localStorage.getItem("mi_bookmarks");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => Number(id)).filter(Boolean))];
  } catch {
    return [];
  }
}

function BookmarkedNovels() {
  const [ids, setIds] = useState(() => readBookmarkIds());
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIds(readBookmarkIds());
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setNovels([]);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setNovels([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("novels").select("*").in("id", ids);
      if (cancelled) return;
      if (error) {
        console.error("[BookmarkedNovels]", error);
        setNovels([]);
      } else {
        const rows = data || [];
        const order = new Map(ids.map((id, i) => [id, i]));
        rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setNovels(rows);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Bookmark className="w-5 h-5 text-accent shrink-0" />
        <h1 className="text-xl font-bold text-foreground">Truyện đánh dấu</h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        Các truyện bạn đã bấm <span className="text-foreground font-medium">Đánh dấu</span> trên trang chi tiết được lưu trên trình duyệt này (
        <span className="font-mono text-xs">localStorage</span>). Đăng nhập tài khoản trong tương lai có thể đồng bộ lên máy chủ.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : ids.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
          <p className="text-muted-foreground text-sm mb-4">Chưa có truyện đánh dấu.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            Về trang chủ tìm truyện
          </Link>
        </div>
      ) : novels.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Không tìm thấy truyện trên máy chủ (có thể đã gỡ).{" "}
          <Link to="/" className="text-accent font-medium hover:underline">
            Trang chủ
          </Link>
        </div>
      ) : (
        <div className="novel-feed-grid">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} showStatus variant="webtoon" />
          ))}
        </div>
      )}
    </div>
  );
}

export default BookmarkedNovels;
