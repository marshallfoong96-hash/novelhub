import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, ArrowUp } from "lucide-react";
import NovelCard from "../components/NovelCard";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { fetchGenresCached } from "../lib/cachedQueries";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

/** Prefer DB `name`; otherwise turn slug `ga-thay` → `Ga thay` (no hyphens, first letter capital). */
function genreHeadingLabel(activeGenre, slug) {
  const name = activeGenre?.name?.trim();
  if (name) return name;
  if (!slug) return "";
  const spaced = String(slug).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return "";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getGenreMeta(genre) {
  return {
    ...genre,
    image: genre.image || genre.cover_url || genre.banner_url || "/default-cover.jpg"
  };
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function getGenreTheme(slug) {
  const key = normalize(slug);
  const themes = {
    "kinh-di": "from-[#1f2937] via-[#111827] to-[#0b1020]",
    horror: "from-[#1f2937] via-[#111827] to-[#0b1020]",
    romance: "from-[#db2777] via-[#be185d] to-[#7e22ce]",
    "tinh-yeu": "from-[#db2777] via-[#be185d] to-[#7e22ce]",
    fantasy: "from-[#2563eb] via-[#4f46e5] to-[#7c3aed]",
    "xuyen-khong": "from-[#0ea5e9] via-[#6366f1] to-[#8b5cf6]",
    isekai: "from-[#0ea5e9] via-[#6366f1] to-[#8b5cf6]",
    "do-thi": "from-[#0891b2] via-[#0284c7] to-[#1d4ed8]",
    "co-dai": "from-[#d97706] via-[#b45309] to-[#7c2d12]",
    "trinh-tham": "from-[#374151] via-[#111827] to-[#020617]",
    "ga-thay": "from-[#be185d] via-[#6b21a8] to-[#0f172a]"
  };
  return themes[key] || "from-[#4f46e5] via-[#312e81] to-[#0f172a]";
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
  /** null = category list not loaded yet; [] = loaded, no novels */
  const [categorySortedIds, setCategorySortedIds] = useState(null);

  useEffect(() => {
    const fetchGenres = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const data = await fetchGenresCached();
        setGenres((data || []).map(getGenreMeta));
      } catch (e) {
        setError(e?.message || "Failed to load genres.");
        setGenres([]);
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
    return query;
  }, [mode]);

  const matchChapterRange = useCallback((count) => {
    if (range === "duoi-100") return count < 100;
    if (range === "100-500") return count >= 100 && count <= 500;
    if (range === "500-1000") return count > 500 && count <= 1000;
    if (range === "tren-1000") return count > 1000;
    return true;
  }, [range]);

  const fetchPage = useCallback(async (pageIndex, replace = false) => {
    if (mode === "category" && activeGenre?.id) {
      if (categorySortedIds == null) {
        setLoadingMore(false);
        return;
      }
      const from = pageIndex * PAGE_SIZE;
      const sliceIds = categorySortedIds.slice(from, from + PAGE_SIZE);
      if (sliceIds.length === 0) {
        setNovels((prev) => (replace ? [] : prev));
        setHasMore(false);
        setPage(pageIndex);
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("novels")
        .select("*")
        .in("id", sliceIds);
      if (fetchError) {
        setError(fetchError.message || "Failed to load novels.");
        setLoading(false);
        setLoadingMore(false);
        return;
      }
      const rows = data || [];
      const ordered = sliceIds.map((id) => rows.find((n) => n.id === id)).filter(Boolean);
      setNovels((prev) => (replace ? ordered : [...prev, ...ordered]));
      setHasMore(from + sliceIds.length < categorySortedIds.length);
      setPage(pageIndex);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

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
      if (genres.length === 0) return;
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
  }, [buildQuery, mode, slug, activeGenre, chapterRangePool, categorySortedIds, genres.length]);

  useEffect(() => {
    if (mode !== "category") {
      setCategorySortedIds(null);
      return;
    }
    if (mode === "category" && slug && genres.length === 0) return;
    if (!activeGenre?.id || !isSupabaseConfigured || !supabase) {
      setCategorySortedIds([]);
      setNovels([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCategorySortedIds(null);
      setLoading(true);
      setError("");
      setNovels([]);
      setHasMore(true);
      const merged = new Set();
      const { data: junctionRows, error: junctionError } = await supabase
        .from("novel_genres")
        .select("novel_id")
        .eq("genre_id", activeGenre.id);
      if (!junctionError && junctionRows) {
        junctionRows.forEach((row) => merged.add(row.novel_id));
      }
      const { data: directRows } = await supabase.from("novels").select("id").eq("genre_id", activeGenre.id);
      (directRows || []).forEach((row) => merged.add(row.id));
      const ids = [...merged];
      if (ids.length === 0) {
        if (!cancelled) {
          setCategorySortedIds([]);
          setNovels([]);
          setHasMore(false);
          setLoading(false);
        }
        return;
      }
      const chunks = chunkArray(ids, 120);
      const minimal = [];
      for (const part of chunks) {
        const { data: metaRows, error: metaError } = await supabase
          .from("novels")
          .select("id,created_at,view_count")
          .in("id", part);
        if (metaError) {
          if (!cancelled) {
            setError(metaError.message || "Failed to load category novels.");
            setCategorySortedIds([]);
            setLoading(false);
          }
          return;
        }
        minimal.push(...(metaRows || []));
      }
      minimal.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const sortedIds = minimal.map((m) => m.id);
      if (cancelled) return;
      setCategorySortedIds(sortedIds);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, slug, activeGenre?.id, genres.length]);

  useEffect(() => {
    if (mode === "category" && slug && genres.length === 0) return;
    if (mode === "category") return;
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
    if (mode !== "category") return;
    if (!activeGenre?.id) return;
    if (categorySortedIds == null) return;
    fetchPage(0, true);
  }, [mode, activeGenre?.id, categorySortedIds, fetchPage]);

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
    category: `The loai: ${genreHeadingLabel(activeGenre, slug) || slug || ""}`
  };

  return (
    <div className="space-y-6">
      {mode === "category" && slug && (
        <div className="relative overflow-hidden rounded-2xl border border-border/70 shadow-xl min-h-[12rem] md:min-h-[14rem]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#121826] via-[#0f141d] to-[#0a0c12]" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 80% at 12% 18%, hsl(var(--accent) / 0.38), transparent 52%), radial-gradient(ellipse 90% 60% at 88% 78%, hsl(268 62% 48% / 0.32), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 110%, hsl(var(--accent) / 0.15), transparent 50%)"
            }}
          />
          {!(activeGenre?.image && activeGenre.image !== "/default-cover.jpg") && (
            <div
              className={`absolute inset-0 bg-gradient-to-br opacity-[0.42] mix-blend-soft-light ${getGenreTheme(activeGenre?.slug || slug)}`}
              aria-hidden
            />
          )}
          {activeGenre?.image && activeGenre.image !== "/default-cover.jpg" ? (
            <>
              <img
                src={activeGenre.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-[0.22] mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#070a10]/95 via-[#070a10]/78 to-[#070a10]/45" />
            </>
          ) : null}
          <div
            className="absolute inset-0 opacity-[0.11]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute -left-20 top-1/2 h-[24rem] w-[24rem] -translate-y-1/2 rounded-full border border-white/[0.06]" aria-hidden />
          <div
            className="pointer-events-none absolute -bottom-28 right-[-12%] h-[20rem] w-[20rem] rounded-full bg-accent/20 blur-3xl"
            aria-hidden
          />
          <BookOpen
            className="pointer-events-none absolute right-4 top-1/2 h-28 w-28 -translate-y-1/2 text-white/[0.05] md:right-10 md:h-40 md:w-40"
            strokeWidth={1}
            aria-hidden
          />

          <div className="relative z-10 flex min-h-[12rem] flex-col items-center justify-center px-5 py-8 text-center md:min-h-[14rem] md:px-10">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.42em] text-white/80 sm:text-[11px]">
              Thể loại
            </p>
            <h1 className="max-w-3xl text-balance text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_28px_rgba(0,0,0,0.5)] md:text-4xl md:leading-tight">
              {genreHeadingLabel(activeGenre, slug)}
            </h1>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{titleMap[mode]}</h2>
        <Link to="/#the-loai-grid" className="text-sm text-accent hover:underline">
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
