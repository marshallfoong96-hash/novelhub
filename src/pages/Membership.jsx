import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Heart,
  Users,
  Bookmark,
  History,
  Tag,
  Trash2,
  Clock,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { fetchGenresCached } from "../lib/cachedQueries";
import { fetchNovelsByIdsCached } from "../lib/cachedNovelQueries";
import { enrichNovelsWithLatestChapter } from "../lib/enrichNovelsLatestChapter";
import NovelCard from "../components/NovelCard";
import { coverImageProps } from "../lib/coverImageProps";
import { listCoverUrl } from "../lib/coverImageUrl";
import {
  LS_FAVORITES,
  LS_FOLLOWS,
  LS_BOOKMARKS,
  LS_READING_HISTORY,
  LS_MEMBER_GENRE_SLUGS,
  readNumericIdArray,
  readGenreTagSlugs,
  writeGenreTagSlugs,
  readReadingHistory,
  removeHistoryEntryByChapterId,
} from "../lib/memberStorage";

const PROFILE_NOVEL_SELECT =
  "id,title,cover_url,view_count,status,created_at,description,likes,follow_count";

function orderNovelsByIds(novels, ids) {
  const map = new Map((novels || []).map((n) => [n.id, n]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

export default function Membership() {
  const { user } = useAuth();
  const location = useLocation();

  const [favoriteIds, setFavoriteIds] = useState(() => readNumericIdArray(LS_FAVORITES));
  const [followIds, setFollowIds] = useState(() => readNumericIdArray(LS_FOLLOWS));
  const [bookmarkIds, setBookmarkIds] = useState(() => readNumericIdArray(LS_BOOKMARKS));
  const [genreSlugs, setGenreSlugs] = useState(() => readGenreTagSlugs());
  const [historyItems, setHistoryItems] = useState(() => readReadingHistory());
  const [genres, setGenres] = useState([]);

  const [favoriteNovels, setFavoriteNovels] = useState([]);
  const [followNovels, setFollowNovels] = useState([]);
  const [loadingNovels, setLoadingNovels] = useState(true);
  const mergedIds = useMemo(
    () => [...new Set([...favoriteIds, ...followIds])],
    [favoriteIds, followIds]
  );

  const reloadLocal = useCallback(() => {
    setFavoriteIds(readNumericIdArray(LS_FAVORITES));
    setFollowIds(readNumericIdArray(LS_FOLLOWS));
    setBookmarkIds(readNumericIdArray(LS_BOOKMARKS));
    setGenreSlugs(readGenreTagSlugs());
    setHistoryItems(readReadingHistory());
  }, []);

  useEffect(() => {
    reloadLocal();
  }, [location.pathname, reloadLocal]);

  useEffect(() => {
    const onFocus = () => reloadLocal();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reloadLocal]);

  useEffect(() => {
    const onStorage = (e) => {
      if (
        !e.key ||
        [
          LS_FAVORITES,
          LS_FOLLOWS,
          LS_BOOKMARKS,
          LS_READING_HISTORY,
          LS_MEMBER_GENRE_SLUGS,
        ].includes(e.key)
      ) {
        reloadLocal();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reloadLocal]);

  useEffect(() => {
    (async () => {
      const rows = await fetchGenresCached();
      setGenres(Array.isArray(rows) ? rows : []);
    })();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || mergedIds.length === 0) {
      setFavoriteNovels([]);
      setFollowNovels([]);
      setLoadingNovels(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingNovels(true);
      let data = [];
      try {
        data = await fetchNovelsByIdsCached(supabase, mergedIds, PROFILE_NOVEL_SELECT);
      } catch (error) {
        console.error("[Membership] novels", error);
      }
      if (cancelled) return;
      if (data.length === 0) {
        setFavoriteNovels([]);
        setFollowNovels([]);
      } else {
        const rows = await enrichNovelsWithLatestChapter(supabase, data);
        setFavoriteNovels(orderNovelsByIds(rows, favoriteIds));
        setFollowNovels(orderNovelsByIds(rows, followIds));
      }
      setLoadingNovels(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [favoriteIds, followIds, mergedIds]);

  const toggleGenreSlug = (slug) => {
    const s = String(slug || "").trim();
    if (!s) return;
    const next = genreSlugs.includes(s)
      ? genreSlugs.filter((x) => x !== s)
      : [...genreSlugs, s];
    setGenreSlugs(next);
    writeGenreTagSlugs(next);
  };

  const handleRemoveHistory = (chapterId) => {
    const next = removeHistoryEntryByChapterId(chapterId);
    setHistoryItems(next);
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Khách";

  const genreOptions = useMemo(() => {
    return (genres || [])
      .map((g) => ({
        id: g.id,
        name: g.name || "",
        slug: String(g.slug || "")
          .trim()
          .toLowerCase(),
      }))
      .filter((g) => g.slug);
  }, [genres]);

  const historyNovelCount = useMemo(() => {
    return new Set(
      (historyItems || [])
        .map((item) => Number(item?.novelId))
        .filter((id) => Number.isFinite(id) && id > 0)
    ).size;
  }, [historyItems]);

  useEffect(() => {
    const hash = String(location.hash || "");
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Trung tâm thành viên
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xin chào, <span className="font-medium text-foreground">{displayName}</span>
            . Thích, theo dõi và lịch sử được lưu trên trình duyệt này (có thể đồng bộ tài
            khoản sau).
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3 sm:mt-0">
          <Link
            to="/dang-truyen"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Đăng truyện mới
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/danh-dau"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Truyện đánh dấu
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/dang-chuong"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Đăng chương mới
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stats — kiểu dashboard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link
          to="/profile#liked-novels"
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/35"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500" />
            Đã thích
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {favoriteIds.length}
          </p>
        </Link>
        <Link
          to="/profile#following-novels"
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/35"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4 text-sky-600" />
            Đang theo dõi
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {followIds.length}
          </p>
        </Link>
        <Link
          to="/danh-dau"
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/35"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Bookmark className="h-4 w-4 text-amber-600" />
            Đánh dấu
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {bookmarkIds.length}
          </p>
        </Link>
        <Link
          to="/profile#reading-history"
          className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/35"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="h-4 w-4 text-emerald-600" />
            Lịch sử đọc
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
            {historyNovelCount}
          </p>
        </Link>
      </div>

      {/* Thiết lập thể loại (tags) */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Tag className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-foreground">
            Thể loại quan tâm (nhãn)
          </h2>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Chọn thể loại bạn hay đọc — dùng để gợi ý trên trang chủ sau này. Bấm lần nữa để
          bỏ chọn.
        </p>
        {genreOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa tải được danh sách thể loại (kiểm tra Supabase).
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {genreOptions.map((g) => {
              const active = genreSlugs.includes(g.slug);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGenreSlug(g.slug)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-secondary/50 text-foreground hover:bg-secondary"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Truyện đã thích */}
      <section id="liked-novels">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <h2 className="text-base font-semibold text-foreground">Truyện đã thích</h2>
          </div>
        </div>
        {loadingNovels && mergedIds.length > 0 ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : favoriteIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
            Chưa có truyện thích. Vào trang truyện và bấm <strong>Yêu thích</strong>.
          </div>
        ) : (
          <div className="novel-feed-grid">
            {favoriteNovels.map((novel, i) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                showStatus
                variant="webtoon"
                coverPriority={i < 9}
              />
            ))}
          </div>
        )}
      </section>

      {/* Theo dõi */}
      <section id="following-novels">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-sky-600" />
          <h2 className="text-base font-semibold text-foreground">Truyện đang theo dõi</h2>
        </div>
        {loadingNovels && mergedIds.length > 0 ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : followIds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
            Chưa theo dõi truyện nào. Bấm <strong>Theo dõi</strong> ở trang chi tiết truyện.
          </div>
        ) : (
          <div className="novel-feed-grid">
            {followNovels.map((novel, i) => (
              <NovelCard
                key={novel.id}
                novel={novel}
                showStatus
                variant="webtoon"
                coverPriority={i < 9}
              />
            ))}
          </div>
        )}
      </section>

      {/* Lịch sử đọc — phía dưới */}
      <section id="reading-history" className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-foreground">Lịch sử đọc gần đây</h2>
          </div>
          <Link
            to="/lich-su"
            className="text-xs font-medium text-accent hover:underline sm:text-sm"
          >
            Mở trang lịch sử đầy đủ
          </Link>
        </div>
        {historyItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-10 w-10 opacity-50" />
            Chưa có lịch sử. Đọc một chương để thấy tại đây.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {historyItems.map((item, idx) => (
              <div
                key={`${item.chapterId}-${item.readAt}`}
                className="flex items-stretch gap-3 p-3 hover:bg-secondary/30"
              >
                <Link
                  to={`/chapter/${item.chapterId}`}
                  className="relative flex min-w-0 flex-1 items-center gap-3"
                >
                  <img
                    src={listCoverUrl(item.coverUrl)}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded bg-secondary object-cover"
                    {...coverImageProps(idx < 8)}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      Chương {item.chapterNumber}
                      {item.chapterTitle ? `: ${item.chapterTitle}` : ""}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      {new Date(item.readAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemoveHistory(item.chapterId)}
                  className="shrink-0 self-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Xóa khỏi lịch sử"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
