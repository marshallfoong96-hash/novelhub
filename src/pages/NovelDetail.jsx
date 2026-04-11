import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Eye,
  BookOpen,
  User,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Send,
  ChevronRight,
  Heart,
  Bookmark,
  Tag,
  DollarSign,
  Sparkles,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, formatDate, normalizeAuthorLabel } from '../utils/helpers';
import AdSlot from '../components/AdSlot';
import NovelCard from '../components/NovelCard';
import DonateModal from '../components/DonateModal';
import { fetchAllChaptersForNovel } from '../lib/fetchAllChapters';

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
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [novelGenres, setNovelGenres] = useState([]);
  const [showDescExpanded, setShowDescExpanded] = useState(false);
  const [descNeedsToggle, setDescNeedsToggle] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const descBlockRef = useRef(null);
  const { isAuthenticated, user } = useAuth();

  const descriptionText = novel?.description != null ? String(novel.description).trim() : '';
  const authorLabel = normalizeAuthorLabel(novel?.author);

  useEffect(() => {
    fetchNovelData();
  }, [slug]);

  /** Vào trang giới thiệu truyện (từ danh sách / link) → luôn từ đầu trang. */
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  useEffect(() => {
    if (!novel?.id) return;
    try {
      const bookmarks = JSON.parse(localStorage.getItem('mi_bookmarks') || '[]');
      const favorites = JSON.parse(localStorage.getItem('mi_favorites') || '[]');
      const follows = JSON.parse(localStorage.getItem('mi_follows') || '[]');
      setIsBookmarked(Array.isArray(bookmarks) && bookmarks.includes(novel.id));
      setIsFavorited(Array.isArray(favorites) && favorites.includes(novel.id));
      setIsFollowing(Array.isArray(follows) && follows.includes(novel.id));
    } catch {
      setIsBookmarked(false);
      setIsFavorited(false);
      setIsFollowing(false);
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
    const id = novel.id;
    let b = JSON.parse(localStorage.getItem('mi_bookmarks') || '[]');
    if (!Array.isArray(b)) b = [];
    const next = b.includes(id) ? b.filter((x) => x !== id) : [...b, id];
    localStorage.setItem('mi_bookmarks', JSON.stringify(next));
    setIsBookmarked(next.includes(id));
    showNotice(next.includes(id) ? 'Đã đánh dấu truyện.' : 'Đã bỏ đánh dấu.');
  };

  const handleToggleFavorite = async () => {
    if (!novel?.id) return;
    const id = novel.id;
    let f = JSON.parse(localStorage.getItem('mi_favorites') || '[]');
    if (!Array.isArray(f)) f = [];
    const willFavorite = !f.includes(id);
    const next = willFavorite ? [...f, id] : f.filter((x) => x !== id);
    localStorage.setItem('mi_favorites', JSON.stringify(next));
    setIsFavorited(willFavorite);

    const currentLikes = Number(novel.likes || 0);
    const nextLikes = willFavorite ? currentLikes + 1 : Math.max(0, currentLikes - 1);
    setNovel((prev) => (prev ? { ...prev, likes: nextLikes } : prev));
    await supabase.from('novels').update({ likes: nextLikes }).eq('id', id);

    showNotice(willFavorite ? 'Đã thêm vào yêu thích.' : 'Đã bỏ yêu thích.');
  };

  const handleDonate = () => {
    setShowDonateModal(true);
  };

  const handleReportError = () => {
    if (!novel?.id) return;
    const subject = encodeURIComponent(`Báo lỗi — truyện #${novel.id}: ${novel.title}`);
    window.location.href = `mailto:contact@mitruyen.me?subject=${subject}`;
    showNotice('Đang mở email báo lỗi…');
  };

  const handleToggleFollow = async () => {
    if (!novel?.id) return;
    const id = novel.id;
    let list = JSON.parse(localStorage.getItem('mi_follows') || '[]');
    if (!Array.isArray(list)) list = [];
    const willFollow = !list.includes(id);
    const next = willFollow ? [...list, id] : list.filter((x) => x !== id);
    localStorage.setItem('mi_follows', JSON.stringify(next));
    setIsFollowing(willFollow);

    const delta = willFollow ? 1 : -1;
    const prevFc = Number(novel.follow_count ?? 0);
    const optimistic = Math.max(0, prevFc + delta);
    setNovel((p) => (p ? { ...p, follow_count: optimistic } : p)); // optimistic; RPC sẽ chỉnh lại nếu thành công

    const { data: rpcVal, error } = await supabase.rpc('adjust_novel_follow_count', {
      p_novel_id: id,
      p_delta: delta,
    });
    if (error) {
      console.warn('[NovelDetail] adjust_novel_follow_count:', error);
      showNotice(
        'Đã lưu theo dõi trên trình duyệt. Chạy SQL `add_novel_follow_count_and_rpc.sql` trên Supabase để lưu số người theo dõi chung.'
      );
      return;
    }
    if (rpcVal != null) {
      setNovel((p) => (p ? { ...p, follow_count: Number(rpcVal) } : p));
    }
    showNotice(willFollow ? 'Đã theo dõi truyện.' : 'Đã bỏ theo dõi.');
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

      const novelId = parseInt(slug, 10);

      /**
       * Chỉ dùng 2 truy vấn đơn: `novel_genres` → id, rồi `genres` → tên.
       * (Không embed `genres(...)` — tránh lỗi khi thiếu FK hoặc RLS lồng nhau.)
       * Nếu Table Editor có dữ liệu mà API trả 0 dòng: chạy `enable_novel_genres_public_read.sql` trên Supabase.
       */
      const { data: ngRows, error: ngErr } = await supabase
        .from('novel_genres')
        .select('genre_id')
        .eq('novel_id', novelId);
      if (ngErr) {
        console.error('[v0] novel_genres:', ngErr);
      }

      const genreIdSet = new Set();
      (ngRows || []).forEach((r) => {
        if (r.genre_id != null && r.genre_id !== '') genreIdSet.add(Number(r.genre_id));
      });
      if (novelData.genre_id != null && novelData.genre_id !== '') {
        genreIdSet.add(Number(novelData.genre_id));
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
          console.error('[v0] genres for novel:', genresLookupErr);
          setNovelGenres([]);
        } else {
          const byId = new Map((genreRows || []).map((g) => [Number(g.id), g]));
          const sorted = mergedGenreIds
            .map((gid) => {
              const g = byId.get(gid);
              if (g) return g;
              return { id: gid, name: `Thể loại #${gid}`, slug: null };
            })
            .sort((a, b) =>
              String(a.name || '').localeCompare(String(b.name || ''), 'vi')
            );
          setNovelGenres(sorted);
        }
      }

      let primaryGenreId = novelData?.genre_id || null;
      if (!primaryGenreId && ngRows?.[0]?.genre_id != null) {
        primaryGenreId = ngRows[0].genre_id;
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

      // Fetch chapters (nhiều hơn 1000 chương vẫn lấy đủ — xem fetchAllChaptersForNovel)
      try {
        const chaptersData = await fetchAllChaptersForNovel(supabase, parseInt(slug, 10), '*');
        setChapters(chaptersData || []);
      } catch (chaptersError) {
        console.error('[v0] Error fetching chapters:', chaptersError);
        setChapters([]);
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
    <>
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
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight text-balance leading-tight mb-4">
                    {novel.title}
                  </h1>

                  <dl className="mb-4 space-y-2 text-left text-sm">
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      <dt className="text-muted-foreground shrink-0">Cập nhật:</dt>
                      <dd className="min-w-0 text-foreground">
                        {formatDate(novel.updated_at || novel.created_at)}
                      </dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <dt className="text-muted-foreground shrink-0">Loại:</dt>
                      <dd>
                        <span className="inline-flex rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                          Truyện chữ
                        </span>
                      </dd>
                    </div>
                    {authorLabel ? (
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <dt className="text-muted-foreground shrink-0">Tác giả:</dt>
                        <dd className="min-w-0 text-foreground">{authorLabel}</dd>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                      <dt className="text-muted-foreground shrink-0 pt-0.5">
                        <Tag className="inline h-3.5 w-3.5 text-accent" aria-hidden /> Thể loại:
                      </dt>
                      <dd className="min-w-0 flex-1">
                        {novelGenres.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {novelGenres.map((g) => (
                              <Link
                                key={g.id}
                                to={genreBrowsePath(g)}
                                className="inline-flex items-center rounded border border-foreground/25 bg-background px-2 py-0.5 text-xs font-medium text-foreground transition hover:border-accent hover:text-accent"
                              >
                                {g.name != null && String(g.name).trim() !== ''
                                  ? g.name
                                  : `#${g.id}`}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      <dt className="text-muted-foreground shrink-0">Lượt xem:</dt>
                      <dd className="text-foreground">{formatNumber(novel.view_count || 0)}</dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <dt className="text-muted-foreground shrink-0">Yêu thích:</dt>
                      <dd className="inline-flex items-center gap-1 text-foreground">
                        <Heart className="h-3.5 w-3.5 text-accent" aria-hidden />
                        {formatNumber(novel.likes ?? 0)}
                      </dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <dt className="text-muted-foreground shrink-0">Lượt theo dõi:</dt>
                      <dd className="inline-flex items-center gap-1 text-foreground">
                        <Bell className="h-3.5 w-3.5 text-accent" aria-hidden />
                        {formatNumber(novel.follow_count ?? 0)}
                      </dd>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      <dt className="text-muted-foreground shrink-0">Số chương:</dt>
                      <dd className="text-foreground">{chapters.length}</dd>
                    </div>
                    {novel.status && (
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <dt className="text-muted-foreground shrink-0">Trạng thái:</dt>
                        <dd className="text-foreground">
                          {novel.status === 'completed' ? 'Đã đủ bộ' : 'Đang tiến hành'}
                        </dd>
                      </div>
                    )}
                  </dl>

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

                  <div className="mt-auto flex w-full flex-col gap-2 pt-2">
                    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                      {continueChapterId && (
                        <Link
                          to={`/chapter/${continueChapterId}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--success))] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                          <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                          Tiếp tục đọc
                        </Link>
                      )}
                      {chapters.length > 0 && (
                        <Link
                          to={`/chapter/${chapters[0].id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-500"
                        >
                          <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                          Đọc từ đầu
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleToggleBookmark}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                          isBookmarked
                            ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                            : 'border-2 border-blue-600 bg-background text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
                        {isBookmarked ? 'Đã đánh dấu' : 'Đánh dấu'}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleFavorite}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                          isFavorited
                            ? 'border-2 border-red-500 bg-red-500 text-white shadow-sm hover:bg-red-600'
                            : 'border-2 border-red-500 bg-background text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                      >
                        <Heart className="h-4 w-4 shrink-0" aria-hidden />
                        {isFavorited ? 'Đã yêu thích' : 'Yêu thích'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDonate}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                      >
                        <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
                        Ủng hộ
                      </button>
                      {chapters.length > 0 && (
                        <Link
                          to={`/chapter/${chapters[chapters.length - 1].id}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                          Đọc chương mới nhất
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={handleToggleFollow}
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                          isFollowing
                            ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                            : 'border-2 border-blue-600 bg-background text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                        }`}
                      >
                        <Bell className="h-4 w-4 shrink-0" aria-hidden />
                        {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start">
                      <button
                        type="button"
                        onClick={handleReportError}
                        className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                        Báo lỗi
                      </button>
                    </div>
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
              <div className="novel-feed-grid">
                {relatedNovels.map((item) => (
                  <NovelCard key={item.id} novel={item} showStatus variant="webtoon" />
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
    <DonateModal open={showDonateModal} onClose={() => setShowDonateModal(false)} />
    </>
  );
}

export default NovelDetail;
