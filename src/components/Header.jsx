import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Menu, X, BookOpen, Home, Library, Headphones, Users, PenTool } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top Bar */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                NovelHub
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm truyện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </form>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Link to="/profile" className="flex items-center gap-2 text-gray-700 hover:text-blue-500">
                    <img 
                      src={user?.avatar || '/default-avatar.png'} 
                      alt={user?.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-medium">{user?.username}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-500 hover:text-red-500"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-500"
                  >
                    <User className="w-4 h-4" />
                    Đăng nhập
                  </Link>
                  <Link 
                    to="/register"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="hidden md:flex items-center gap-1 h-12">
            <NavLink to="/" icon={<Home className="w-4 h-4" />}>Trang chủ</NavLink>
            <NavLink to="/truyen-moi">Truyện mới</NavLink>
            <NavLink to="/the-loai" icon={<Library className="w-4 h-4" />}>Thể loại</NavLink>
            <NavLink to="/truyen-full">Truyện Full</NavLink>
            <NavLink to="/truyen-dai">Truyện Dài</NavLink>
            <NavLink to="/truyen-sang-tac" icon={<PenTool className="w-4 h-4" />}>Truyện Sáng Tác</NavLink>
            <NavLink to="/team" icon={<Users className="w-4 h-4" />}>Team</NavLink>
            <NavLink to="/audio" icon={<Headphones className="w-4 h-4" />}>Nghe Audio</NavLink>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="p-4 space-y-3">
            <form onSubmit={handleSearch} className="w-full">
              <input
                type="text"
                placeholder="Tìm truyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg"
              />
            </form>
            <div className="space-y-1">
              <MobileNavLink to="/">Trang chủ</MobileNavLink>
              <MobileNavLink to="/truyen-moi">Truyện mới</MobileNavLink>
              <MobileNavLink to="/the-loai">Thể loại</MobileNavLink>
              <MobileNavLink to="/truyen-full">Truyện Full</MobileNavLink>
              <MobileNavLink to="/truyen-dai">Truyện Dài</MobileNavLink>
              <MobileNavLink to="/truyen-sang-tac">Truyện Sáng Tác</MobileNavLink>
              <MobileNavLink to="/team">Team</MobileNavLink>
              <MobileNavLink to="/audio">Nghe Audio</MobileNavLink>
            </div>
            <div className="flex gap-3 pt-3 border-t">
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="flex-1 py-2 text-center text-red-500 border border-red-200 rounded-lg"
                >
                  Đăng xuất
                </button>
              ) : (
                <>
                  <Link to="/login" className="flex-1 py-2 text-center border border-gray-200 rounded-lg">
                    Đăng nhập
                  </Link>
                  <Link to="/register" className="flex-1 py-2 text-center bg-blue-500 text-white rounded-lg">
                    Đăng ký
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

function NavLink({ to, children, icon }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children }) {
  return (
    <Link to={to} className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
      {children}
    </Link>
  );
}

export default Header;
