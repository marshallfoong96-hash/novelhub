import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { loadAdsenseScript } from './lib/adsConfig';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NovelDetail from './pages/NovelDetail';
import ChapterRead from './pages/ChapterRead';
import BrowseNovels from './pages/BrowseNovels';
import ReadingHistory from './pages/ReadingHistory';
import GenreManager from './pages/GenreManager';
import { AboutPage, PrivacyPage, TermsPage, ContactPage } from './pages/InfoPage';
import { Sparkles, BookOpen, Users, PenTool, Mail, Github, Facebook } from 'lucide-react';

function App() {
  useEffect(() => {
    loadAdsenseScript();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/chapter/:id" element={<ChapterRead />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/truyen/:slug" element={<NovelDetail />} />
              <Route path="/hot" element={<BrowseNovels mode="hot" />} />
              <Route path="/truyen-moi" element={<BrowseNovels mode="recent" />} />
              <Route path="/truyen-full" element={<BrowseNovels mode="completed" />} />
              <Route path="/truyen-dang-ra" element={<BrowseNovels mode="ongoing" />} />
              <Route path="/so-chuong/:range" element={<BrowseNovels mode="chapterRange" />} />
              <Route path="/lich-su" element={<ReadingHistory />} />
              <Route path="/quan-ly-the-loai" element={<GenreManager />} />
              <Route path="/the-loai" element={<BrowseNovels mode="all" />} />
              <Route path="/the-loai/:slug" element={<BrowseNovels mode="category" />} />
              <Route path="/gioi-thieu" element={<AboutPage />} />
              <Route path="/chinh-sach" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/lien-he" element={<ContactPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-muted-foreground/20 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Không tìm thấy trang</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    discover: [
      { label: 'Trang chủ', to: '/' },
      { label: 'Truyện Hot', to: '/hot' },
      { label: 'Mới cập nhật', to: '/truyen-moi' },
      { label: 'Truyện Full', to: '/truyen-full' },
      { label: 'Thể loại', to: '/the-loai' },
    ],
    create: [
      { label: 'Truyện Hot', to: '/hot' },
      { label: 'Mới cập nhật', to: '/truyen-moi' },
      { label: 'Truyện Full', to: '/truyen-full' },
    ],
    company: [
      { label: 'Giới thiệu', to: '/gioi-thieu' },
      { label: 'Chính sách', to: '/chinh-sach' },
      { label: 'Điều khoản', to: '/terms' },
      { label: 'Liên hệ', to: '/lien-he' },
    ],
  };

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Footer */}
        <div className="py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Mi Truyen</span>
            </Link>
            <p className="text-muted-foreground text-xs max-w-xs mb-4 leading-relaxed">
              Nền tảng đọc truyện online hàng đầu với hàng nghìn tác phẩm hay. 
              Hỗ trợ AI viết truyện thông minh.
            </p>
            <div className="flex items-center gap-2">
              <a 
                href="https://facebook.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a 
                href="mailto:contact@mitruyen.me" 
                className="w-8 h-8 flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links - Discover */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              Khám phá
            </h4>
            <ul className="space-y-2">
              {footerLinks.discover.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links - Create */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-accent" />
              Sáng tác
            </h4>
            <ul className="space-y-2">
              {footerLinks.create.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links - Company */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent" />
              Về chúng tôi
            </h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground">
            © {currentYear} Mi Truyen · mitruyen.me
          </p>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <Link to="/chinh-sach" className="hover:text-foreground transition-colors">
              Chính sách bảo mật
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Điều khoản sử dụng
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default App;
