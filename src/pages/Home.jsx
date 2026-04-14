import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { fetchWithTtl, clearTtlCache } from "../lib/ttlCache";
import { HOME_DASHBOARD_CACHE_KEY } from "../lib/cacheKeys";
import { fetchGenresCached, DEFAULT_DATA_TTL_MS } from "../lib/cachedQueries";
import { Link, useLocation } from 'react-router-dom';
import { 
  Flame, 
  Clock, 
  TrendingUp, 
  Eye, 
  ChevronRight,
  ChevronLeft,
  BookOpen, 
  Zap,
  ArrowRight,
  Crown,
  CheckCircle,
  History,
  Heart
} from 'lucide-react';

import NovelCard from '../components/NovelCard';
import Pagination from '../components/Pagination';
import AdSlot from '../components/AdSlot';
import BrandLogo from '../components/BrandLogo';
import { branding } from '../lib/branding';
import { coverImageProps } from '../lib/coverImageProps';
import { formatNumber, formatDate, novelChapterSubtitle, novelLikeCount } from '../utils/helpers';

/**
 * Trang chủ chỉ cần các cột hiển thị / sort — tránh `select *` khi bảng `novels` có thêm cột lớn hoặc JSON.
 * Nếu Supabase báo lỗi cột, mở Table Editor đối chiếu tên cột rồi sửa chuỗi này.
 */
const HOME_NOVEL_LIST_SELECT =
  "id,title,cover_url,view_count,status,created_at,description,likes,follow_count";

function getGenreMeta(genre) {
  return {
    ...genre,
    image: genre.image || genre.cover_url || genre.banner_url || '/default-cover.jpg'
  };
}

/** Soft onigiri-themed backdrop (readable text stays on content above z-index). */
function HomeHeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-[min(92vh,720px)] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.07] via-background/92 to-background dark:from-accent/[0.11]" />
      {/* Optional full cast art: place frontend/public/branding-cast.png */}
      <div
        className="absolute inset-x-0 top-0 h-full max-h-[680px] opacity-[0.1] dark:opacity-[0.12]"
        style={{
          backgroundImage: "url(/branding-cast.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "50% 18%",
          backgroundSize: "min(1100px, 145%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/88 to-background dark:from-background/80 dark:via-background/92" />
      <div
        className="absolute -right-4 top-0 h-[min(65vw,400px)] w-[min(92vw,480px)] opacity-[0.085] dark:opacity-[0.11]"
        style={{
          backgroundImage: `url(${branding.mascot})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right top",
          backgroundSize: "contain",
        }}
      />
      <div
        className="absolute -left-8 top-28 h-72 w-72 opacity-[0.055] dark:opacity-[0.08] blur-[1px]"
        style={{
          backgroundImage: `url(${branding.main})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left center",
          backgroundSize: "contain",
        }}
      />
      <div className="absolute left-[12%] top-40 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/12" />
      <div className="absolute right-[22%] top-[38%] h-52 w-52 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
    </div>
  );
}

/** Items per page for each home tab (grid vs list). */
const HOME_TAB_PAGE_SIZE = { hot: 12, new: 20, full: 12 };

