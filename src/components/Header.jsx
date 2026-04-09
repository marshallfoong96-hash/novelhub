import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Menu, X, BookOpen, Sparkles, Moon, Sun, Flame, Clock, CheckCircle, History } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

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
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const navLinks = [
    { to: '/', label: 'Trang chủ', icon: BookOpen },
    { to: '/hot', label: 'Hot', icon: Flame },
    { to: '/truyen-moi', label: 'Mới cập nhật', icon: Clock },
    { to: '/truyen-full', label: 'Truyện Full', icon: CheckCircle },
    { to: '/the-loai', label: 'Thể loại', icon: null },
  ];

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-accent text-accent-foreground text-xs py-1.5 text-center overflow-hidden">
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
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground hidden sm:block">
                MI Truyen
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 ${
                    location.pathname === link.to
                      ? 'text-accent bg-accent/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5" />}
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Search Bar - Desktop */}
              <form onSubmit={handleSearch} className="hidden md:flex">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm truyện..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48 lg:w-56 pl-8 pr-3 py-1.5 bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:bg-background transition-all"
                  />
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
              </nav>

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
