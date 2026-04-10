import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, BookOpen, Sparkles, Moon, Sun, Flame, Clock, CheckCircle, History, ChevronDown, List, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  const [openMenu, setOpenMenu] = useState('');
  const [mobileGenresOpen, setMobileGenresOpen] = useState(true);
  const [genres, setGenres] = useState([]);
  const closeTimerRef = useRef(null);
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

  const monkeyDGenres = [
    'Bách hợp', 'BE', 'Bình luận cốt truyện', 'Chữa lành', 'Cổ đại', 'Cung đấu', 'Cưới trước yêu sau',
    'Cường thủ hào đoạt', 'Dị năng', 'Dưỡng thê', 'Đam mỹ', 'Điền văn', 'Đô thị', 'Đoản văn', 'Độc tâm',
    'Gả thay', 'Giả đấu', 'Gia đình', 'Gương vỡ không lành', 'Gương vỡ lại lành', 'Hài hước', 'Hành động',
    'Hào môn thế gia', 'HE', 'Hệ thống', 'Hiện đại', 'Hoán đổi thân xác', 'Học bá', 'Học đường',
    'Hư cấu kỳ ảo', 'Huyền huyền', 'Không CP', 'Kinh dị', 'Linh dị', 'Mạt thế', 'Mỹ thực', 'Ngôn tình',
    'Ngọt', 'Ngược', 'Ngược luyến tận tâm', 'Ngược nam', 'Ngược nữ', 'Nhân thú', 'Niên đại', 'Nữ cường',
    'OE', 'Phép thuật', 'Phiêu lưu', 'Phương Đông', 'Phương Tây', 'Quy tắc', 'Sảng văn', 'SE', 'Showbiz',
    'Sủng', 'Thanh xuân vườn trường', 'Thức tỉnh nhân vật', 'Tiên hiệp', 'Tiểu thuyết', 'Tổng tài',
    'Trả thù', 'Trinh thám', 'Trọng sinh', 'Truy thê', 'Truyền cảm hứng', 'Vả mặt', 'Vô tri', 'Xuyên không', 'Xuyên sách'
  ];

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
    setOpenMenu('');
    setShowSearchDropdown(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
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
      const { data } = await supabase
        .from('genres')
        .select('*')
        .order('name', { ascending: true });
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

  const quickCategoryLinks = [
    { to: '/hot', label: 'Truyện hot' },
    { to: '/truyen-moi', label: 'Mới cập nhật' },
    { to: '/truyen-full', label: 'Truyện full' },
    { to: '/truyen-dang-ra', label: 'Đang tiến hành' }
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

  const mergedGenres = useMemo(() => {
    const dbGenres = (genres || []).map((genre) => ({
      id: genre.id || genre.slug,
      name: genre.name,
      slug: genre.slug || toSlug(genre.name)
    }));

    const map = new Map(dbGenres.map((genre) => [genre.slug, genre]));
    monkeyDGenres.forEach((name) => {
      const slug = toSlug(name);
      if (!map.has(slug)) {
        map.set(slug, { id: `static-${slug}`, name, slug });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [genres]);

  const genreColumns = [[], [], [], [], []];
  mergedGenres.forEach((genre, index) => {
    genreColumns[index % 5].push(genre);
  });

  const openDropdown = (menuKey) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpenMenu(menuKey);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpenMenu('');
      closeTimerRef.current = null;
    }, 220);
  };

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
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            {/* Mobile: hamburger + logo */}
            <div className="flex items-center gap-2 min-w-0 flex-1 lg:flex-initial lg:min-w-0">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors shrink-0"
                aria-label="Mở menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link to="/" className="flex items-center gap-2 group min-w-0 shrink">
                <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shrink-0">
                  <Sparkles className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-base sm:text-lg font-bold text-foreground truncate">
                  Mi Truyen
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`top-nav-pill ${
                    location.pathname === link.to
                      ? 'top-nav-pill-active'
                      : 'top-nav-pill-idle'
                  }`}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5" />}
                  {link.label}
                </Link>
              ))}
              <div className="relative" onMouseEnter={() => openDropdown('danh-sach')} onMouseLeave={scheduleClose}>
                <button
                  type="button"
                  className={`top-nav-pill ${
                    location.pathname.startsWith('/the-loai') || location.pathname.startsWith('/hot') || location.pathname.startsWith('/truyen-')
                      ? 'top-nav-pill-active'
                      : 'top-nav-pill-idle'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Danh sách
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === 'danh-sach' ? 'rotate-180' : ''}`} />
                </button>

                {openMenu === 'danh-sach' && (
                  <div className="absolute top-full left-0 mt-1 w-[980px] dropdown-surface p-4 z-50" onMouseEnter={() => openDropdown('danh-sach')} onMouseLeave={scheduleClose}>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      {quickCategoryLinks.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="text-sm font-semibold text-foreground hover:text-accent transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-3 border-t border-border pt-3 max-h-[420px] overflow-y-auto">
                      {genreColumns.map((column, colIndex) => (
                        <div key={colIndex} className="space-y-2">
                          {column.map((genre) => (
                            <Link
                              key={genre.id}
                              to={`/the-loai/${genre.slug}`}
                              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {genre.name}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onMouseEnter={() => openDropdown('chapter-range')} onMouseLeave={scheduleClose}>
                <button
                  type="button"
                  className={`top-nav-pill ${
                    location.pathname.startsWith('/so-chuong')
                      ? 'top-nav-pill-active'
                      : 'top-nav-pill-idle'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Phân loại theo chương
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === 'chapter-range' ? 'rotate-180' : ''}`} />
                </button>
                {openMenu === 'chapter-range' && (
                  <div className="absolute top-full left-0 mt-1 w-64 dropdown-surface p-3 z-50" onMouseEnter={() => openDropdown('chapter-range')} onMouseLeave={scheduleClose}>
                    <div className="space-y-2">
                      {chapterRangeLinks.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="block text-sm font-medium text-foreground hover:text-accent transition-colors"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" onMouseEnter={() => openDropdown('customize')} onMouseLeave={scheduleClose}>
                <button
                  type="button"
                  className={`top-nav-pill ${openMenu === 'customize' ? 'top-nav-pill-active' : 'top-nav-pill-idle'}`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Tùy chỉnh
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMenu === 'customize' ? 'rotate-180' : ''}`} />
                </button>
                {openMenu === 'customize' && (
                  <div className="absolute top-full left-0 mt-1 w-56 dropdown-surface p-3 z-50" onMouseEnter={() => openDropdown('customize')} onMouseLeave={scheduleClose}>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setIsDark(false)}
                        className="block w-full text-left text-sm font-medium text-foreground hover:text-accent transition-colors"
                      >
                        Màu nền sáng
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDark(true)}
                        className="block w-full text-left text-sm font-medium text-foreground hover:text-accent transition-colors"
                      >
                        Màu nền tối
                      </button>
                      <Link to="/chinh-sach" className="block text-sm font-medium text-foreground hover:text-accent transition-colors">
                        Chính sách
                      </Link>
                      <Link to="/quan-ly-the-loai" className="block text-sm font-medium text-foreground hover:text-accent transition-colors">
                        Quản lý thể loại
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

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

      {/* Mobile: side drawer (slides from left) */}
      <div className="lg:hidden">
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
          className={`fixed top-0 left-0 z-[70] flex h-[100dvh] w-[min(88vw,20rem)] max-w-full flex-col bg-background shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none border-r border-border ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <Link
              to="/"
              onClick={() => setIsMenuOpen(false)}
              className="flex min-w-0 items-center gap-2"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent shadow-md">
                <Sparkles className="h-4 w-4 text-accent-foreground" />
              </div>
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
              {mobileGenresOpen && mergedGenres.length > 0 && (
                <div className="max-h-[min(45vh,22rem)] overflow-y-auto overscroll-contain border-b border-border bg-secondary/15">
                  {mergedGenres.map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/the-loai/${genre.slug}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 pl-11 text-sm text-foreground last:border-b-0 hover:bg-secondary/50"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 leading-snug">{genre.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to="/the-loai"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 border-b border-border px-4 py-3.5 text-sm font-medium transition-colors ${
                  location.pathname === '/the-loai'
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
      </div>
    </>
  );
}

export default Header;
