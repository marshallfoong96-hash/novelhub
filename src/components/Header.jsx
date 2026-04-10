import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, BookOpen, Moon, Sun, Flame, Clock, CheckCircle, History, ChevronDown, List, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchGenresCached } from '../lib/cachedQueries';
import BrandLogo from './BrandLogo';

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
  const [mobileGenresOpen, setMobileGenresOpen] = useState(true);
  const [genres, setGenres] = useState([]);
  const searchBoxRef = useRef(null);
  const drawerSwipeStart = useRef({ x: 0, y: 0 });

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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchGenres = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      const data = await fetchGenresCached();
      setGenres(data || []);
    };
    fetchGenres();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const keyword = searchQuery.trim();
    if (!keyword || !isSupabaseConfigured || !supabase) return;
    const topHit = searchResults[0];
    if (topHit?.id) {
      navigate(`/truyen/${topHit.id}`);
      return;
    }
    const { data } = await supabase
      .from('novels')
      .select('id')
      .ilike('title', `%${keyword}%`)
      .order('view_count', { ascending: false })
      .limit(1);
    if (data?.[0]?.id) {
      navigate(`/truyen/${data[0].id}`);
    }
  };

  /** Mark logo = home: go to `/`, or scroll top / clear hash when already on home. */
  const handleHomeMarkClick = (e) => {
    if (location.pathname !== '/') return;
    e.preventDefault();
    if (location.hash || location.search) {
      navigate({ pathname: '/', search: '', hash: '' }, { replace: true });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      const { data, error } = await supabase
        .from('novels')
        .select('id,title,author,cover_url,view_count')
        .ilike('title', `%${keyword}%`)
        .order('view_count', { ascending: false })
        .limit(8);
      if (error) {
        setSearchResults([]);
        setHotSuggestions([]);
      } else {
        const rows = data || [];
        setSearchResults(rows);
        if (rows.length === 0) {
          const { data: hotData } = await supabase
            .from('novels')
            .select('id,title,author,cover_url,view_count')
            .order('view_count', { ascending: false })
            .limit(6);
          setHotSuggestions(hotData || []);
        } else {
          setHotSuggestions([]);
        }
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
        <div className="animate-marquee whitespace-nowrap inline-block font-semibold tracking-wide text-[13px] sm:text-sm">
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
                className="flex shrink-0 cursor-pointer rounded-xl ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent group"
                title="Về trang chủ — Mi Truyen"
                aria-label="Về trang chủ"
              >
                <BrandLogo
                  variant="mark"
                  className="h-9 w-9 rounded-xl ring-1 ring-border shadow-md transition-transform group-hover:scale-105"
                  loading="eager"
                />
                <span className="sr-only">Về trang chủ — Mi Truyen</span>
              </Link>
            </div>

            {/* Center: site title (fills the gap between logo and search) */}
            <div className="min-w-0 flex-1 flex flex-col items-center justify-center px-1 sm:px-4 text-center leading-tight">
              <Link
                to="/"
                className="truncate font-bold text-foreground text-sm sm:text-base md:text-lg tracking-tight hover:text-accent transition-colors max-w-[min(100%,14rem)] sm:max-w-md"
              >
                Mi Truyen
              </Link>
              <span className="hidden sm:block text-[10px] md:text-xs text-muted-foreground truncate max-w-[min(100%,16rem)]">
                mitruyen.me
              </span>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
                              {hotSuggestions.map((item) => (
                                <Link
                                  key={`search-hot-${item.id}`}
                                  to={`/truyen/${item.id}`}
                                  onClick={() => setShowSearchDropdown(false)}
                                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
                                >
                                  <img
                                    src={item.cover_url || '/default-cover.jpg'}
                                    alt={item.title}
                                    className="w-9 h-12 rounded object-cover flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {item.author || 'Dang cap nhat'}
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
                          {searchResults.map((item) => (
                            <Link
                              key={`search-${item.id}`}
                              to={`/truyen/${item.id}`}
                              onClick={() => setShowSearchDropdown(false)}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors"
                            >
                              <img
                                src={item.cover_url || '/default-cover.jpg'}
                                alt={item.title}
                                className="w-9 h-12 rounded object-cover flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {item.author || 'Dang cap nhat'}
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

              {/* History Button */}
              <Link
                to="/lich-su"
                className="hidden sm:flex p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                aria-label="Reading history"
              >
                <History className="w-5 h-5" />
              </Link>

              {/* Auth — compact on mobile (MonkeyD-style) */}
              <div className="flex md:hidden items-center gap-1">
                {isAuthenticated ? (
                  <Link
                    to="/profile"
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    aria-label="Hồ sơ"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-accent" />
                      )}
                    </div>
                  </Link>
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
                    <Link 
                      to="/profile" 
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                        {user?.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user?.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5 text-accent" />
                        )}
                      </div>
                      <span className="font-medium max-w-[80px] truncate">{user?.username}</span>
                    </Link>
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

            </div>
          </div>
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
                          {hotSuggestions.map((item) => (
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
                                src={item.cover_url || '/default-cover.jpg'}
                                alt={item.title}
                                className="w-8 h-10 rounded object-cover flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {item.author || 'Dang cap nhat'}
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
                      {searchResults.map((item) => (
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
                            src={item.cover_url || '/default-cover.jpg'}
                            alt={item.title}
                            className="w-8 h-10 rounded object-cover flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm text-foreground line-clamp-1">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.author || 'Dang cap nhat'}
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
              title="Về trang chủ — Mi Truyen"
              aria-label="Về trang chủ"
            >
              <BrandLogo
                variant="mark"
                className="h-9 w-9 shrink-0 rounded-xl shadow-md ring-1 ring-border"
                loading="lazy"
              />
              <span className="truncate text-base font-bold text-foreground">Mi Truyen</span>
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
                <div className="max-h-[min(45vh,22rem)] overflow-y-auto overscroll-contain border-b border-border bg-secondary/15">
                  {navGenres.length === 0 ? (
                    <p className="px-4 py-3 pl-11 text-xs leading-relaxed text-muted-foreground">
                      Chưa có thể loại trong Supabase (bảng <span className="font-mono">genres</span>). Thêm tại
                      Quản lý thể loại hoặc SQL.
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
                  {chapterRangeLinks.map((item) => (
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

              <Link
                to="/quan-ly-the-loai"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/quan-ly-the-loai'
                    ? 'bg-accent/10 text-accent'
                    : 'text-foreground hover:bg-secondary/80'
                }`}
              >
                <List className="h-5 w-5 shrink-0 opacity-80" />
                Quản lý thể loại
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-accent" />
                      )}
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
