import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, ArrowUp } from "lucide-react";
import NovelCard from "../components/NovelCard";
import Pagination from "../components/Pagination";
import ReaderErrorState from "../components/ReaderErrorState";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { fetchGenresCached } from "../lib/cachedQueries";
import { enrichNovelsWithLatestChapter } from "../lib/enrichNovelsLatestChapter";
import { listCoverUrl } from "../lib/coverImageUrl";

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
    image: listCoverUrl(genre.image || genre.cover_url || genre.banner_url || "")
  };
}

/** DB may still store legacy `/default-cover.jpg`; treat as placeholder like `.webp`. */
function isGenreDefaultCover(url) {
  const u = String(url || "").trim();
  return u === "" || u === "/default-cover.webp" || u === "/default-cover.jpg";
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const NOVEL_STATS_CHUNK = 200;

/**
 * Max chapter number per novel — same RPC as Home (`supabase/novel_chapter_stats.sql`).
 * Avoids loading every row from `chapters` (was catastrophic at scale).
 */
async function fetchLatestChapterNumberMap(supabase, novelIds) {
  const counts = {};
  const ids = [...new Set((novelIds || []).filter((id) => id != null))];
  for (let i = 0; i < ids.length; i += NOVEL_STATS_CHUNK) {
    const slice = ids.slice(i, i + NOVEL_STATS_CHUNK);
    const { data: statRows, error } = await supabase.rpc("novel_chapter_stats", {
      p_novel_ids: slice,
    });
    if (error) throw error;
    (statRows || []).forEach((row) => {
      const nid = row.novel_id;
      const cn = row.latest_chapter_number;
      if (nid == null || cn == null) return;
      const n = Number(cn);
      if (!Number.isNaN(n)) counts[nid] = n;
    });
  }
  return counts;
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
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");
  const [showBackTop, setShowBackTop] = useState(false);
  const [chapterRangePool, setChapterRangePool] = useState([]);
  const [chapterCounts, setChapterCounts] = useState({});
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
        return;
      }
      const from = pageIndex * PAGE_SIZE;
      const sliceIds = categorySortedIds.slice(from, from + PAGE_SIZE);
      if (sliceIds.length === 0) {
        setNovels((prev) => (replace ? [] : prev));
        setPage(pageIndex);
        setLoading(false);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("novels")
        .select("*")
        .in("id", sliceIds);
      if (fetchError) {
        setError(fetchError.message || "Failed to load novels.");
        setLoading(false);
        return;
      }
      const rows = data || [];
      const ordered = sliceIds.map((id) => rows.find((n) => n.id === id)).filter(Boolean);
      const enriched = await enrichNovelsWithLatestChapter(supabase, ordered);
      setNovels((prev) => (replace ? enriched : [...prev, ...enriched]));
      setPage(pageIndex);
      setLoading(false);
      return;
    }

    if (mode === "chapterRange") {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      const chunk = chapterRangePool.slice(from, to).map((n) => ({
        ...n,
        latest_chapter_number: chapterCounts[n.id] ?? n.latest_chapter_number ?? null,
      }));
      setNovels((prev) => (replace ? chunk : [...prev, ...chunk]));
      setPage(pageIndex);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured.");
      setNovels([]);
      setLoading(false);
      return;
    }

    if (mode === "category" && slug && !activeGenre) {
      if (genres.length === 0) return;
      setLoading(false);
      setNovels([]);
      return;
    }

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error: fetchError } = await buildQuery(from, to);
    if (fetchError) {
      setError(fetchError.message || "Failed to load novels.");
      setLoading(false);
      return;
    }

    const newRows = data || [];
    const enriched = await enrichNovelsWithLatestChapter(supabase, newRows);
    setNovels((prev) => (replace ? enriched : [...prev, ...enriched]));
    setPage(pageIndex);
    setLoading(false);
  }, [buildQuery, mode, slug, activeGenre, chapterRangePool, categorySortedIds, genres.length, chapterCounts]);

  useEffect(() => {
    if (mode !== "category") {
      setCategorySortedIds(null);
      return;
    }
    if (mode === "category" && slug && genres.length === 0) return;
    if (!activeGenre?.id || !isSupabaseConfigured || !supabase) {
      setCategorySortedIds([]);
      setNovels([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setCategorySortedIds(null);
      setLoading(true);
      setError("");
      setNovels([]);
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
    setPage(0);
    setNovels([]);
    if (mode !== "chapterRange") {
      fetchPage(0, true);
    }
  }, [mode, slug, range, genres.length, fetchPage]);

  useEffect(() => {
    if (mode !== "category") return;
    if (!activeGenre?.id) return;
    if (categorySortedIds == null) return;
    setPage(0);
    fetchPage(0, true);
  }, [mode, activeGenre?.id, categorySortedIds, fetchPage]);

  useEffect(() => {
    const fetchChapterRangePool = async () => {
      if (mode !== "chapterRange") return;
      if (!isSupabaseConfigured || !supabase) return;
      setLoading(true);
      setError("");
      const { data: allNovels, error: novelsError } = await supabase
        .from("novels")
        .select("*")
        .order("created_at", { ascending: false });
      if (novelsError) {
        setError(novelsError.message || "Failed to load novels.");
        setLoading(false);
        return;
      }

      const list = allNovels || [];
      const novelIds = list.map((n) => n.id).filter((id) => id != null);

      let counts = {};
      try {
        counts = await fetchLatestChapterNumberMap(supabase, novelIds);
      } catch (e) {
        console.error("[BrowseNovels chapterRange] novel_chapter_stats:", e);
        setError(
          e?.message ||
            "Không tải được thống kê chương. Chạy SQL `novel_chapter_stats` trong Supabase (xem supabase/novel_chapter_stats.sql)."
        );
        setChapterCounts({});
        setChapterRangePool([]);
        setNovels([]);
        setLoading(false);
        return;
      }

      setChapterCounts(counts);

      const filtered = list.filter((novel) => matchChapterRange(counts[novel.id] ?? 0));
      setChapterRangePool(filtered);
      const firstChunk = filtered.slice(0, PAGE_SIZE);
      setNovels(firstChunk);
      setPage(0);
      setLoading(false);
    };

    fetchChapterRangePool();
  }, [mode, range, matchChapterRange]);

  useEffect(() => {
    if (mode === "category" || mode === "chapterRange") return;
    if (!isSupabaseConfigured || !supabase) {
      setTotalCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      let q = supabase.from("novels").select("*", { count: "exact", head: true });
      if (mode === "completed") q = q.eq("status", "completed");
      if (mode === "ongoing") q = q.eq("status", "ongoing");
      const { count, error } = await q;
      if (cancelled) return;
      if (error) setTotalCount(0);
      else setTotalCount(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, slug, range]);

  useEffect(() => {
    if (mode !== "category") return;
    if (categorySortedIds == null) {
      setTotalCount(0);
      return;
    }
    setTotalCount(categorySortedIds.length);
  }, [mode, categorySortedIds]);

  useEffect(() => {
    if (mode !== "chapterRange") return;
    setTotalCount(chapterRangePool.length);
  }, [mode, chapterRangePool]);

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const next = window.scrollY > 480;
        setShowBackTop((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(Math.max(0, totalCount) / PAGE_SIZE)),
    [totalCount]
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      setLoading(true);
      fetchPage(nextPage - 1, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [fetchPage]
  );

  const titleMap = {
    all: "Tất cả truyện",
    hot: "Truyện Hot",
    recent: "Mới cập nhật",
    completed: "Truyện Full",
    ongoing: "Truyện đang tiến hành",
    chapterRange: `Số chương: ${
      range === "duoi-100"
        ? "Dưới 100"
        : range === "100-500"
          ? "100 – 500"
          : range === "500-1000"
            ? "500 – 1000"
            : range === "tren-1000"
              ? "Trên 1000"
              : "Tất cả"
    }`,
    category: `Thể loại: ${genreHeadingLabel(activeGenre, slug) || slug || ""}`
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
          {!(activeGenre?.image && !isGenreDefaultCover(activeGenre.image)) && (
            <div
              className={`absolute inset-0 bg-gradient-to-br opacity-[0.42] mix-blend-soft-light ${getGenreTheme(activeGenre?.slug || slug)}`}
              aria-hidden
            />
          )}
          {activeGenre?.image && !isGenreDefaultCover(activeGenre.image) ? (
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
        <div className="novel-feed-grid">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="min-w-0 animate-pulse">
              <div className="aspect-[3/4] rounded-md bg-secondary ring-1 ring-border/30" />
              <div className="mt-1 h-2.5 rounded bg-secondary" />
              <div className="mt-0.5 h-2 w-[80%] rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5">
          <ReaderErrorState
            compact
            title="Ôi không, tải danh sách thất bại."
            message={error || "Loading failed. Vui lòng thử lại."}
            onRetry={() => {
              setError("");
              setLoading(true);
              fetchPage(0, true);
            }}
          />
        </div>
      ) : novels.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Chưa có truyện phù hợp.</p>
        </div>
      ) : (
        <>
          <div className="novel-feed-grid">
            {novels.map((novel, i) => (
              <div key={novel.id} className="relative min-w-0">
                <NovelCard
                  novel={novel}
                  showStatus
                  variant="webtoon"
                  coverPriority={i < 9}
                />
                {mode === "chapterRange" && (
                  <span className="absolute right-1 top-7 z-[1] rounded bg-foreground/85 px-1 py-0.5 text-[8px] font-medium text-background">
                    {chapterCounts[novel.id] || 0} chương
                  </span>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col items-center gap-2 border-t border-border pt-5">
              <Pagination
                currentPage={page + 1}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
              <p className="text-[11px] text-muted-foreground">
                Trang {page + 1} / {totalPages}
                {totalCount > 0 ? ` · ${totalCount} truyện` : ""}
              </p>
            </div>
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
