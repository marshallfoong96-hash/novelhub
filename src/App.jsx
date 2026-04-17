import { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { loadAdsenseScript } from './lib/adsConfig';
import { lazyWithRetry } from './lib/lazyWithRetry';
import Header from './components/Header';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { BookOpen, Users, PenTool, Mail } from 'lucide-react';
import BrandLogo from './components/BrandLogo';

const Home = lazyWithRetry(() => import('./pages/Home'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const RegisterSuccess = lazyWithRetry(() => import('./pages/RegisterSuccess'));
const NovelDetail = lazyWithRetry(() => import('./pages/NovelDetail'));
const ChapterRead = lazyWithRetry(() => import('./pages/ChapterRead'));
const BrowseNovels = lazyWithRetry(() => import('./pages/BrowseNovels'));
const ReadingHistory = lazyWithRetry(() => import('./pages/ReadingHistory'));
const BookmarkedNovels = lazyWithRetry(() => import('./pages/BookmarkedNovels'));
const Membership = lazyWithRetry(() => import('./pages/Membership'));
const GenreManager = lazyWithRetry(() => import('./pages/GenreManager'));
const AboutPage = lazyWithRetry(() =>
  import('./pages/InfoPage').then((m) => ({ default: m.AboutPage }))
);
const PrivacyPage = lazyWithRetry(() =>
  import('./pages/InfoPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazyWithRetry(() =>
  import('./pages/InfoPage').then((m) => ({ default: m.TermsPage }))
);
const ContactPage = lazyWithRetry(() =>
  import('./pages/InfoPage').then((m) => ({ default: m.ContactPage }))
);

function RoutePageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
      <p className="text-muted-foreground text-sm animate-pulse">Đang tải...</p>
    </div>
  );
}

function RoutedMain() {
  const location = useLocation();
  return (
    <RouteErrorBoundary key={location.pathname + location.search}>
      <Suspense fallback={<RoutePageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chapter/:id" element={<ChapterRead />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/success" element={<RegisterSuccess />} />
          <Route path="/register" element={<Register />} />
          <Route path="/truyen/:slug" element={<NovelDetail />} />
          <Route path="/hot" element={<BrowseNovels mode="hot" />} />
          <Route path="/truyen-moi" element={<BrowseNovels mode="recent" />} />
          <Route path="/truyen-full" element={<BrowseNovels mode="completed" />} />
          <Route path="/truyen-dang-ra" element={<BrowseNovels mode="ongoing" />} />
          <Route path="/so-chuong/:range" element={<BrowseNovels mode="chapterRange" />} />
          <Route path="/lich-su" element={<ReadingHistory />} />
          <Route path="/danh-dau" element={<BookmarkedNovels />} />
          <Route path="/profile" element={<Membership />} />
          <Route path="/thanh-vien" element={<Membership />} />
          <Route path="/quan-ly-the-loai" element={<GenreManager />} />
          <Route path="/the-loai" element={<BrowseNovels mode="all" />} />
          <Route path="/the-loai/:slug" element={<BrowseNovels mode="category" />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="/chinh-sach" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

function App() {
  useEffect(() => {
    const run = () => loadAdsenseScript();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, 3500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
            <RoutedMain />
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
      { label: 'Thể loại', to: '/#the-loai-grid' },
      { label: 'Đánh dấu', to: '/danh-dau' },
      { label: 'Lịch sử đọc', to: '/lich-su' },
      { label: 'Thành viên', to: '/profile' },
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

  /** 2.25rem (mark cỡ chuẩn) × 1.3 — trang trí footer */
  const onigiriTileClass =
    "h-[2.925rem] w-[2.925rem] shrink-0 rounded-lg ring-1 ring-border/80 bg-card object-cover shadow-sm";

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Footer */}
        <div className="py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div
                className="grid grid-cols-4 gap-1.5 content-start"
                aria-hidden
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <BrandLogo
                    key={`footer-onigiri-${i}`}
                    variant="sticker"
                    stickerIndex={i}
                    alt=""
                    className={onigiriTileClass}
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
            <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
              Mi Truyện (mitruyen.me) — đọc truyện chữ online, nhiều thể loại, cập nhật thường xuyên.
              Lưu đánh dấu và lịch sử đọc trên trình duyệt; đăng nhập để dùng cùng một tài khoản trên các thiết bị.
            </p>
            <div className="flex flex-wrap items-center gap-2">
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
            © {currentYear} Mi Truyện · mitruyen.me
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
