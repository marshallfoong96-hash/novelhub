import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, User, Menu, X, BookOpen, Sparkles, ChevronDown, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/truyen-moi', label: 'New Releases' },
    { to: '/the-loai', label: 'Genres' },
    { to: '/truyen-full', label: 'Completed' },
    { to: '/truyen-sang-tac', label: 'AI Writing' },
  ];

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm' 
          : 'bg-background border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-background" />
              </div>
            </div>
            <span className="text-xl font-bold text-foreground">
              NovelHub
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === link.to
                    ? 'text-foreground bg-secondary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search novels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-colors"
                />
              </div>
            </form>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user?.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{user?.username}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link 
                    to="/register"
                    className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 rounded-lg text-sm font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-background border-t border-border animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search novels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </form>

            {/* Mobile Navigation */}
            <nav className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? 'text-foreground bg-secondary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Auth */}
            <div className="pt-4 border-t border-border flex gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="flex-1 py-2.5 text-center text-destructive border border-destructive/30 rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 py-2.5 text-center text-muted-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link 
                    to="/register" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex-1 py-2.5 text-center bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
