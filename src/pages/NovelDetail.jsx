import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, BookOpen, User, Clock, MessageSquare, ArrowRight, CheckCircle, Send, ChevronRight, Heart, Share2, Bookmark, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, formatDate } from '../utils/helpers';
import AdSlot from '../components/AdSlot';

function genreBrowsePath(g) {
  if (g.slug != null && String(g.slug).trim() !== '') {
    return `/the-loai/${encodeURIComponent(String(g.slug).trim())}`;
  }
  return `/the-loai/${g.id}`;
}

function NovelDetail() {
  const { slug } = useParams(); // This is now the novel ID
  const [novel, setNovel] = useState(null);
  const [relatedNovels, setRelatedNovels] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chapters');
  const [continueChapterId, setContinueChapterId] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [novelGenres, setNovelGenres] = useState([]);
  const [showDescExpanded, setShowDescExpanded] = useState(false);
  const [descNeedsToggle, setDescNeedsToggle] = useState(false);
  const descBlockRef = useRef(null);
  const { isAuthenticated, user } = useAuth();

  const descriptionText = novel?.description != null ? String(novel.description).trim() : '';

  useEffect(() => {
    fetchNovelData();
  }, [slug]);

  useEffect(() => {
    if (!novel?.id) return;
    try {
      const bookmarks = JSON.parse(localStorage.getItem('mi_bookmarks') || '[]');
      const favorites = JSON.parse(localStorage.getItem('mi_favorites') || '[]');
      setIsBookmarked(Array.isArray(bookmarks) && bookmarks.includes(novel.id));
      setIsFavorited(Array.isArray(favorites) && favorites.includes(novel.id));
    } catch {
      setIsBookmarked(false);
      setIsFavorited(false);
    }
  }, [novel?.id]);

  useEffect(() => {
    if (!novel?.id) {
      setContinueChapterId(null);
      return;
    }
    try {
      const raw = localStorage.getItem('mi_reading_history');
      const history = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(history) ? history : [];
      const match = rows.find((item) => String(item.novelId) === String(novel.id));
      setContinueChapterId(match?.chapterId || null);
    } catch {
      setContinueChapterId(null);
    }
  }, [novel?.id]);

  useEffect(() => {
    setShowDescExpanded(false);
  }, [slug]);

  useLayoutEffect(() => {
    if (!descriptionText || showDescExpanded) {
      setDescNeedsToggle(false);
      return;
    }
    const measure = () => {
      const el = descBlockRef.current;
      if (!el) return;
      setDescNeedsToggle(el.scrollHeight > el.clientHeight + 2);
    };
    const id = window.requestAnimationFrame(() => {
      measure();
      window.requestAnimationFrame(measure);
    });
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      if (descBlockRef.current) ro.observe(descBlockRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(id);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [descriptionText, showDescExpanded, slug]);

  const showDescToggle =
    !!descriptionText &&
    (showDescExpanded || descNeedsToggle || descriptionText.length > 120);

  const showNotice = (text) => {
    setActionNotice(text);
    window.setTimeout(() => setActionNotice(''), 1500);
  };

  const handleToggleBookmark = () => {
    if (!novel?.id) return;
    const current = JSON.parse(localStorage.getItem('mi_bookmarks') || '[]');
    const rows = Array.isArray(current) ? current : [];
    const next = rows.includes(novel.id) ? rows.filter((id) => id !== novel.id) : [...rows, novel.id];
    localStorage.setItem('mi_bookmarks', JSON.stringify(next));
    const nextState = next.includes(novel.id);
    setIsBookmarked(nextState);
    showNotice(nextState ? 'Da danh dau truyen.' : 'Da bo danh dau.');
  };

  const handleToggleFavorite = async () => {
    if (!novel?.id) return;
    const current = JSON.parse(localStorage.getItem('mi_favorites') || '[]');
    const rows = Array.isArray(current) ? current : [];
    const next = rows.includes(novel.id) ? rows.filter((id) => id !== novel.id) : [...rows, novel.id];
    localStorage.setItem('mi_favorites', JSON.stringify(next));
    const nextState = next.includes(novel.id);
    setIsFavorited(nextState);
    showNotice(nextState ? 'Da them vao yeu thich.' : 'Da bo yeu thich.');

    const currentLikes = Number(novel.likes || 0);
    const nextLikes = nextState ? currentLikes + 1 : Math.max(currentLikes - 1, 0);
    setNovel((prev) => (prev ? { ...prev, likes: nextLikes } : prev));
    await supabase
      .from('novels')
      .update({ likes: nextLikes })
      .eq('id', novel.id);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: novel?.title || 'Mi Truyen',
          text: `Doc truyện: ${novel?.title || ''}`,
          url: shareUrl
        });
        showNotice('Da chia se.');
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      showNotice('Da copy link truyen.');
    } catch {
      showNotice('Khong the chia se luc nay.');
    }
  };

  const fetchNovelData = async () => {
    try {
      setLoading(true);
      
      // Fetch novel by ID
      const { data: novelData, error: novelError } = await supabase
        .from('novels')
        .select('*')
        .eq('id', parseInt(slug))
        .single();

      if (novelError) {
        console.error('[v0] Error fetching novel:', novelError);
        setNovel(null);
        setNovelGenres([]);
        return;
      }

      setNovel(novelData);

      const novelId = parseInt(slug);
      const genreIdSet = new Set();
      if (novelData.genre_id != null && novelData.genre_id !== '') {
        genreIdSet.add(Number(novelData.genre_id));
      }
      const { data: ngAll, error: ngAllErr } = await supabase
        .from('novel_genres')
        .select('genre_id')
        .eq('novel_id', novelId);
      if (!ngAllErr && ngAll) {
        ngAll.forEach((row) => genreIdSet.add(Number(row.genre_id)));
      }
      const mergedGenreIds = [...genreIdSet];
      if (mergedGenreIds.length === 0) {
        setNovelGenres([]);
      } else {
        const { data: genreRows, error: genresLookupErr } = await supabase
          .from('genres')
          .select('id,name,slug')
          .in('id', mergedGenreIds);
        if (genresLookupErr) {
          console.error('[v0] Error fetching genres for novel:', genresLookupErr);
          setNovelGenres([]);
        } else {
          const sorted = (genreRows || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
          setNovelGenres(sorted);
        }
      }

      let primaryGenreId = novelData?.genre_id || null;
      if (!primaryGenreId && !ngAllErr && ngAll?.[0]?.genre_id) {
        primaryGenreId = ngAll[0].genre_id;
      }

      if (primaryGenreId) {
        const merged = new Set();
        const { data: junctionRows, error: junctionError } = await supabase
          .from('novel_genres')
          .select('novel_id')
          .eq('genre_id', primaryGenreId);
        if (!junctionError && junctionRows) {
          junctionRows.forEach((row) => merged.add(row.novel_id));
        }
        const { data: directRows } = await supabase
          .from('novels')
          .select('id')
          .eq('genre_id', primaryGenreId);
        (directRows || []).forEach((row) => merged.add(row.id));
        merged.delete(novelId);
        const candidateIds = [...merged];
        if (candidateIds.length === 0) {
          setRelatedNovels([]);
        } else {
          const capped = candidateIds.slice(0, 48);
          const { data: relatedRows } = await supabase
            .from('novels')
            .select('*')
            .in('id', capped);
          const rows = relatedRows || [];
          rows.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
          setRelatedNovels(rows.slice(0, 6));
        }
      } else {
        setRelatedNovels([]);
      }

      // Fetch chapters for this novel
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('novel_id', parseInt(slug))
        .order('chapter_number', { ascending: true });

      if (chaptersError) {
        console.error('[v0] Error fetching chapters:', chaptersError);
      } else {
        setChapters(chaptersData || []);
      }

    } catch (error) {
      console.error('[v0] Error fetching novel data:', error);
      setNovelGenres([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !novel?.id) return;

    // For now, just add to local state (comments table not in schema)
    const mockComment = {
      id: Date.now(),
      content: newComment,
      createdAt: new Date().toISOString(),
      user: { username: user?.username || 'You' }
    };
    
    setComments([mockComment, ...comments]);
    setNewComment('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Đang tải truyện...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Không tìm thấy truyện</h2>
          <p className="text-muted-foreground text-sm mb-6">Truyện bạn đang tìm không tồn tại.</p>
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground line-clamp-1">{novel.title}</span>
      </nav>

      <div className="max-w-5xl mx-auto space-y-6">
          {/* Novel intro — clear hierarchy like listing sites */}
          <div className="rounded-2xl border border-border bg-gradient-to-b from-accent/[0.08] via-card to-card shadow-sm overflow-hidden">
            <div className="p-5 sm:p-8">
              <div className="flex flex-col md:flex-row gap-8 md:gap-10">
                <div className="w-44 sm:w-48 md:w-52 flex-shrink-0 mx-auto md:mx-0">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary shadow-md ring-1 ring-border/60">
                    <img
                      src={novel.cover_url || '/default-cover.jpg'}
                      alt={novel.title}
                      className="w-full h-full object-contain"
                    />
                    {novel.status === 'completed' && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-[hsl(var(--success))] text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-sm">
                        <CheckCircle className="w-3 h-3" />
                        FULL
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-center md:text-left flex flex-col">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight text-balance leading-tight mb-2">
                    {novel.title}
                  </h1>

                  {descriptionText ? (
                    <div className="mb-4">
                      <div
                        ref={descBlockRef}
                        className={`text-[15px] sm:text-base leading-relaxed text-muted-foreground whitespace-pre-wrap ${
                          !showDescExpanded ? 'line-clamp-5' : ''
                        }`}
                      >
                        {descriptionText}
                      </div>
                      {showDescToggle && (
                        <button
                          type="button"
                          onClick={() => setShowDescExpanded((v) => !v)}
                          className="mt-2 text-sm font-semibold text-accent hover:underline underline-offset-2"
                        >
                          {showDescExpanded ? 'Thu gọn' : 'Xem thêm'}
                        </button>
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground max-w-full">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{novel.author || 'Đang cập nhật'}</span>
                    </span>
                    {novel.status && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                          novel.status === 'completed'
                            ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                            : 'bg-accent/12 text-accent'
                        }`}
                      >
                        {novel.status === 'completed' ? 'Hoàn thành' : 'Đang tiến hành'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground">
                      <BookOpen className="w-3.5 h-3.5" />
                      {chapters.length} chương
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground">
                      <Eye className="w-3.5 h-3.5" />
                      {formatNumber(novel.view_count || 0)} lượt xem
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/80 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(novel.created_at)}
                    </span>
                  </div>

                  {novelGenres.length > 0 && (
                    <div className="mb-4 text-center md:text-left">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        <Tag className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden />
                        Thể loại
                      </div>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                        {novelGenres.map((g) => (
                          <Link
                            key={g.id}
                            to={genreBrowsePath(g)}
                            className="inline-flex items-center rounded-full border border-accent/35 bg-accent/[0.08] px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/15 hover:border-accent/55"
                          >
                            {g.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-auto pt-1">
                    {continueChapterId && (
                      <Link
                        to={`/chapter/${continueChapterId}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[hsl(var(--success))] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-colors shadow-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        Tiếp tục đọc
                      </Link>
                    )}
                    {chapters.length > 0 && (
                      <Link
                        to={`/chapter/${chapters[0].id}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        Đọc từ đầu
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleToggleBookmark}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                        isBookmarked
                          ? 'border-accent text-accent bg-accent/10 hover:bg-accent/15'
                          : 'border-border text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      {isBookmarked ? 'Da danh dau' : 'Đánh dấu'}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${
                        isFavorited
                          ? 'border-accent text-accent bg-accent/10 hover:bg-accent/15'
                          : 'border-border text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      {isFavorited ? 'Da yeu thich' : 'Yêu thích'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 px-3 py-2.5 border border-border text-muted-foreground rounded-xl text-sm hover:bg-secondary transition-colors"
                      aria-label="Chia sẻ"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  {actionNotice && (
                    <p className="mt-3 text-xs text-accent">{actionNotice}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <AdSlot placement="detail" className="py-2" />

          {relatedNovels.length > 0 && (
            <section className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">Cùng thể loại</h3>
                <Link to="/#the-loai-grid" className="text-xs text-accent hover:underline">Xem thể loại</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {relatedNovels.map((item) => (
                  <Link key={item.id} to={`/truyen/${item.id}`} className="group">
                    <div className="aspect-[2/3] rounded overflow-hidden bg-secondary mb-1.5">
                      <img
                        src={item.cover_url || '/default-cover.jpg'}
                        alt={item.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <p className="text-xs text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                      {item.title}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tabs */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('chapters')}
                className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'chapters'
                    ? 'text-accent border-b-2 border-accent -mb-px bg-accent/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Danh sách chương ({chapters.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`flex-1 sm:flex-none px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'comments'
                    ? 'text-accent border-b-2 border-accent -mb-px bg-accent/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Bình luận ({comments.length})
                </span>
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'chapters' ? (
                chapters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {chapters.map((chapter) => (
                      <Link
                        key={chapter.id}
                        to={`/chapter/${chapter.id}`}
                        className="group flex items-center justify-between p-3 hover:bg-secondary/50 rounded-lg border border-border hover:border-accent/30 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                            Chương {chapter.chapter_number}: {chapter.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 ml-3 text-xs text-muted-foreground">
                          <span className="whitespace-nowrap">{formatDate(chapter.created_at)}</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Chưa có chương nào được đăng.</p>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {/* Comment Form */}
                  {isAuthenticated ? (
                    <form onSubmit={handleSubmitComment} className="space-y-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Chia sẻ suy nghĩ của bạn về truyện này..."
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
                    <div className="text-center py-6 bg-secondary/30 rounded-lg border border-border">
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

                  {/* Comments List */}
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
                                className="w-full h-full object-contain"
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
          </div>
      </div>
    </div>
  );
}

export default NovelDetail;
