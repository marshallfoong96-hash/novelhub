import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, BookOpen, Sparkles, Moon, Sun, Flame, Clock, CheckCircle, History, ChevronDown } from 'lucide-react';
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
  const [genres, setGenres] = useState([]);
  const closeTimerRef = useRef(null);
  const searchBoxRef = useRef(null);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const monkeyDGenres = [
    'Bach Hop', 'BE', 'Binh Luan Cot Truyen', 'Chua Lanh', 'Co Dai', 'Cung Dau', 'Cuoi Truoc Yeu Sau',
    'Cuong Thu Hao Doat', 'Di Nang', 'Duong The', 'Dam My', 'Dien Van', 'Do Thi', 'Doan Van', 'Doc Tam',
    'Ga Thay', 'Gia Dau', 'Gia Dinh', 'Guong Vo Khong Lanh', 'Guong Vo Lai Lanh', 'Hai Huoc', 'Hanh Dong',
    'Hao Mon The Gia', 'HE', 'He Thong', 'Hien Dai', 'Hoan Doi Than Xac', 'Hoc Ba', 'Hoc Duong',
    'Hu Cau Ky Ao', 'Huyen Huyen', 'Khong CP', 'Kinh Di', 'Linh Di', 'Mat The', 'My Thuc', 'Ngon Tinh',
    'Ngot', 'Nguoc', 'Nguoc Luyen Tan Tam', 'Nguoc Nam', 'Nguoc Nu', 'Nhan Thu', 'Nien Dai', 'Nu Cuong',
    'OE', 'Phep Thuat', 'Phieu Luu', 'Phuong Dong', 'Phuong Tay', 'Quy Tac', 'Sang Van', 'SE', 'Showbiz',
    'Sung', 'Thanh Xuan Vuon Truong', 'Thuc Tinh Nhan Vat', 'Tien Hiep', 'Tieu Thuyet', 'Tong Tai',
    'Tra Thu', 'Trinh Tham', 'Trong Sinh', 'Truy The', 'Truyen Cam Hung', 'Va Mat', 'Vo Tri', 'Xuyen Khong', 'Xuyen Sach'
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
    { to: '/hot', label: 'Truyen Hot' },
    { to: '/truyen-moi', label: 'Truyen moi cap nhat' },
    { to: '/truyen-full', label: 'Truyen Full' },
    { to: '/truyen-dang-ra', label: 'Truyen dang tien hanh' }
  ];
  const chapterRangeLinks = [
    { to: '/so-chuong/duoi-100', label: 'Duoi 100 chuong' },
    { to: '/so-chuong/100-500', label: '100 - 500 chuong' },
    { to: '/so-chuong/500-1000', label: '500 - 1000 chuong' },
    { to: '/so-chuong/tren-1000', label: 'Tren 1000 chuong' }
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
      <div className="bg-gradient-to-r from-accent to-[#f43f7d] text-accent-foreground text-xs py-1.5 text-center overflow-hidden shadow-sm">
        <div className="animate-marquee whitespace-nowrap inline-block">
          <span className="mx-8">Chao mung den MI Truyen - Nen tang doc truyen online hang dau</span>
          <span className="mx-8">Cập nhật hàng nghìn truyện mới mỗi ngày</span>
          <span className="mx-8">Đăng ký tài khoản để lưu truyện yêu thích</span>
          <span className="mx-8">Chao mung den MI Truyen - Nen tang doc truyen online hang dau</span>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-background/95 backdrop-blur-lg border-b border-border shadow-sm' 
            : 'bg-background border-b border-border'
        }`}
      >
        <div className="max-w-[1500px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground hidden sm:block">
                MI Truyen
              </span>
            </Link>

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
                  Danh sach
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
                  Phan loai theo Chuong
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
                  Tuy chinh
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
                        Mau nen sang
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDark(true)}
                        className="block w-full text-left text-sm font-medium text-foreground hover:text-accent transition-colors"
                      >
                        Mau nen toi
                      </button>
                      <Link to="/chinh-sach" className="block text-sm font-medium text-foreground hover:text-accent transition-colors">
                        Chinh sach
                      </Link>
                      <Link to="/quan-ly-the-loai" className="block text-sm font-medium text-foreground hover:text-accent transition-colors">
                        Quan ly the loai
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
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
                        <p className="text-xs text-muted-foreground p-2">Dang tim...</p>
                      ) : searchResults.length === 0 ? (
                        hotSuggestions.length > 0 ? (
                          <div>
                            <p className="text-[11px] text-muted-foreground px-2 py-1">Khong tim thay. Goi y truyen hot:</p>
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
                          <p className="text-xs text-muted-foreground p-2">Khong co ket qua phu hop.</p>
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
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
                    <p className="text-xs text-muted-foreground p-3">Dang tim...</p>
                  ) : searchResults.length === 0 ? (
                    hotSuggestions.length > 0 ? (
                      <div>
                        <p className="text-[11px] text-muted-foreground px-3 py-2">Khong tim thay. Goi y truyen hot:</p>
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
                      <p className="text-xs text-muted-foreground p-3">Khong co ket qua phu hop.</p>
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-background border-t border-border animate-fade-in">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
              {/* Mobile Navigation */}
              <nav className="grid grid-cols-2 gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      location.pathname === link.to
                        ? 'text-accent bg-accent/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/so-chuong/duoi-100"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname.startsWith('/so-chuong')
                      ? 'text-accent bg-accent/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Phan loai chuong
                </Link>
                <Link
                  to="/truyen-dang-ra"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === '/truyen-dang-ra'
                      ? 'text-accent bg-accent/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Dang tien hanh
                </Link>
              </nav>

              {mergedGenres.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">The loai</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {mergedGenres.map((genre) => (
                      <Link
                        key={genre.id}
                        to={`/the-loai/${genre.slug}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="px-3 py-2 text-sm rounded-lg bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
                      >
                        {genre.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Auth */}
              <div className="pt-4 border-t border-border">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Link 
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                        {user?.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user?.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">{user?.username}</span>
                        <span className="text-xs text-muted-foreground">Xem hồ sơ</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => { logout(); setIsMenuOpen(false); }}
                      className="w-full py-2.5 text-center text-sm text-destructive border border-destructive/30 rounded-lg font-medium hover:bg-destructive/10 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Link 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 py-2.5 text-center text-muted-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                    >
                      Đăng nhập
                    </Link>
                    <Link 
                      to="/register" 
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 py-2.5 text-center bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                    >
                      Đăng ký
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;
