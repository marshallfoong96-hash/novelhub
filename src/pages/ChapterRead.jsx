import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from "../lib/supabase";
import { AdBanner, AdInline, ShopeeDeals } from '../components/AdSpace';

import {
  Home, BookOpen, Settings, MessageSquare,
  Minus, Plus, ChevronLeft, ChevronRight,
  List, Send, ArrowRight, User
} from "lucide-react";

export default function ChapterRead() {
  const { id } = useParams();

  const [chapter, setChapter] = useState(null);
  const [novel, setNovel] = useState(null);
  const [allChapters, setAllChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [contentWidth, setContentWidth] = useState(760);
  const [readingTheme, setReadingTheme] = useState("light");
  const [readingProgress, setReadingProgress] = useState(0);
  const isAuthenticated = true;
  const READER_PREFS_KEY = "mi_reader_prefs";

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  useEffect(() => {
    fetchChapter();
  }, [id]);

  useEffect(() => {
    setShowComments(false);
  }, [id]);

  useEffect(() => {
    if (!chapter || !novel) return;
    const currentEntry = {
      novelId: novel.id,
      chapterId: chapter.id,
      chapterNumber: chapter.chapter_number,
      chapterTitle: chapter.title,
      title: novel.title,
      coverUrl: novel.cover_url,
      readAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem("mi_reading_history");
      const parsed = raw ? JSON.parse(raw) : [];
      const withoutCurrent = (Array.isArray(parsed) ? parsed : []).filter(
        (item) => String(item.chapterId) !== String(currentEntry.chapterId)
      );
      const next = [currentEntry, ...withoutCurrent].slice(0, 100);
      localStorage.setItem("mi_reading_history", JSON.stringify(next));
    } catch (error) {
      console.error("[v0] Could not save reading history", error);
    }
  }, [chapter, novel]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(READER_PREFS_KEY);
      const prefs = raw ? JSON.parse(raw) : null;
      if (!prefs || typeof prefs !== "object") return;
      if (typeof prefs.fontSize === "number") setFontSize(Math.min(30, Math.max(14, prefs.fontSize)));
      if (typeof prefs.lineHeight === "number") setLineHeight(Math.min(2.8, Math.max(1.4, prefs.lineHeight)));
      if (typeof prefs.contentWidth === "number") setContentWidth(Math.min(920, Math.max(620, prefs.contentWidth)));
      if (typeof prefs.readingTheme === "string") setReadingTheme(prefs.readingTheme);
    } catch (error) {
      console.error("[v0] Could not load reader prefs", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        READER_PREFS_KEY,
        JSON.stringify({ fontSize, lineHeight, contentWidth, readingTheme })
      );
    } catch (error) {
      console.error("[v0] Could not save reader prefs", error);
    }
  }, [fontSize, lineHeight, contentWidth, readingTheme]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setReadingProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchChapter = async () => {
    try {
      setLoading(true);

      // Fetch the chapter
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", parseInt(id))
        .single();

      if (chapterError) {
        console.error('[v0] Error fetching chapter:', chapterError);
        return;
      }

      setChapter(chapterData);

      if (chapterData?.novel_id) {
        // Fetch the novel info
        const { data: novelData, error: novelError } = await supabase
          .from("novels")
          .select("*")
          .eq("id", chapterData.novel_id)
          .single();

        if (!novelError) {
          setNovel(novelData);

          if (novelData?.id) {
            const currentViewCount = novelData.view_count || 0;
            const nextViewCount = currentViewCount + 1;
            await supabase
              .from("novels")
              .update({ view_count: nextViewCount })
              .eq("id", novelData.id);
            setNovel({ ...novelData, view_count: nextViewCount });
          }
        }

        // Fetch all chapters for navigation
        const { data: chaptersData, error: chaptersError } = await supabase
          .from("chapters")
          .select("id, chapter_number, title")
          .eq("novel_id", chapterData.novel_id)
          .order("chapter_number", { ascending: true });

        if (!chaptersError) {
          setAllChapters(chaptersData || []);
        }
      }
    } catch (error) {
      console.error('[v0] Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !chapter) return;

    const mockComment = {
      id: Date.now(),
      content: newComment,
      createdAt: new Date().toISOString(),
      user: { username: "You" }
    };
    
    setComments([mockComment, ...comments]);
    setNewComment('');
  };

  // Find prev/next chapters
  const currentIndex = allChapters.findIndex(c => c.id === chapter?.id);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Đang tải chương...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Không tìm thấy chương</h2>
          <p className="text-muted-foreground text-sm mb-6">Chương này không tồn tại hoặc đã bị xóa.</p>
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

  const themeClasses = {
    light: "bg-card text-foreground border-border",
    sepia: "bg-[#f6efe2] text-[#3f3122] border-[#e2d5bf]",
    dark: "bg-[#111827] text-[#e5e7eb] border-[#374151]"
  };

  return (
    <>
      {/* Reading Progress Bar */}
      <div 
        className="reading-progress" 
        style={{ width: `${readingProgress}%` }}
      />

      <div className="max-w-4xl mx-auto pb-24">
        {/* Top Banner Ad */}
        <AdBanner type="leaderboard" className="hidden md:flex mb-4" />
        <AdBanner type="mobile" className="md:hidden mb-4" />

        {/* Chapter Header */}
        <div className="bg-card border border-border rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link 
                to="/"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
                aria-label="Home"
              >
                <Home className="w-4 h-4" />
              </Link>
              {novel && (
                <Link 
                  to={`/truyen/${novel.id}`}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-w-0"
                >
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{novel.title}</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                aria-label="Cài đặt đọc"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowComments(!showComments)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-colors ${
                  showComments ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">{comments.length}</span>
              </button>
            </div>
          </div>
          
          <h1 className="text-base font-bold text-foreground text-center mt-3 text-balance">
            Chương {chapter.chapter_number}: {chapter.title}
          </h1>

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Cỡ chữ:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className="p-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      aria-label="Giảm cỡ chữ"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-medium text-foreground w-7 text-center">{fontSize}</span>
                    <button
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className="p-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      aria-label="Tăng cỡ chữ"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Giãn dòng:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLineHeight(Math.max(1.4, lineHeight - 0.2))}
                      className="p-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      aria-label="Giảm giãn dòng"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-medium text-foreground w-7 text-center">{lineHeight.toFixed(1)}</span>
                    <button
                      onClick={() => setLineHeight(Math.min(2.5, lineHeight + 0.2))}
                      className="p-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      aria-label="Tăng giãn dòng"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Bề rộng:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setContentWidth(Math.max(620, contentWidth - 40))}
                      className="p-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      aria-label="Giảm bề rộng"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-medium text-foreground w-12 text-center">{contentWidth}</span>
                    <button
                      onClick={() => setContentWidth(Math.min(920, contentWidth + 40))}
                      className="p-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
                      aria-label="Tăng bề rộng"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Nền:</span>
                  {[
                    { key: "light", label: "Sáng" },
                    { key: "sepia", label: "Sepia" },
                    { key: "dark", label: "Đêm" }
                  ].map((theme) => (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={() => setReadingTheme(theme.key)}
                      className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                        readingTheme === theme.key
                          ? "border-accent text-accent bg-accent/10"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {prevChapter ? (
            <Link
              to={`/chapter/${prevChapter.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Trước</span>
            </Link>
          ) : (
            <div className="w-20" />
          )}

          {novel && (
            <Link
              to={`/truyen/${novel.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Mục lục</span>
            </Link>
          )}

          {nextChapter ? (
            <Link
              to={`/chapter/${nextChapter.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <span className="hidden sm:inline">Tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="w-20" />
          )}
        </div>

        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-2 px-2 py-2 rounded-2xl border border-border bg-card/95 backdrop-blur shadow-lg">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-[-90deg]" />
              Top
            </button>
            {prevChapter ? (
              <Link
                to={`/chapter/${prevChapter.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Trước
              </Link>
            ) : (
              <span className="px-3 py-2 text-xs text-muted-foreground/50">Trước</span>
            )}
            {novel && (
              <Link
                to={`/truyen/${novel.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <List className="w-3.5 h-3.5" />
                Mục lục
              </Link>
            )}
            {nextChapter ? (
              <Link
                to={`/chapter/${nextChapter.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Tiếp
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="px-3 py-2 text-xs text-muted-foreground/50">Tiếp</span>
            )}
          </div>
        </div>

        {/* Chapter Content */}
        <div className={`border rounded-lg p-5 sm:p-6 md:p-8 transition-colors ${themeClasses[readingTheme] || themeClasses.light}`}>
          <article 
            className="max-w-none"
            style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight, maxWidth: `${contentWidth}px`, margin: "0 auto" }}
          >
            {(chapter.content?.split('\n') || []).map((paragraph, index) => (
              paragraph.trim() && (
                <p key={index} className="mb-5 text-justify">
                  {paragraph}
                </p>
              )
            ))}
          </article>
        </div>

        {/* Mid-content Ad */}
        <AdInline />

        {/* Navigation Bottom */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {prevChapter ? (
            <Link
              to={`/chapter/${prevChapter.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Chương trước</span>
            </Link>
          ) : (
            <div className="w-24" />
          )}

          {novel && (
            <Link
              to={`/truyen/${novel.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Mục lục</span>
            </Link>
          )}

          {nextChapter ? (
            <Link
              to={`/chapter/${nextChapter.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <span className="hidden sm:inline">Chương tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="w-24" />
          )}
        </div>

        {/* Bottom Banner Ad */}
        <AdBanner type="large" className="mb-4" />

        {/* AI Recommended Products based on the novel */}
        <div className="mb-4">
          <ShopeeDeals novelTitle={novel?.title} />
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4">
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              Bình luận ({comments.length})
            </h3>
            
            {isAuthenticated ? (
              <form onSubmit={handleSubmitComment} className="mb-4 space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận của bạn về chương này..."
                  className="w-full p-3 bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Gửi bình luận
                </button>
              </form>
            ) : (
              <div className="text-center py-6 bg-secondary/30 rounded-lg mb-4 border border-border">
                <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm mb-3">
                  Đăng nhập để tham gia bình luận
                </p>
                <Link 
                  to="/login" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {comment.user?.avatar ? (
                        <img
                          src={comment.user.avatar}
                          alt={comment.user?.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {comment.user?.username || 'Ẩn danh'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
