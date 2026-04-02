import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NovelDetail from './pages/NovelDetail';
import ChapterRead from './pages/ChapterRead';
import { Sparkles, BookOpen, Users, PenTool, Mail, Github, Twitter } from 'lucide-react';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/truyen/:slug" element={<NovelDetail />} />
              <Route path="/truyen/:slug/chuong-:chapterNumber" element={<ChapterRead />} />
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
        <h1 className="text-8xl font-bold text-muted-foreground/20 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    discover: [
      { label: 'Home', to: '/' },
      { label: 'New Releases', to: '/truyen-moi' },
      { label: 'Completed', to: '/truyen-full' },
      { label: 'Genres', to: '/the-loai' },
    ],
    create: [
      { label: 'AI Writing', to: '/truyen-sang-tac' },
      { label: 'Teams', to: '/team' },
      { label: 'Audio Novels', to: '/audio' },
    ],
    company: [
      { label: 'About', to: '/gioi-thieu' },
      { label: 'Privacy', to: '/chinh-sach' },
      { label: 'Terms', to: '/terms' },
    ],
  };

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-background" />
              </div>
              <span className="text-xl font-bold text-foreground">NovelHub</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Your ultimate destination for reading and creating novels. 
              Powered by AI to help you discover and write amazing stories.
            </p>
            <div className="flex items-center gap-3">
              <a 
                href="#" 
                className="w-9 h-9 flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a 
                href="mailto:contact@novelhub.com" 
                className="w-9 h-9 flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              Discover
            </h4>
            <ul className="space-y-3">
              {footerLinks.discover.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-accent" />
              Create
            </h4>
            <ul className="space-y-3">
              {footerLinks.create.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} NovelHub. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ for readers and writers
          </p>
        </div>
      </div>
    </footer>
  );
}

export default App;
