import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Menu,
  X,
  BookOpen,
  Moon,
  Sun,
  Flame,
  Clock,
  Bell,
  CheckCircle,
  History,
  Heart,
  Users,
  ChevronDown,
  List,
  ChevronRight,
  Home,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchAllGenresRows, fetchGenresCached, primeGenresCache } from '../lib/cachedQueries';
import {
  fetchNovelsByIdsCached,
  fetchNovelsTitleSearchRowsCached,
  fetchHotNovelCardsCached,
} from '../lib/cachedNovelQueries';
import BrandLogo from './BrandLogo';
import { novelChapterSubtitle } from '../utils/helpers';
import { enrichNovelsWithLatestChapter } from '../lib/enrichNovelsLatestChapter';
import { coverImageProps } from '../lib/coverImageProps';
import { thumbCoverUrl } from '../lib/coverImageUrl';
import {
  LS_BOOKMARKS,
  LS_FAVORITES,
  LS_FOLLOWS,
  LS_READING_HISTORY,
  readNumericIdArray,
  readReadingHistory,
} from '../lib/memberStorage';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hotSuggestions, setHotSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [mobileGenresOpen, setMobileGenresOpen] = useState(true);
  const [genres, setGenres] = useState([]);
  const [genresRefreshing, setGenresRefreshing] = useState(false);
  /** Pause infinite marquee when tab in background — saves GPU/battery on mobile. */
  const [announcementAnimActive, setAnnouncementAnimActive] = useState(true);
  const searchBoxRef = useRef(null);
  const memberMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const drawerSwipeStart = useRef({ x: 0, y: 0 });
  const forceHomeTopRef = useRef(false);

  const handleDrawerTouchStart = (e) => {
    const t = e.touches[0];
    drawerSwipeStart.current = { x: t.clientX, y: t.clientY };
  };

  /** Swipe left on drawer or backdrop to close (mobile). */
  const handleDrawerTouchEnd = (e) => {
    if (!isMenuOpen) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - drawerSwipeStart.current.x;
    const dy = t.clientY - drawerSwipeStart.current.y;
    const minX = 68;
    const maxY = 120;
    if (dx < -minX && Math.abs(dy) < maxY && Math.abs(dx) > Math.abs(dy) + 6) {
      setIsMenuOpen(false);
    }
  };
  const { user, isAuthenticated, logout } = useAuth();
  const notificationSeenKey = useMemo(() => {
    if (!user?.id) return null;
    return `mi_notifications_last_seen__uid_${user.id}`;
  }, [user?.id]);

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === 'all') return notificationItems;
    return notificationItems.filter((item) => item.type === notificationFilter);
  }, [notificationItems, notificationFilter]);

  const notificationTypeCount = useMemo(() => {
    const update = notificationItems.filter((i) => i.type === 'update').length;
    const resume = notificationItems.filter((i) => i.type === 'resume').length;
    return {
      all: notificationItems.length,
      update,
      resume,
    };
  }, [notificationItems]);

  const loadNotifications = useMemo(
    () => async () => {
      if (!isAuthenticated || !supabase || !isSupabaseConfigured) {
        setNotificationItems([]);
        setNotificationUnread(0);
        return;
      }
      setNotificationLoading(true);
      try {
        const followIds = readNumericIdArray(LS_FOLLOWS);
        const favoriteIds = readNumericIdArray(LS_FAVORITES);
        const bookmarkIds = readNumericIdArray(LS_BOOKMARKS);
        const readingHistory = readReadingHistory();
        const sourceNovelIds = [...new Set([...followIds, ...favoriteIds, ...bookmarkIds])].slice(0, 24);

        let novelRows = [];
        if (sourceNovelIds.length > 0) {
          novelRows = await fetchNovelsByIdsCached(
            supabase,
            sourceNovelIds,
            'id,title,cover_url'
          );
        }
        const novelMap = new Map((novelRows || []).map((n) => [Number(n.id), n]));

        const lastReadByNovel = new Map();
        (readingHistory || []).forEach((item) => {
          const novelId = Number(item?.novelId);
          const chapterNumber = Number(item?.chapterNumber);
          if (!Number.isFinite(novelId) || !Number.isFinite(chapterNumber)) return;
          const prev = lastReadByNovel.get(novelId);
          if (!prev || chapterNumber > prev.chapterNumber) {
            lastReadByNovel.set(novelId, {
              chapterNumber,
              chapterId: item?.chapterId,
              readAt: item?.readAt,
            });
          }
        });

        const notif = [];
        if (sourceNovelIds.length > 0) {
          const { data: chapterRows } = await supabase
            .from('chapters')
            .select('id,novel_id,chapter_number,title,created_at')
            .in('novel_id', sourceNovelIds)
            .order('created_at', { ascending: false })
            .limit(180);
          const latestChapterMap = new Map();
          (chapterRows || []).forEach((row) => {
            const novelId = Number(row.novel_id);
            if (!Number.isFinite(novelId) || latestChapterMap.has(novelId)) return;
            latestChapterMap.set(novelId, row);
          });

          latestChapterMap.forEach((latest, novelId) => {
            const novel = novelMap.get(novelId);
            if (!novel) return;
            const lastRead = lastReadByNovel.get(novelId);
            const latestChapterNo = Number(latest.chapter_number) || 0;
            const seenChapterNo = Number(lastRead?.chapterNumber) || 0;
            if (!lastRead || latestChapterNo > seenChapterNo) {
              notif.push({
                id: `upd-${novelId}-${latest.id}`,
                type: 'update',
                ts: latest.created_at || new Date().toISOString(),
                title: 'Có chương mới',
                text: `${novel.title} vừa cập nhật chương ${latest.chapter_number}.`,
                to: `/chapter/${latest.id}`,
                cover: thumbCoverUrl(novel.cover_url),
              });
            }
          });
        }

        const recentByNovel = [];
        const seenNovel = new Set();
        (readingHistory || []).forEach((item) => {
          const novelId = Number(item?.novelId);
          if (!Number.isFinite(novelId) || seenNovel.has(novelId)) return;
          seenNovel.add(novelId);
          recentByNovel.push(item);
        });
        recentByNovel.slice(0, 3).forEach((item) => {
          notif.push({
            id: `resume-${item.novelId}-${item.chapterId}`,
            type: 'resume',
            ts: item.readAt || new Date().toISOString(),
            title: 'Tiếp tục đọc',
            text: `${item.title} - quay lại chương ${item.chapterNumber}.`,
            to: `/chapter/${item.chapterId}`,
            cover: thumbCoverUrl(item.coverUrl),
          });
        });

        const sorted = notif
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
          .slice(0, 12);
        setNotificationItems(sorted);

        const lastSeenTs = notificationSeenKey ? Number(localStorage.getItem(notificationSeenKey) || 0) : 0;
        const unread = sorted.filter((n) => new Date(n.ts).getTime() > lastSeenTs).length;
        setNotificationUnread(unread);
      } catch {
        setNotificationItems([]);
        setNotificationUnread(0);
      } finally {
        setNotificationLoading(false);
      }
    },
    [isAuthenticated, notificationSeenKey]
  );

  const location = useLocation();
  const navigate = useNavigate();
  const isHotRecommend =
    location.pathname === '/hot' ||
    (location.pathname === '/' && location.hash === '#kham-pha-truyen-hot');

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const next = window.scrollY > 10;
        setIsScrolled((prev) => (prev === next ? prev : next));
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const sync = () =>
      setAnnouncementAnimActive(
        document.visibilityState === 'visible' &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    sync();
    document.addEventListener('visibilitychange', sync);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener?.('change', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      mq.removeEventListener?.('change', sync);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const onEscape = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setShowSearch(false);
    setShowSearchDropdown(false);
    setMemberMenuOpen(false);
    setNotificationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (memberMenuRef.current && !memberMenuRef.current.contains(event.target)) {
        setMemberMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, location.pathname]);

  useEffect(() => {
    if (!notificationOpen || !notificationSeenKey) return;
    const now = Date.now();
    localStorage.setItem(notificationSeenKey, String(now));
    setNotificationUnread(0);
  }, [notificationOpen, notificationSeenKey]);

  const markAllNotificationsRead = () => {
    if (!notificationSeenKey) return;
    const newestTs = notificationItems.reduce((maxTs, item) => {
      const t = new Date(item.ts).getTime();
      return Number.isFinite(t) && t > maxTs ? t : maxTs;
    }, Date.now());
    localStorage.setItem(notificationSeenKey, String(newestTs));
    setNotificationUnread(0);
  };

  useEffect(() => {
    const fetchGenres = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      const data = await fetchGenresCached();
      setGenres(data || []);
    };
    fetchGenres();
  }, []);

  /** Refresh list when opening the drawer so new rows in `genres` appear without waiting on TTL. */
  useEffect(() => {
    if (!isMenuOpen || !isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    setGenresRefreshing(true);
    (async () => {
      const data = await fetchAllGenresRows('*');
      if (cancelled) return;
      setGenres(data || []);
      primeGenresCache(data || []);
    })().finally(() => {
      setGenresRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isMenuOpen]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const keyword = searchQuery.trim();
    if (!keyword || !isSupabaseConfigured || !supabase) return;
    const topHit = searchResults[0];
    if (topHit?.id) {
      navigate(`/truyen/${topHit.id}`);
      return;
    }
    const rows = await fetchNovelsTitleSearchRowsCached(supabase, keyword);
    const id = rows[0]?.id;
    if (id) navigate(`/truyen/${id}`);
  };

  const forceScrollTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  /** Mark logo = home: always go to home top, never keep hash position. */
  const handleHomeMarkClick = (e) => {
    e.preventDefault();
    forceHomeTopRef.current = true;
    navigate({ pathname: '/', search: '', hash: '' });
    requestAnimationFrame(() => {
      requestAnimationFrame(forceScrollTop);
    });
  };

  useEffect(() => {
    if (!forceHomeTopRef.current) return;
    if (location.pathname !== '/' || location.hash || location.search) return;
    forceScrollTop();
    forceHomeTopRef.current = false;
  }, [location.pathname, location.hash, location.search]);

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword || !isSupabaseConfigured || !supabase) {
      setSearchResults([]);
      setHotSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const rows = await fetchNovelsTitleSearchRowsCached(supabase, keyword);
        const enriched = await enrichNovelsWithLatestChapter(supabase, rows);
        setSearchResults(enriched);
        if (enriched.length === 0) {
          const hotData = await fetchHotNovelCardsCached(supabase, 6);
          setHotSuggestions(await enrichNovelsWithLatestChapter(supabase, hotData || []));
        } else {
          setHotSuggestions([]);
        }
      } catch {
        setSearchResults([]);
        setHotSuggestions([]);
      }
      setSearchLoading(false);
      setShowSearchDropdown(true);
    }, 220);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const navLinks = [
    { to: '/', label: 'Trang chủ', icon: BookOpen },
    { to: '/hot', label: 'Hot', icon: Flame },
    { to: '/truyen-moi', label: 'Mới cập nhật', icon: Clock },
    { to: '/truyen-full', label: 'Truyện Full', icon: CheckCircle },
  ];

  const chapterRangeLinks = [
    { to: '/so-chuong/ngan-50', label: 'Truyện ngắn (≤ 50 chương)' },
    { to: '/so-chuong/dai-50', label: 'Truyện dài (> 50 chương)' },
    { to: '/so-chuong/duoi-100', label: 'Dưới 100 chương' },
    { to: '/so-chuong/100-500', label: 'Từ 100 đến 500 chương' },
    { to: '/so-chuong/500-1000', label: 'Từ 500 đến 1000 chương' },
    { to: '/so-chuong/tren-1000', label: 'Trên 1000 chương' }
  ];
  const toSlug = (value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  /** Chỉ dùng bảng `genres` trên Supabase — không gộp danh sách tĩnh để tránh lệch với DB. */
  const navGenres = useMemo(() => {
    return (genres || [])
      .map((g) => ({
        id: g.id,
        name: g.name,
        slug: (g.slug || toSlug(g.name) || "").trim(),
      }))
      .filter((g) => g.slug)
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [genres]);

  return (
    <>
      {/* Announcement Bar */}
      <div className="site-announcement-bar bg-gradient-to-r from-accent via-[#e11d48] to-[#f43f7d] text-white py-2 text-center overflow-hidden shadow-sm">
        <div
          className="animate-marquee whitespace-nowrap inline-block font-semibold tracking-wide text-[13px] sm:text-sm"
          style={{
            animationPlayState: announcementAnimActive ? 'running' : 'paused',
          }}
        >
          <span className="mx-10">Chào mừng đến Mi Truyện (mitruyen.me) — nền tảng đọc truyện trực tuyến</span>
          <span className="mx-10">Cập nhật liên tục nhiều tác phẩm mới mỗi ngày</span>
          <span className="mx-10">Đăng ký để lưu truyện yêu thích và đồng bộ lịch sử đọc</span>
          <span className="mx-10">Chào mừng đến Mi Truyện (mitruyen.me) — nền tảng đọc truyện trực tuyến</span>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-background/95 backdrop-blur-lg border-b border-border shadow-sm' 
            : 'bg-background border-b border-border'
        }`}
      >
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 sm:h-16 gap-2 min-w-0">
            {/* Left: hamburger + mark */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors shrink-0"
                aria-label="Mở menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link
                to="/"
                onClick={handleHomeMarkClick}
                className="group inline-flex shrink-0 cursor-pointer items-stretch overflow-hidden rounded-xl ring-1 ring-border shadow-md ring-offset-2 ring-offset-background transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Về trang chủ — Mi Truyện"
                aria-label="Về trang chủ"
              >
                <BrandLogo
                  variant="mark"
                  className="h-9 w-9 shrink-0 rounded-none"
                  loading="eager"
                />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border-l border-border/60 bg-secondary/70 text-accent transition-colors group-hover:bg-accent/12 group-hover:text-accent">
                  <Home className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.35} aria-hidden />
                </span>
                <span className="sr-only">Về trang chủ — Mi Truyện</span>
              </Link>
            </div>

            {/* Center: cast art + MI TRUYỆN (public/branding-cast.webp) — whole strip = home */}
            <div className="flex min-w-0 flex-1 items-center px-1 sm:px-2">
              <Link
                to="/"
                onClick={handleHomeMarkClick}
                className="group relative block h-9 w-full max-w-[min(58vw,320px)] overflow-hidden rounded-xl bg-secondary/40 shadow-sm ring-1 ring-border/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-11 sm:max-w-[min(44vw,340px)]"
                title="Mi Truyện — mitruyen.me"
                aria-label="Mi Truyện — về trang chủ"
              >
                <img
                  src="/branding-cast.webp"
                  alt=""
                  className="h-full w-full object-cover object-[center_20%] transition duration-500 group-hover:scale-[1.03] sm:object-[center_22%]"
                  loading="eager"
                  decoding="async"
                />
                <span
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/55 sm:to-black/50"
                  aria-hidden
                />
                <span className="pointer-events-none absolute inset-y-0 right-0 flex w-[min(52%,148px)] flex-col items-end justify-center gap-0.5 pr-2 sm:pr-3">
                  <span className="text-[7px] font-semibold uppercase tracking-[0.28em] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[8px]">
                    mitruyen.me
                  </span>
                  <span className="text-right font-black leading-none tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                    <span className="block text-[10px] opacity-95 sm:text-[11px]">MI</span>
                    <span className="block text-[15px] sm:text-[17px]">TRUYỆN</span>
                  </span>
                </span>
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="relative flex items-center gap-1 sm:gap-2 shrink-0" ref={memberMenuRef}>
              {/* Search Bar - Desktop */}
              <form onSubmit={handleSearch} className="hidden md:flex">
                <div className="relative" ref={searchBoxRef}>
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm truyện..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery.trim()) setShowSearchDropdown(true);
                    }}
                    className="w-56 lg:w-64 pl-8 pr-3 py-1.5 bg-secondary/80 text-foreground placeholder:text-muted-foreground border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:bg-background transition-all"
                  />
                  {showSearchDropdown && (
                    <div className="absolute top-full mt-2 w-full min-w-[340px] max-h-[420px] overflow-y-auto dropdown-surface p-2 z-50">
                      {searchLoading ? (
                        <p className="text-xs text-muted-foreground p-2">Đang tìm...</p>
                      ) : searchResults.length === 0 ? (
                        hotSuggestions.length > 0 ? (
                          <div>
                            <p className="text-[11px] text-muted-foreground px-2 py-1">Không tìm thấy. Gợi ý truyện hot:</p>
                            <div className="space-y-1">
                              {hotSuggestions.map((item, hi) => (
                                <Link
                                  key={`search-hot-${item.id}`}
                                  to={`/truyen/${item.id}`}
                                  onClick={() => setShowSearchDropdown(false)}
                                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
                                >
                                  <img
                                    src={thumbCoverUrl(item.cover_url)}
                                    alt={item.title}
                                    className="w-9 h-12 rounded object-cover flex-shrink-0"
                                    {...coverImageProps(hi < 6)}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {novelChapterSubtitle(item)}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground p-2">Không có kết quả phù hợp.</p>
                        )
                      ) : (
                        <div className="space-y-1">
                          {searchResults.map((item, ri) => (
                            <Link
                              key={`search-${item.id}`}
                              to={`/truyen/${item.id}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
                            >
                              <img
                                src={thumbCoverUrl(item.cover_url)}
                                alt={item.title}
                                className="w-9 h-12 rounded object-cover flex-shrink-0"
                                {...coverImageProps(ri < 6)}
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {novelChapterSubtitle(item)}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="md:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                aria-label="Toggle search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {isAuthenticated ? (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen((v) => !v);
                      setMemberMenuOpen(false);
                    }}
                    className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    aria-label="Thông báo"
                    title="Thông báo"
                  >
                    <Bell className="w-5 h-5" />
                    {notificationUnread > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-foreground">
                        {notificationUnread > 9 ? '9+' : notificationUnread}
                      </span>
                    ) : null}
                  </button>
                  {notificationOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[82] w-[min(92vw,22rem)] rounded-xl border border-border bg-card p-2 shadow-xl">
                      <div className="mb-1 flex items-center justify-between px-2 py-1">
                        <p className="text-sm font-semibold text-foreground">Thông báo</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Đánh dấu đã đọc
                          </button>
                          <button
                            type="button"
                            onClick={loadNotifications}
                            className="text-xs text-accent hover:underline"
                          >
                            Làm mới
                          </button>
                        </div>
                      </div>
                      <div className="mb-2 flex gap-1 px-2">
                        <button
                          type="button"
                          onClick={() => setNotificationFilter('all')}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            notificationFilter === 'all'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Tất cả ({notificationTypeCount.all})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationFilter('update')}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            notificationFilter === 'update'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Cập nhật ({notificationTypeCount.update})
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotificationFilter('resume')}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            notificationFilter === 'resume'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Tiếp tục ({notificationTypeCount.resume})
                        </button>
                      </div>
                      {notificationLoading ? (
                        <p className="px-2 py-3 text-xs text-muted-foreground">Đang tải thông báo...</p>
                      ) : filteredNotifications.length === 0 ? (
                        <p className="px-2 py-3 text-xs text-muted-foreground">
                          Chưa có thông báo trong mục này.
                        </p>
                      ) : (
                        <div className="max-h-[22rem] space-y-1 overflow-y-auto">
                          {filteredNotifications.map((item) => (
                            <Link
                              key={item.id}
                              to={item.to}
                              onClick={() => setNotificationOpen(false)}
                              className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary"
                            >
                              <img
                                src={item.cover}
                                alt=""
                                className="h-10 w-8 shrink-0 rounded object-cover"
                                {...coverImageProps(false)}
                              />
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-xs font-semibold text-foreground">{item.title}</p>
                                <p className="line-clamp-2 text-[11px] text-muted-foreground">{item.text}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Bookmarks + history */}
              <Link
                to="/danh-dau"
                className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                aria-label="Truyện đánh dấu"
                title="Truyện đánh dấu"
              >
                <Bookmark className="w-5 h-5" />
              </Link>
              <Link
                to="/lich-su"
                className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                aria-label="Lịch sử đọc"
                title="Lịch sử đọc"
              >
                <History className="w-5 h-5" />
              </Link>

              {/* Auth — compact on mobile (MonkeyD-style) */}
              <div className="flex md:hidden items-center gap-1">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setMemberMenuOpen((v) => !v)}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    aria-label="Hồ sơ"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden ring-1 ring-border/70">
                      <BrandLogo variant="mark" alt="" className="h-full w-full bg-transparent" imgClassName="object-cover" />
                    </div>
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="px-2 py-1 text-[11px] sm:text-xs font-semibold text-foreground border border-border rounded-lg hover:bg-secondary transition-colors whitespace-nowrap"
                    >
                      Đăng nhập
                    </Link>
                    <Link
                      to="/register"
                      className="px-2 py-1 text-[11px] sm:text-xs font-semibold bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors whitespace-nowrap shadow-sm"
                    >
                      Đăng ký
                    </Link>
                  </>
                )}
              </div>

              {/* Auth Buttons - Desktop */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMemberMenuOpen((v) => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden ring-1 ring-border/70">
                        <BrandLogo variant="mark" alt="" className="h-full w-full bg-transparent" imgClassName="object-cover" />
                      </div>
                      <span className="font-medium max-w-[80px] truncate">{user?.username}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${memberMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      onClick={logout}
                      className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Đăng nhập
                    </Link>
                    <Link 
                      to="/register"
                      className="px-3 py-1.5 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg text-sm font-medium transition-colors"
                    >
                      Đăng ký
                    </Link>
                  </>
                )}
              </div>

              {isAuthenticated && memberMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[80] w-60 rounded-xl border border-border bg-card p-2 shadow-xl">
                  <Link
                    to="/profile"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <User className="h-4 w-4 text-accent" />
                    Trung tâm thành viên
                  </Link>
                  <Link
                    to="/dang-truyen"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    Đăng truyện mới
                  </Link>
                  <Link
                    to="/quan-ly-bai-gui"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <List className="h-4 w-4 text-sky-600" />
                    Quản lý bài gửi
                  </Link>
                  <Link
                    to="/dang-chuong"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <BookOpen className="h-4 w-4 text-violet-600" />
                    Đăng chương mới
                  </Link>
                  <Link
                    to="/quan-ly-chuong-gui"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <List className="h-4 w-4 text-indigo-600" />
                    Duyệt chương gửi
                  </Link>
                  <Link
                    to="/profile#liked-novels"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <Heart className="h-4 w-4 text-rose-500" />
                    Truyện đã thích
                  </Link>
                  <Link
                    to="/profile#following-novels"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <Users className="h-4 w-4 text-sky-600" />
                    Truyện theo dõi
                  </Link>
                  <Link
                    to="/danh-dau"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <Bookmark className="h-4 w-4 text-amber-600" />
                    Truyện đánh dấu
                  </Link>
                  <Link
                    to="/lich-su"
                    onClick={() => setMemberMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary"
                  >
                    <History className="h-4 w-4 text-emerald-600" />
                    Lịch sử đọc
                  </Link>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setMemberMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}

            </div>
          </div>

          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 bg-gradient-to-r from-accent/[0.07] via-secondary/35 to-accent/[0.06] py-1.5 sm:py-2"
            aria-label="Gợi ý truyện hot"
          >
            <Link
              to="/#kham-pha-truyen-hot"
              className={`inline-flex items-center gap-2 rounded-lg px-1 py-0.5 text-[13px] font-semibold tracking-wide transition-colors sm:text-sm ${
                isHotRecommend
                  ? 'text-accent'
                  : 'text-foreground/90 hover:text-accent'
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${
                  isHotRecommend
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'bg-accent/15 text-accent ring-1 ring-accent/25'
                }`}
              >
                <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
              </span>
              <span>Recommendation</span>
              <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                — Truyện hot
              </span>
            </Link>
          </nav>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="md:hidden border-t border-border p-3 bg-background">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm truyện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {(searchLoading || searchQuery.trim() || searchResults.length > 0) && (
                <div className="mt-2 bg-card border border-border rounded-lg max-h-72 overflow-y-auto">
                  {searchLoading ? (
                    <p className="text-xs text-muted-foreground p-3">Đang tìm...</p>
                  ) : searchResults.length === 0 ? (
                    hotSuggestions.length > 0 ? (
                      <div>
                        <p className="text-[11px] text-muted-foreground px-3 py-2">Không tìm thấy. Gợi ý truyện hot:</p>
                        <div className="divide-y divide-border">
                          {hotSuggestions.map((item, hi) => (
                            <Link
                              key={`m-search-hot-${item.id}`}
                              to={`/truyen/${item.id}`}
                              onClick={() => {
                                setShowSearch(false);
                                setShowSearchDropdown(false);
                              }}
                              className="flex items-center gap-2 p-2 hover:bg-secondary transition-colors"
                            >
                              <img
                                src={thumbCoverUrl(item.cover_url)}
                                alt={item.title}
                                className="w-8 h-10 rounded object-cover flex-shrink-0"
                                {...coverImageProps(hi < 6)}
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {novelChapterSubtitle(item)}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground p-3">Không có kết quả phù hợp.</p>
                    )
                  ) : (
                    <div className="divide-y divide-border">
                      {searchResults.map((item, ri) => (
                        <Link
                          key={`m-search-${item.id}`}
                          to={`/truyen/${item.id}`}
                          onClick={() => {
                            setShowSearch(false);
                            setShowSearchDropdown(false);
                          }}
                          className="flex items-center gap-2 p-2 hover:bg-secondary transition-colors"
                        >
                          <img
                            src={thumbCoverUrl(item.cover_url)}
                            alt={item.title}
                            className="w-8 h-10 rounded object-cover flex-shrink-0"
                            {...coverImageProps(ri < 6)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {novelChapterSubtitle(item)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        )}

      </header>

      {/* Side drawer (slides from left) — desktop & mobile */}
      <>
        <div
          className={`fixed inset-0 z-[60] bg-black/45 backdrop-blur-[1px] transition-opacity duration-300 ease-out ${
            isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setIsMenuOpen(false)}
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
          aria-hidden
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
          className={`fixed top-0 left-0 z-[70] flex h-[100dvh] w-[min(92vw,24rem)] max-w-full flex-col bg-background shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none border-r border-border ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Link
              to="/"
              onClick={(e) => {
                handleHomeMarkClick(e);
                setIsMenuOpen(false);
              }}
              className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Về trang chủ — Mi Truyện"
              aria-label="Về trang chủ"
            >
              <BrandLogo
                variant="mark"
                className="h-9 w-9 shrink-0 rounded-xl shadow-md ring-1 ring-border"
                loading="lazy"
              />
              <span className="truncate text-base font-bold text-foreground">Mi Truyện</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Đóng menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-accent/10 text-accent'
                      : 'text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {link.icon && <link.icon className="h-5 w-5 shrink-0 opacity-80" />}
                  {link.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={() => setMobileGenresOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 border-b border-border bg-secondary/35 px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
              >
                <span className="flex items-center gap-3">
                  <List className="h-5 w-5 shrink-0 text-muted-foreground" />
                  Thể loại
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    mobileGenresOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {mobileGenresOpen && (
                <div className="max-h-[min(55vh,28rem)] overflow-y-auto overscroll-contain border-b border-border bg-secondary/15">
                  {genresRefreshing && navGenres.length === 0 ? (
                    <p className="px-4 py-3 pl-11 text-xs text-muted-foreground">Đang tải thể loại…</p>
                  ) : navGenres.length === 0 ? (
                    <p className="px-4 py-3 pl-11 text-xs leading-relaxed text-muted-foreground">
                      Chưa có thể loại để hiển thị. Vào{' '}
                      <Link to="/#the-loai-grid" onClick={() => setIsMenuOpen(false)} className="text-accent font-medium">
                        mục Thể loại trên trang chủ
                      </Link>{' '}
                      sau khi đồng bộ dữ liệu.
                    </p>
                  ) : (
                    navGenres.map((genre) => (
                      <Link
                        key={genre.id}
                        to={`/the-loai/${genre.slug}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 pl-11 text-sm text-foreground last:border-b-0 hover:bg-secondary/50"
                      >
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 leading-snug">{genre.name}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}

              <Link
                to="/#the-loai-grid"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/' && location.hash === '#the-loai-grid'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <BookOpen className="h-5 w-5 shrink-0 opacity-80" />
                Tất cả thể loại
              </Link>

              <Link
                to="/truyen-dang-ra"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/truyen-dang-ra'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <Clock className="h-5 w-5 shrink-0 opacity-80" />
                Đang tiến hành
              </Link>

              <div className="border-b border-border px-4 py-2">
                <p className="py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Theo số chương
                </p>
                <div className="flex flex-col pb-1">
                  {chapterRangeLinks.slice(2).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMenuOpen(false)}
                      className="rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary/70"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <Link
                to="/danh-dau"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/danh-dau'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <Bookmark className="h-5 w-5 shrink-0 opacity-80" />
                Truyện đánh dấu
              </Link>

              <Link
                to="/dang-truyen"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/dang-truyen'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <BookOpen className="h-5 w-5 shrink-0 opacity-80" />
                Đăng truyện mới
              </Link>

              <Link
                to="/quan-ly-bai-gui"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/quan-ly-bai-gui'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <List className="h-5 w-5 shrink-0 opacity-80" />
                Quản lý bài gửi
              </Link>

              <Link
                to="/dang-chuong"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/dang-chuong'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <BookOpen className="h-5 w-5 shrink-0 opacity-80" />
                Đăng chương mới
              </Link>

              <Link
                to="/quan-ly-chuong-gui"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/quan-ly-chuong-gui'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <List className="h-5 w-5 shrink-0 opacity-80" />
                Duyệt chương gửi
              </Link>

              <Link
                to="/lich-su"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/lich-su'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <History className="h-5 w-5 shrink-0 opacity-80" />
                Lịch sử đọc
              </Link>

              <Link
                to="/chinh-sach"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/chinh-sach'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <BookOpen className="h-5 w-5 shrink-0 opacity-80" />
                Chính sách
              </Link>

              <div className="flex gap-2 border-b border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => setIsDark(false)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    !isDark ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Sáng
                </button>
                <button
                  type="button"
                  onClick={() => setIsDark(true)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    isDark ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  Tối
                </button>
              </div>
            </nav>

            <div className="border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20 ring-1 ring-border/70">
                      <BrandLogo variant="mark" alt="" className="h-full w-full bg-transparent" imgClassName="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{user?.username}</span>
                      <span className="text-xs text-muted-foreground">Xem hồ sơ</span>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full rounded-lg border border-destructive/30 py-2.5 text-center text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 rounded-xl border border-border py-2.5 text-center text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors shadow-sm"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </aside>
      </>
    </>
  );
}

export default Header;