function Home() {
  const location = useLocation();
  const HOME_TABS = ['hot', 'new', 'full'];
  const [featuredNovels, setFeaturedNovels] = useState([]);
  const [hotNovels, setHotNovels] = useState([]);
  const [newUpdates, setNewUpdates] = useState([]);
  const [completedNovels, setCompletedNovels] = useState([]);
  const [rankings, setRankings] = useState({ day: [], week: [], month: [] });
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRankTab, setActiveRankTab] = useState('day');
  const [isSwitchingTab, setIsSwitchingTab] = useState(false);
  const [activeHomeTab, setActiveHomeTab] = useState(() => {
    const saved = localStorage.getItem('mi_home_tab');
    return saved && HOME_TABS.includes(saved) ? saved : 'hot';
  });
  const [homeRefreshGeneration, setHomeRefreshGeneration] = useState(0);
  const [loadError, setLoadError] = useState("");
  /** 1-based page index per tab (Hot / Mới / Full). */
  const [homeTabPage, setHomeTabPage] = useState({ hot: 1, new: 1, full: 1 });
  const tabSwitchTimerRef = useRef(null);
  /** Ignore stale responses when route remounts or a new fetch supersedes the previous one. */
  const homeFetchIdRef = useRef(0);

  useEffect(() => {
    const onInvalidate = () => {
      clearTtlCache(HOME_DASHBOARD_CACHE_KEY);
      setHomeRefreshGeneration((n) => n + 1);
    };
    window.addEventListener("mitruyen:invalidate-home-cache", onInvalidate);
    return () => window.removeEventListener("mitruyen:invalidate-home-cache", onInvalidate);
  }, []);

  useEffect(() => {
    if (!HOME_TABS.includes(activeHomeTab)) {
      setActiveHomeTab('hot');
      return;
    }
    localStorage.setItem('mi_home_tab', activeHomeTab);
  }, [activeHomeTab]);

  useEffect(() => {
    return () => {
      if (tabSwitchTimerRef.current) {
        clearTimeout(tabSwitchTimerRef.current);
        tabSwitchTimerRef.current = null;
      }
    };
  }, []);

  const handleSwitchHomeTab = (tabKey) => {
    if (tabKey === activeHomeTab) return;
    if (tabSwitchTimerRef.current) clearTimeout(tabSwitchTimerRef.current);
    setIsSwitchingTab(true);
    tabSwitchTimerRef.current = setTimeout(() => {
      setActiveHomeTab(tabKey);
      setIsSwitchingTab(false);
      tabSwitchTimerRef.current = null;
    }, 130);
  };

  const fetchData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    const myId = ++homeFetchIdRef.current;
    const FETCH_HOME_TIMEOUT_MS = 25_000;

    try {
      setLoadError("");
      if (!silent) setLoading(true);

      if (!isSupabaseConfigured || !supabase) {
        console.error("[v0] Supabase not configured");
        if (myId !== homeFetchIdRef.current) return;
        setLoadError(
          "Chưa cấu hình Supabase. Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trên hosting (Vercel → Environment Variables), rồi build lại."
        );
        return;
      }

      const bundle = await Promise.race([
        fetchWithTtl(
          HOME_DASHBOARD_CACHE_KEY,
          DEFAULT_DATA_TTL_MS,
          async () => {
            const genresData = await fetchGenresCached(DEFAULT_DATA_TTL_MS);

            /** Giới hạn hai truy vấn song song — không tải toàn bộ bảng novels (trước đây rất chậm khi dữ liệu lớn). */
            const HOME_NOVEL_RECENT = 120;
            const HOME_NOVEL_HOT = 120;

            const [recentRes, hotRes] = await Promise.all([
              supabase
                .from("novels")
                .select(HOME_NOVEL_LIST_SELECT)
                .order("created_at", { ascending: false })
                .limit(HOME_NOVEL_RECENT),
              supabase
                .from("novels")
                .select(HOME_NOVEL_LIST_SELECT)
                .order("view_count", { ascending: false })
                .limit(HOME_NOVEL_HOT),
            ]);

            if (recentRes.error) {
              console.error(recentRes.error);
              throw recentRes.error;
            }
            if (hotRes.error) {
              console.error(hotRes.error);
              throw hotRes.error;
            }

            const merged = new Map();
            for (const n of recentRes.data || []) merged.set(n.id, n);
            for (const n of hotRes.data || []) merged.set(n.id, n);
            const novels = [...merged.values()];

            const novelIds = novels.map((novel) => novel.id);
            const firstChapterMap = {};
            const latestChapterMap = {};

            if (novelIds.length > 0) {
              const { data: statRows, error: statError } = await supabase.rpc(
                "novel_chapter_stats",
                { p_novel_ids: novelIds }
              );

              if (!statError && Array.isArray(statRows)) {
                statRows.forEach((row) => {
                  const nid = row.novel_id;
                  if (row.first_chapter_id != null) firstChapterMap[nid] = row.first_chapter_id;
                  if (row.latest_chapter_number != null) {
                    const cn = Number(row.latest_chapter_number);
                    if (!Number.isNaN(cn)) latestChapterMap[nid] = cn;
                  }
                });
              } else {
                console.warn(
                  "[Home] novel_chapter_stats RPC — chạy `supabase/novel_chapter_stats.sql` để tải nhanh. Fallback:",
                  statError?.message || statError
                );
                const chapterResult = await supabase
                  .from("chapters")
                  .select("id,novel_id,chapter_number")
                  .in("novel_id", novelIds)
                  .order("chapter_number", { ascending: true });
                const chapterRows = chapterResult.data || [];
                chapterRows.forEach((chapter) => {
                  const nid = chapter.novel_id;
                  if (!firstChapterMap[nid]) firstChapterMap[nid] = chapter.id;
                  const cn = Number(chapter.chapter_number);
                  if (nid != null && !Number.isNaN(cn)) {
                    const prev = latestChapterMap[nid];
                    if (prev == null || cn > prev) latestChapterMap[nid] = cn;
                  }
                });
              }
            }

            const novelsWithFirstChapter = novels.map((novel) => ({
              ...novel,
              first_chapter_id: firstChapterMap[novel.id] || null,
              latest_chapter_number: latestChapterMap[novel.id] ?? null,
            }));

            return { novelsWithFirstChapter, genresData };
          }
        ),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("__FETCH_TIMEOUT__")), FETCH_HOME_TIMEOUT_MS);
        }),
      ]);

      if (myId !== homeFetchIdRef.current) return;

      const { novelsWithFirstChapter, genresData } = bundle;

      const byViews = [...novelsWithFirstChapter].sort(
        (a, b) => (Number(b.view_count) || 0) - (Number(a.view_count) || 0)
      );
      setHotNovels(byViews);
      setNewUpdates(novelsWithFirstChapter);
      setGenres((genresData || []).map(getGenreMeta));
      setCompletedNovels(
        novelsWithFirstChapter.filter((novel) => String(novel.status || "").toLowerCase() === "completed")
      );

      setRankings({
        day: novelsWithFirstChapter,
        week: novelsWithFirstChapter,
        month: novelsWithFirstChapter
      });

      setFeaturedNovels(novelsWithFirstChapter.slice(0, 5));
      setHomeTabPage({ hot: 1, new: 1, full: 1 });
    } catch (error) {
      if (myId !== homeFetchIdRef.current) return;
      console.error(error);
      const msg =
        error?.message === "__FETCH_TIMEOUT__"
          ? "Kết nối quá lâu (hết thời gian chờ). Kiểm tra mạng, firewall, hoặc Supabase có đang hoạt động không — rồi bấm Thử lại."
          : error?.message || "Không tải được dữ liệu. Vui lòng thử lại.";
      setLoadError(msg);
    } finally {
      if (myId !== homeFetchIdRef.current) return;
      /* `silent` only skips setLoading(true) at start (no full-page flash on refetch).
         Always clear loading when this request finishes — otherwise a remount with
         silent=true leaves initial loading=true forever. */
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") return;
    let silent = false;
    try {
      silent = sessionStorage.getItem("mi_home_loaded_once") === "1";
      sessionStorage.setItem("mi_home_loaded_once", "1");
    } catch {
      /* ignore */
    }
    fetchData({ silent });
  }, [location.pathname, location.key, homeRefreshGeneration, fetchData]);

  /** bfcache: coming back from another site tab may restore stale in-memory TTL */
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted || location.pathname !== "/") return;
      clearTtlCache(HOME_DASHBOARD_CACHE_KEY);
      fetchData({ silent: true });
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [location.pathname, fetchData]);

  /** Deep-link from /#/the-loai-grid (e.g. “Xem thể loại” on /the-loai) after content mounts. */
  useEffect(() => {
    if (location.pathname !== "/" || location.hash !== "#the-loai-grid") return;
    if (loading) return;
    const el = document.getElementById("the-loai-grid");
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [location.pathname, location.hash, loading]);

  /** Header “Recommendation” → scroll to Truyện hot & bật tab Hot */
  useEffect(() => {
    if (location.pathname !== "/" || location.hash !== "#kham-pha-truyen-hot") return;
    if (loading) return;
    setActiveHomeTab("hot");
    const el = document.getElementById("kham-pha-truyen-hot");
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [location.pathname, location.hash, loading]);

  /** Keep page index within range when list length changes. */
  useEffect(() => {
    setHomeTabPage((prev) => {
      const ht = Math.max(1, Math.ceil(hotNovels.length / HOME_TAB_PAGE_SIZE.hot));
      const nt = Math.max(1, Math.ceil(newUpdates.length / HOME_TAB_PAGE_SIZE.new));
      const ft = Math.max(1, Math.ceil(completedNovels.length / HOME_TAB_PAGE_SIZE.full));
      const next = { ...prev };
      let changed = false;
      if (prev.hot > ht) {
        next.hot = ht;
        changed = true;
      }
      if (prev.new > nt) {
        next.new = nt;
        changed = true;
      }
      if (prev.full > ft) {
        next.full = ft;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [hotNovels.length, newUpdates.length, completedNovels.length]);

  const hotTotalPages = Math.max(1, Math.ceil(hotNovels.length / HOME_TAB_PAGE_SIZE.hot));
  const newTotalPages = Math.max(1, Math.ceil(newUpdates.length / HOME_TAB_PAGE_SIZE.new));
  const fullTotalPages = Math.max(1, Math.ceil(completedNovels.length / HOME_TAB_PAGE_SIZE.full));

  const hotPageClamped = Math.min(Math.max(1, homeTabPage.hot), hotTotalPages);
  const newPageClamped = Math.min(Math.max(1, homeTabPage.new), newTotalPages);
  const fullPageClamped = Math.min(Math.max(1, homeTabPage.full), fullTotalPages);

  const hotPagedSlice = useMemo(
    () =>
      hotNovels.slice(
        (hotPageClamped - 1) * HOME_TAB_PAGE_SIZE.hot,
        hotPageClamped * HOME_TAB_PAGE_SIZE.hot
      ),
    [hotNovels, hotPageClamped]
  );

  const newPagedSlice = useMemo(
    () =>
      newUpdates.slice(
        (newPageClamped - 1) * HOME_TAB_PAGE_SIZE.new,
        newPageClamped * HOME_TAB_PAGE_SIZE.new
      ),
    [newUpdates, newPageClamped]
  );

  const fullPagedSlice = useMemo(
    () =>
      completedNovels.slice(
        (fullPageClamped - 1) * HOME_TAB_PAGE_SIZE.full,
        fullPageClamped * HOME_TAB_PAGE_SIZE.full
      ),
    [completedNovels, fullPageClamped]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <BrandLogo
              variant="main"
              className="h-16 w-16 rounded-2xl ring-1 ring-border shadow-md animate-pulse"
              loading="eager"
            />
            <div className="pointer-events-none absolute -inset-1 rounded-2xl border border-accent/30 animate-ping" />
          </div>
          <p className="text-muted-foreground text-sm">Đang tải truyện...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="max-w-md text-sm text-destructive">{loadError}</p>
        <button
          type="button"
          onClick={() => fetchData({ silent: false })}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <HomeHeroBackdrop />
      <div className="relative z-[1] space-y-8">
      {/* Hero Section with Featured Novels */}
      <HeroSection featuredNovels={featuredNovels} />

      <OnigiriStickerStrip />

      {/* Main Content with Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          <section id="kham-pha-truyen-hot" className="scroll-mt-[5.75rem]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground md:text-xl">
                    Truyện Hot
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Khám phá nhanh — Hot, mới cập nhật hoặc truyện full
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border">
                {[
                  { key: 'hot', label: 'Hot' },
                  { key: 'new', label: 'Mới cập nhật' },
                  { key: 'full', label: 'Truyện Full' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleSwitchHomeTab(tab.key)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      activeHomeTab === tab.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[360px]">
              {isSwitchingTab && (
                <div className="novel-feed-grid animate-pulse">
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={`tab-skeleton-${idx}`} className="min-w-0">
                      <div className="aspect-[3/4] rounded-md bg-secondary ring-1 ring-border/30" />
                      <div className="mt-1 h-2.5 rounded bg-secondary" />
                      <div className="mt-0.5 h-2 w-[80%] rounded bg-secondary" />
                    </div>
                  ))}
                </div>
              )}

              {!isSwitchingTab && activeHomeTab === 'hot' && (
                hotNovels.length > 0 ? (
                  <>
                    <div className="novel-feed-grid">
                      {hotPagedSlice.map((novel, i) => (
                        <NovelCard
                          key={novel.id}
                          novel={novel}
                          showStatus
                          variant="webtoon"
                          coverPriority={i < 4}
                        />
                      ))}
                    </div>
                    <Pagination
                      currentPage={hotPageClamped}
                      totalPages={hotTotalPages}
                      onPageChange={(p) =>
                        setHomeTabPage((prev) => ({ ...prev, hot: p }))
                      }
                      className="mt-4"
                    />
                  </>
                ) : (
                  <EmptyTabNotice />
                )
              )}

              {!isSwitchingTab && activeHomeTab === 'new' && (
                newUpdates.length > 0 ? (
                  <>
                    <div className="section-shell overflow-hidden">
                      <div className="divide-y divide-border">
                        {newPagedSlice.map((novel) => (
                          <UpdateRow key={novel.id} novel={novel} />
                        ))}
                      </div>
                    </div>
                    <Pagination
                      currentPage={newPageClamped}
                      totalPages={newTotalPages}
                      onPageChange={(p) =>
                        setHomeTabPage((prev) => ({ ...prev, new: p }))
                      }
                      className="mt-4"
                    />
                  </>
                ) : (
                  <EmptyTabNotice />
                )
              )}

              {!isSwitchingTab && activeHomeTab === 'full' && (
                completedNovels.length > 0 ? (
                  <>
                    <div className="novel-feed-grid">
                      {fullPagedSlice.map((novel, i) => (
                        <NovelCard
                          key={novel.id}
                          novel={novel}
                          showStatus
                          variant="webtoon"
                          coverPriority={i < 4}
                        />
                      ))}
                    </div>
                    <Pagination
                      currentPage={fullPageClamped}
                      totalPages={fullTotalPages}
                      onPageChange={(p) =>
                        setHomeTabPage((prev) => ({ ...prev, full: p }))
                      }
                      className="mt-4"
                    />
                  </>
                ) : (
                  <EmptyTabNotice text="Chưa có truyện full trong hệ thống." />
                )
              )}
            </div>
          </section>

          <AdSlot placement="home" className="py-1" />

          {/* Scrolling Feed Section */}
          <section>
            <SectionHeader
              icon={<TrendingUp className="w-5 h-5 text-accent" />}
              title="Dòng cập nhật liên tục"
              subtitle="Cuộn danh sách như các trang truyện lớn"
              link="/truyen-moi"
            />
            <div className="section-shell overflow-hidden">
              <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
                {newUpdates.slice(0, 60).map((novel, idx) => (
                  <UpdateRow key={`stream-${novel.id}`} novel={novel} streamIndex={idx} />
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar: sticky — cuộn trang thì khối này bám viewport; chỉ khối danh sách bên trong cuộn khi con trỏ ở trong */}
        <aside className="lg:col-span-1 lg:sticky lg:top-20 lg:z-[2] lg:self-start space-y-6">
          {/* Rankings */}
          <div className="section-shell flex max-h-[min(560px,calc(100vh-5.5rem))] flex-col overflow-hidden">
            <div className="shrink-0 border-b border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[hsl(var(--warning))]" />
                <h3 className="text-sm font-semibold text-foreground">Bảng Xếp Hạng</h3>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-border">
              {[
                { key: 'day', label: 'Ngày' },
                { key: 'week', label: 'Tuần' },
                { key: 'month', label: 'Tháng' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveRankTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    activeRankTab === tab.key
                      ? 'border-b-2 border-accent bg-accent/5 -mb-px text-accent'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ranking List — chỉ vùng này nhận cuộn khi chuột ở trong; overscroll không đẩy scroll trang */}
            <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
              {rankings[activeRankTab]?.slice(0, 10).map((novel, index) => (
                <Link
                  key={novel.id}
                  to={`/truyen/${novel.id}`}
                  className="flex items-center gap-2.5 p-2.5 sm:p-3 hover:bg-secondary/50 transition-colors"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                      index < 3
                        ? index === 0
                          ? 'bg-[hsl(var(--warning))] text-foreground'
                          : index === 1
                            ? 'bg-muted-foreground/30 text-foreground'
                            : 'bg-[#CD7F32] text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <img
                    src={novel.cover_url || '/default-cover.jpg'}
                    alt=""
                    className="h-14 w-10 shrink-0 rounded-md object-cover object-top ring-1 ring-border/60 shadow-sm"
                    {...coverImageProps(index < 3)}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-medium text-foreground line-clamp-2">
                      {novel.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {novel.view_count || 0} lượt xem
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Views Section */}
          <TopViewsSection novels={hotNovels} />
        </aside>
      </div>

      {/* Thể loại — full width, thay cho CTA cũ; anchor #the-loai-grid giữ cho deep-link */}
      <section
        id="the-loai-grid"
        className="rounded-xl border border-accent/25 bg-accent/[0.06] p-4 shadow-sm dark:border-accent/30 dark:bg-accent/10 md:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm">
              Thể loại
            </span>
            <span className="text-xs text-muted-foreground md:text-sm">Khám phá theo sở thích</span>
          </div>
          <Link
            to="/the-loai"
            className="text-xs font-medium text-accent hover:underline md:text-sm"
          >
            Xem tất cả
            <ChevronRight className="ml-0.5 inline-block h-3.5 w-3.5 align-text-bottom" />
          </Link>
        </div>
        <div className="rounded-lg border border-border/80 bg-card/80 p-3 md:p-5 dark:bg-card/50">
          {loading && genres.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Đang tải thể loại…</p>
          ) : genres.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Chưa có thể loại.{' '}
              <Link to="/the-loai" className="font-medium text-accent hover:underline">
                Xem tất cả truyện
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-x-4">
              {genres.map((genre) => (
                <Link
                  key={genre.id}
                  to={`/the-loai/${genre.slug}`}
                  className="group flex items-start gap-2 rounded-lg border border-transparent px-1.5 py-1 text-foreground transition-colors hover:border-accent/30 hover:bg-accent/[0.07] hover:text-accent"
                >
                  <span className="mt-0.5 shrink-0 text-accent opacity-80" aria-hidden>
                    ▸
                  </span>
                  <span className="break-words leading-snug group-hover:underline">{genre.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      </div>
    </div>
  );
}

/** Đề cử carousel: DB dùng snake_case; số chương lấy từ `latest_chapter_number` (bundle Home đã gắn), không dùng `totalChapters` (không tồn tại). */
function heroFeaturedViewCount(novel) {
  const v = novel?.view_count ?? novel?.views ?? novel?.read_count;
  const n = Number(v);
  return formatNumber(Number.isFinite(n) ? n : 0);
}

function heroFeaturedChapterLabel(novel) {
  const raw =
    novel?.latest_chapter_number ??
    novel?.totalChapters ??
    novel?.chapter_count ??
    novel?.total_chapters;
  const n = Number(raw);
  const x = Number.isFinite(n) && n > 0 ? n : 0;
  return `${x.toLocaleString('vi-VN')} chương`;
}

function HeroSection({ featuredNovels }) {
  const slides = featuredNovels.slice(0, 5);
  const slideCount = slides.length;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const swipeStartX = useRef(null);

  useEffect(() => {
    if (slideCount === 0) return;
    setCurrentSlide((i) => (i >= slideCount ? 0 : i));
  }, [slideCount]);

  useEffect(() => {
    if (slideCount === 0) return;
    setShowFullDescription(false);
    let timer;
    const tick = () => {
      setCurrentSlide((prev) => (prev + 1) % slideCount);
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(tick, 5000);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearInterval(timer);
        timer = undefined;
      } else {
        start();
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [slideCount]);

  useEffect(() => {
    setShowFullDescription(false);
  }, [currentSlide]);

  const goNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  const onSwipeStart = useCallback((clientX) => {
    swipeStartX.current = clientX;
  }, []);

  const onSwipeEnd = useCallback(
    (clientX) => {
      if (swipeStartX.current == null || slideCount < 2) {
        swipeStartX.current = null;
        return;
      }
      const dx = clientX - swipeStartX.current;
      swipeStartX.current = null;
      const threshold = 40;
      if (dx > threshold) goPrev();
      else if (dx < -threshold) goNext();
    },
    [slideCount, goNext, goPrev]
  );

  if (featuredNovels.length === 0) {
    return (
      <section className="bg-card border border-border rounded-lg p-8 text-center">
        <BrandLogo
          variant="mascot"
          className="h-24 w-24 rounded-3xl ring-1 ring-border bg-background mx-auto mb-4 shadow-sm"
          loading="eager"
        />
        <h2 className="text-xl font-bold text-foreground mb-2">Chào mừng đến Mi Truyện · mitruyen.me</h2>
        <p className="text-muted-foreground">Khám phá thế giới tiểu thuyết hấp dẫn</p>
      </section>
    );
  }

  const featured = slides[currentSlide];

  return (
    <section className="section-shell relative overflow-hidden">
      <div className="pointer-events-none absolute right-3 top-3 z-10 hidden opacity-75 dark:opacity-90 md:block">
        <BrandLogo
          variant="mascot"
          className="h-11 w-11 rounded-2xl bg-card/85 shadow-sm ring-1 ring-border/70 backdrop-blur-[2px]"
          loading="lazy"
        />
      </div>

      <div
        className="relative"
        style={{ touchAction: "pan-y pinch-zoom" }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          onSwipeStart(e.clientX);
        }}
        onPointerUp={(e) => onSwipeEnd(e.clientX)}
        onPointerCancel={() => {
          swipeStartX.current = null;
        }}
      >
        {slideCount > 1 && (
          <>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-secondary md:left-2"
              aria-label="Trước"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-secondary md:right-2"
              aria-label="Sau"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

      <div className="grid gap-0 md:grid-cols-2">
        {/* Featured Novel Image */}
        <div className="relative aspect-[4/3] md:aspect-auto md:h-[320px]">
        <img
          src={featured?.cover_url || '/default-cover.jpg'}
          alt={featured?.title}
            className="w-full h-full object-contain"
            {...coverImageProps(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card md:block hidden" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent md:hidden" />
          
          {/* Badge */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-2 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded flex items-center gap-1">
              <Flame className="w-3 h-3" />
              HOT
            </span>
            {featured?.status === 'completed' && (
              <span className="px-2 py-1 bg-[hsl(var(--success))] text-white text-xs font-semibold rounded">
                FULL
              </span>
            )}
          </div>
        </div>

        {/* Featured Novel Info */}
        <div className="p-6 flex flex-col justify-center">
          <div className="mb-3">
            <span className="text-xs text-accent font-medium uppercase tracking-wider">Đề cử hôm nay</span>
          </div>
          <Link to={`/truyen/${featured?.id}`}>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 hover:text-accent transition-colors line-clamp-2">
              {featured?.title}
            </h2>
          </Link>
          <p className={`text-sm text-muted-foreground mb-2 ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {featured?.description}
          </p>
          {featured?.description && featured.description.length > 120 && (
            <button
              type="button"
              onClick={() => setShowFullDescription((prev) => !prev)}
              className="text-xs text-accent hover:underline mb-4"
            >
              {showFullDescription ? 'Less' : 'More'}
            </button>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {heroFeaturedViewCount(featured)}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {heroFeaturedChapterLabel(featured)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {formatNumber(novelLikeCount(featured))}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={featured?.first_chapter_id || featured?.chapter_1_id || featured?.firstChapterId
                ? `/chapter/${featured?.first_chapter_id || featured?.chapter_1_id || featured?.firstChapterId}`
                : `/truyen/${featured?.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Đọc ngay
            </Link>
            <Link
              to={`/truyen/${featured?.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
            >
              Chi tiết
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      {slideCount > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 md:left-auto md:right-3 md:translate-x-0">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentSlide(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? "w-6 bg-accent"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Slide ${index + 1}`}
              aria-current={index === currentSlide ? "true" : undefined}
            />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}

function SectionHeader({ icon, title, subtitle, link }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {link && (
        <Link 
          to={link} 
          className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
        >
          Xem tất cả
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyTabNotice({ text = "Đang cập nhật dữ liệu cho mục này." }) {
  return (
    <div className="section-shell p-8 text-center">
      <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function UpdateRow({ novel, streamIndex = 0 }) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors">
      <Link to={`/truyen/${novel.id}`} className="flex-shrink-0">
        <img
          src={novel.cover_url || '/default-cover.jpg'}
          alt={novel.title}
          className="w-10 h-14 object-contain rounded"
          {...coverImageProps(streamIndex < 3)}
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/truyen/${novel.id}`}>
          <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-accent transition-colors">
            {novel.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1">
          {novel.status === 'completed' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded font-medium">
              FULL
            </span>
          )}
          <span className="text-xs text-muted-foreground">{novelChapterSubtitle(novel)}</span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-muted-foreground">{novel.view_count || 0} lượt xem</span>
        <span className="text-[10px] text-muted-foreground block mt-0.5">
          {formatDate(novel.created_at)}
        </span>
      </div>
    </div>
  );
}

function TopViewsSection({ novels }) {
  // Sort novels by view count to show most viewed
  const topViewed = [...novels]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  if (topViewed.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border bg-accent/5">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-foreground text-sm">Lượt Xem Cao Nhất</h3>
        </div>
      </div>
      
      <div className="divide-y divide-border">
        {topViewed.map((novel, index) => (
          <Link
            key={novel.id}
            to={`/truyen/${novel.id}`}
            className="flex gap-3 p-3 hover:bg-secondary/30 transition-colors group"
          >
            <img
              src={novel.cover_url || '/default-cover.jpg'}
              alt={novel.title}
              className="w-12 h-16 object-contain rounded flex-shrink-0"
              {...coverImageProps(index < 2)}
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                {novel.title}
              </h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {formatNumber(novel.view_count || 0)}
                </span>
              </div>
              {novel.status === 'completed' && (
                <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded font-medium">
                  FULL
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      
      <Link
        to="/hot"
        className="flex items-center justify-center gap-1 p-2.5 text-xs text-accent hover:bg-accent/5 transition-colors border-t border-border"
      >
        Xem tất cả
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function OnigiriStickerStrip() {
  return (
    <div
      className="flex flex-wrap justify-center gap-2 sm:gap-2.5 px-2 py-2 -mt-2 mb-2"
      aria-hidden
    >
      {branding.stickers.map((_, i) => (
        <BrandLogo
          key={`onigiri-sticker-${i}`}
          variant="sticker"
          stickerIndex={i}
          alt=""
          className="h-[2.6rem] w-[2.6rem] sm:h-[2.925rem] sm:w-[2.925rem] rounded-xl ring-1 ring-border/70 bg-card shadow-sm opacity-85 hover:opacity-100 transition-opacity"
          loading="lazy"
        />
      ))}
    </div>
  );
}

export default Home;
