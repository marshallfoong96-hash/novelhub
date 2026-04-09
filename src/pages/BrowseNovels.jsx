import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, ArrowUp } from "lucide-react";
import NovelCard from "../components/NovelCard";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getGenreMeta(genre) {
  return {
    ...genre,
    image: genre.image || genre.cover_url || genre.banner_url || "/default-cover.jpg"
  };
}

function BrowseNovels({ mode = "all" }) {
  const { slug, range } = useParams();
  const [novels, setNovels] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [showBackTop, setShowBackTop] = useState(false);
  const [chapterRangePool, setChapterRangePool] = useState([]);
  const [chapterCounts, setChapterCounts] = useState({});
  const sentinelRef = useRef(null);
  const PAGE_SIZE = 24;

  useEffect(() => {
    const fetchGenres = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      const { data, error: genresError } = await supabase
        .from("genres")
        .select("*")
        .order("name", { ascending: true });
      if (genresError) {
        setError(genresError.message || "Failed to load genres.");
        setGenres([]);
      } else {
        setGenres((data || []).map(getGenreMeta));
      }
    };
    fetchGenres();
  }, []);

  const activeGenre = useMemo(() => {
    if (!slug) return null;
    return genres.find((genre) => normalize(genre.slug) === normalize(slug)) || null;
  }, [genres, slug]);

  const buildQuery = useCallback((from, to) => {
    let query = supabase
      .from("novels")
      .select("*")
      .range(from, to);

    if (mode === "hot") {
      query = query.order("view_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (mode === "completed") {
      query = query.eq("status", "completed");
    }
    if (mode === "ongoing") {
      query = query.eq("status", "ongoing");
    }
    if (mode === "category" && activeGenre?.id) {
      query = query.eq("genre_id", activeGenre.id);
    }

    return query;
  }, [mode, activeGenre]);

  const matchChapterRange = useCallback((count) => {
    if (range === "duoi-100") return count < 100;
    if (range === "100-500") return count >= 100 && count <= 500;
    if (range === "500-1000") return count > 500 && count <= 1000;
    if (range === "tren-1000") return count > 1000;
    return true;
  }, [range]);

  const fetchPage = useCallback(async (pageIndex, replace = false) => {
    if (mode === "chapterRange") {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      const chunk = chapterRangePool.slice(from, to);
      setNovels((prev) => (replace ? chunk : [...prev, ...chunk]));
      setHasMore(to < chapterRangePool.length);
      setPage(pageIndex);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured.");
      setNovels([]);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (mode === "category" && slug && !activeGenre) {
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setNovels([]);
      return;
    }

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: fetchError } = await buildQuery(from, to);
    if (fetchError) {
      setError(fetchError.message || "Failed to load novels.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    const newRows = data || [];
    setNovels((prev) => (replace ? newRows : [...prev, ...newRows]));
    setHasMore(newRows.length === PAGE_SIZE);
    setPage(pageIndex);
    setLoading(false);
    setLoadingMore(false);
  }, [buildQuery, mode, slug, activeGenre, chapterRangePool]);

  useEffect(() => {
    if (mode === "category" && slug && genres.length === 0) return;
    setError("");
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setNovels([]);
    if (mode !== "chapterRange") {
      fetchPage(0, true);
    }
  }, [mode, slug, range, genres.length, fetchPage]);

  useEffect(() => {
    const fetchChapterRangePool = async () => {
      if (mode !== "chapterRange") return;
      if (!isSupabaseConfigured || !supabase) return;
      setLoading(true);
      const { data: allNovels, error: novelsError } = await supabase
        .from("novels")
        .select("*")
        .order("created_at", { ascending: false });
      if (novelsError) {
        setError(novelsError.message || "Failed to load novels.");
        setLoading(false);
        return;
      }

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("novel_id, chapter_number");
      if (chaptersError) {
        setError(chaptersError.message || "Failed to load chapters.");
        setLoading(false);
        return;
      }

      const counts = {};
      (chaptersData || []).forEach((row) => {
        const current = counts[row.novel_id] || 0;
        const chapterNum = Number(row.chapter_number) || 0;
        counts[row.novel_id] = chapterNum > current ? chapterNum : current;
      });
      setChapterCounts(counts);

      const filtered = (allNovels || []).filter((novel) => matchChapterRange(counts[novel.id] || 0));
      setChapterRangePool(filtered);
      const firstChunk = filtered.slice(0, PAGE_SIZE);
      setNovels(firstChunk);
      setPage(0);
      setHasMore(filtered.length > PAGE_SIZE);
      setLoading(false);
      setLoadingMore(false);
    };

    fetchChapterRangePool();
  }, [mode, range, matchChapterRange]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        if (loading || loadingMore || !hasMore) return;
        setLoadingMore(true);
        fetchPage(page + 1, false);
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, page, fetchPage]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackTop(window.scrollY > 480);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const titleMap = {
    all: "Tat ca truyen",
    hot: "Truyen Hot",
    recent: "Moi cap nhat",
    completed: "Truyen Full",
    ongoing: "Truyen dang tien hanh",
    chapterRange: `So chuong: ${
      range === "duoi-100" ? "Duoi 100" :
      range === "100-500" ? "100 - 500" :
      range === "500-1000" ? "500 - 1000" :
      range === "tren-1000" ? "Tren 1000" : "Tat ca"
    }`,
    category: `The loai: ${activeGenre?.name || slug || ""}`
  };

  return (
    <div className="space-y-6">
      {mode === "category" && slug && (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card">
          <img
            src={activeGenre?.image || "/default-cover.jpg"}
            alt={activeGenre?.name || slug}
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-white">{activeGenre?.name || slug}</h1>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{titleMap[mode]}</h2>
        <Link to="/the-loai" className="text-sm text-accent hover:underline">
          Xem the loai
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="animate-pulse">
              <div className="aspect-[2/3] rounded bg-secondary mb-2" />
              <div className="h-3 rounded bg-secondary mb-1" />
              <div className="h-3 w-2/3 rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : novels.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Chua co truyen phu hop.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {novels.map((novel) => (
              <div key={novel.id} className="relative">
                <NovelCard novel={novel} showStatus variant="compact" />
                {mode === "chapterRange" && (
                  <span className="absolute left-1.5 bottom-12 text-[10px] px-1.5 py-0.5 rounded bg-foreground/80 text-background">
                    {chapterCounts[novel.id] || 0} chuong
                  </span>
                )}
              </div>
            ))}
          </div>

          <div ref={sentinelRef} className="h-8" />
          {loadingMore && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={`more-${idx}`} className="animate-pulse">
                  <div className="aspect-[2/3] rounded bg-secondary mb-2" />
                  <div className="h-3 rounded bg-secondary mb-1" />
                  <div className="h-3 w-2/3 rounded bg-secondary" />
                </div>
              ))}
            </div>
          )}
          {!hasMore && novels.length > 0 && (
            <div className="text-center text-xs text-muted-foreground">Da hien thi tat ca truyen.</div>
          )}
        </>
      )}

      {showBackTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-accent text-accent-foreground text-xs font-medium shadow-lg hover:bg-accent/90 transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          Top
        </button>
      )}
    </div>
  );
}

export default BrowseNovels;
