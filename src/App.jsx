import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NovelDetail from './pages/NovelDetail';
import ChapterRead from './pages/ChapterRead';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-6">
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
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-gray-600 mb-4">Trang không tồn tại</p>
      <a href="/" className="text-blue-500 hover:underline">
        Quay lại trang chủ
      </a>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                NovelHub
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Đọc truyện online, truyện chữ hay nhất. Cập nhật liên tục các truyện mới, 
              truyện full, truyện sáng tác chất lượng cao.
            </p>
            <div className="text-sm text-gray-500">
              <p>Email: contact@novelhub.com</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Khám phá</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/" className="hover:text-blue-500">Trang chủ</a></li>
                <li><a href="/truyen-moi" className="hover:text-blue-500">Truyện mới</a></li>
                <li><a href="/truyen-full" className="hover:text-blue-500">Truyện Full</a></li>
                <li><a href="/the-loai" className="hover:text-blue-500">Thể loại</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Cộng đồng</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/team" className="hover:text-blue-500">Nhóm dịch</a></li>
                <li><a href="/truyen-sang-tac" className="hover:text-blue-500">Sáng tác</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/gioi-thieu" className="hover:text-blue-500">Giới thiệu</a></li>
                <li><a href="/chinh-sach" className="hover:text-blue-500">Chính sách</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-4 text-center text-sm text-gray-500">
          <p>Copyright © 2024 NovelHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default App;
