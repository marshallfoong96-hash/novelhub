import { useState, useEffect, useLayoutEffect, useRef, Fragment, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { clearTtlCache } from "../lib/ttlCache";
import { HOME_DASHBOARD_CACHE_KEY } from "../lib/cacheKeys";
import { fetchChapterTocForNovel } from "../lib/fetchAllChapters";

import {
  Home, BookOpen, Settings, MessageSquare,
  Minus, Plus, ChevronLeft, ChevronRight,
  List, Send, ArrowRight, User, X
} from "lucide-react";
import AdSlot from "../components/AdSlot";
import LastReadChapterBadge from "../components/LastReadChapterBadge";
import ShopeeChapterGateModal from "../components/ShopeeChapterGateModal";
import {
  lastChapterStorageKey,
  isShopeeGateSessionConsumed,
  warmShopeeAffiliateForReader,
  preloadShopeeGateStickers,
} from "../lib/shopeeGate";
import { branding, getSticker } from "../lib/branding";
import {
  getCachedTocRows,
  setCachedTocRows,
  READER_CHAPTER_SELECT,
  READER_NOVEL_SELECT,
} from "../lib/readerTocSessionCache";
import { readLastReadChapterIdForNovel } from "../lib/memberStorage";
import { avatarImageUrl } from "../lib/coverImageUrl";

/**
 * Non-empty lines as paragraphs; insert attribution after index floor((n-1)/2) (~50%).
 */
function splitChapterParagraphs(content) {
  const paragraphs = (content ?? "").split("\n").map((p) => p.trim()).filter(Boolean);
  const n = paragraphs.length;
  if (n === 0) return { paragraphs: [], insertAfter: -1 };
  return { paragraphs, insertAfter: Math.floor((n - 1) / 2) };
}

const CHAPTER_BODY_CACHE_MAX = 10;

function chapterCacheTouch(map, row) {
  if (!row?.id) return;
  const k = Number(row.id);
  if (Number.isNaN(k)) return;
  if (map.has(k)) map.delete(k);
  map.set(k, row);
  while (map.size > CHAPTER_BODY_CACHE_MAX) {
    const first = map.keys().next().value;
    map.delete(first);
  }
}

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
  /** DOM-only progress bar — avoids setState on every scroll (major battery saver on mobile). */
  const readingProgressBarRef = useRef(null);
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  /** Mục lục: chương đọc gần nhất (theo `mi_reading_history`). */
  const [lastReadChapterIdForNovel, setLastReadChapterIdForNovel] = useState(null);
  const [showShopeeGate, setShowShopeeGate] = useState(false);
  const isAuthenticated = true;
  const READER_PREFS_KEY = "mi_reader_prefs";
  /** Tránh gọi RPC 2 lần trong React Strict Mode (cùng chapter). */
  const viewBumpDedupRef = useRef({ key: '', at: 0 });
  /** Tránh mở Shopee gate 2 lần (Strict Mode) cho cùng một chapter.id */
  const shopeeGateOpenedForChapterRef = useRef(null);
  /** LRU: chapter id → row (đọc liên tục / prefetch hàng xóm). */
  const chapterBodyCacheRef = useRef(new Map());
  /** Bỏ qua kết quả novel/mục lục nếu đã chuyển chương (fetch nền). */
  const novelTocFetchGenRef = useRef(0);
  const shopeeAssetsWarmRef = useRef(false);
  /** Tránh stale state khi vừa đổi URL — cùng truyện + đã có mục lục thì không gọi lại fetchAllChapters. */
  const readerNovelIdRef = useRef(null);
  const readerTocLengthRef = useRef(0);

  useEffect(() => {
    readerNovelIdRef.current = novel?.id != null ? Number(novel.id) : null;
  }, [novel?.id]);

  useEffect(() => {
    readerTocLengthRef.current = Array.isArray(allChapters) ? allChapters.length : 0;
  }, [allChapters]);

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const routeChapterIdNum = useMemo(() => {
    const n = parseInt(id, 10);
    return Number.isNaN(n) ? null : n;
  }, [id]);

  useEffect(() => {
    fetchChapter();
  }, [id]);

  /** Preconnect + prefetch Shopee affiliate + sticker ảnh modal — gate mở là đã sẵn sàng bấm. */
  useEffect(() => {
    if (!chapter) return;
    warmShopeeAffiliateForReader();
    if (!shopeeAssetsWarmRef.current) {
      shopeeAssetsWarmRef.current = true;
      preloadShopeeGateStickers(getSticker);
    }
  }, [chapter?.id]);

  /** Đổi chương hoặc mới vào từ trang truyện → về đầu trang ngay (trước khi vẽ). */
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [id]);

  /** Sau khi nội dung chương load xong — tránh layout ảnh kéo scroll lệch. */
  useEffect(() => {
    if (loading || !chapter) return;
    const t = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(t);
  }, [id, loading, chapter?.id]);

  /**
   * +1 `novels.view_count` mỗi lần mở đúng chương (anon / member).
   * Dùng `chapter.novel_id` — không chờ `novel` load (tránh effect không chạy nếu select novel lỗi / chậm).
   * Chỉ chạy khi đã fetch xong và `chapter.id` khớp URL (tránh state chương cũ).
   */
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || loading) return;
    if (!chapter?.id || chapter.novel_id == null) return;
    if (Number(chapter.id) !== Number(id)) return;

    const novelId = Number(chapter.novel_id);
    if (Number.isNaN(novelId)) return;

    const dedupKey = `${novelId}:${chapter.id}`;
    const now = Date.now();
    if (
      viewBumpDedupRef.current.key === dedupKey &&
      now - viewBumpDedupRef.current.at < 1600
    ) {
      return;
    }
    viewBumpDedupRef.current = { key: dedupKey, at: now };

    /** Tránh RPC view_count tranh tài nguyên với fetch chương — chờ paint xong. */
    let cancelled = false;
    const start = window.setTimeout(() => {
      if (cancelled) return;
      void (async () => {
      const { data: rpcData, error: rpcError } = await supabase.rpc('increment_novel_view_count', {
        p_novel_id: novelId
      });

      if (!rpcError && rpcData != null) {
        const next = typeof rpcData === 'number' ? rpcData : Number(rpcData);
        if (!Number.isNaN(next)) {
          setNovel((prev) => (prev ? { ...prev, view_count: next } : prev));
          clearTtlCache(HOME_DASHBOARD_CACHE_KEY);
          try {
            window.dispatchEvent(new CustomEvent('mitruyen:invalidate-home-cache'));
          } catch {
            /* ignore */
          }
          return;
        }
      }

      if (rpcError) {
        console.warn('[MiTruyen] increment_novel_view_count:', rpcError.message, rpcError);
      }

      const { data: fresh } = await supabase
        .from('novels')
        .select('view_count')
        .eq('id', novelId)
        .maybeSingle();
      const base = fresh?.view_count ?? 0;
      const next = base + 1;
      const { error: upError } = await supabase
        .from('novels')
        .update({ view_count: next })
        .eq('id', novelId);

      if (upError) {
        console.warn(
          '[MiTruyen] view_count không cập nhật được:',
          upError.message,
          '— chạy SQL `supabase/increment_novel_view_count.sql` trong Supabase (Dashboard → SQL).'
        );
        return;
      }
      setNovel((prev) => (prev ? { ...prev, view_count: next } : prev));
      clearTtlCache(HOME_DASHBOARD_CACHE_KEY);
      try {
        window.dispatchEvent(new CustomEvent('mitruyen:invalidate-home-cache'));
      } catch {
        /* ignore */
      }
      })();
    }, 48);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [loading, id, chapter?.id, chapter?.novel_id]);

  useEffect(() => {
    setShowComments(false);
  }, [id]);

  /**
   * Shopee gate: chỉ **một lần mỗi tab** — lần đầu đọc **tiến** tới chương số lớn hơn (cùng truyện, kể cả nhảy cóc).
   * Sau khi đóng / bấm CTA → không hiện nữa đến khi đóng tab (sessionStorage).
   */
  useEffect(() => {
    if (loading || !chapter) return;
    if (Number(chapter.id) !== Number(id)) return;
    if (chapter.novel_id == null) return;

    const novelId = Number(chapter.novel_id);
    if (Number.isNaN(novelId)) return;

    const n = Number(chapter.chapter_number);
    if (Number.isNaN(n)) return;

    const key = lastChapterStorageKey(novelId);
    let prev = null;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw != null && raw !== '') prev = Number(raw);
    } catch {
      /* ignore */
    }

    const isForwardInNovel =
      prev != null && !Number.isNaN(prev) && n > prev;

    if (!isForwardInNovel) {
      setShowShopeeGate(false);
      shopeeGateOpenedForChapterRef.current = null;
    } else if (!isShopeeGateSessionConsumed()) {
      if (shopeeGateOpenedForChapterRef.current !== chapter.id) {
        shopeeGateOpenedForChapterRef.current = chapter.id;
        setShowShopeeGate(true);
      }
    } else {
      setShowShopeeGate(false);
    }

    queueMicrotask(() => {
      try {
        sessionStorage.setItem(key, String(n));
      } catch {
        /* ignore */
      }
    });
  }, [loading, id, chapter?.id, chapter?.novel_id, chapter?.chapter_number]);

  useEffect(() => {
    if (!showTocDrawer) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showTocDrawer]);

  useEffect(() => {
    if (!showTocDrawer || !chapter?.id) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`toc-row-${chapter.id}`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(t);
  }, [showTocDrawer, chapter?.id]);

  useEffect(() => {
    if (novel?.id == null) {
      setLastReadChapterIdForNovel(null);
      return;
    }
    setLastReadChapterIdForNovel(readLastReadChapterIdForNovel(novel.id));
  }, [novel?.id]);

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
      setLastReadChapterIdForNovel(String(currentEntry.chapterId));
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
    let raf = 0;
    const tick = () => {
      const bar = readingProgressBarRef.current;
      if (!bar) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      bar.style.width = `${progress}%`;
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        tick();
      });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [id, loading, chapter?.id]);

  const fetchChapter = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const gen = ++novelTocFetchGenRef.current;
    const numId = parseInt(id, 10);
    if (Number.isNaN(numId)) {
      setChapter(null);
      setNovel(null);
      setAllChapters([]);
      setLoading(false);
      return;
    }

    const applyTocForNovel = async (novelIdForToc, g) => {
      const nid = Number(novelIdForToc);
      if (Number.isNaN(nid)) return;
      let sessionRows = getCachedTocRows(nid);
      if (sessionRows?.length) {
        if (g !== novelTocFetchGenRef.current) return;
        setAllChapters(sessionRows);
      }
      try {
        const chaptersData = await fetchChapterTocForNovel(supabase, nid);
        if (g !== novelTocFetchGenRef.current) return;
        const list = chaptersData || [];
        setAllChapters(list);
        setCachedTocRows(nid, list);
      } catch (chaptersError) {
        console.error("[v0] chapters list:", chaptersError);
        if (g === novelTocFetchGenRef.current && !sessionRows?.length) {
          setAllChapters([]);
        }
      }
    };

    const cached = chapterBodyCacheRef.current.get(numId);
    if (cached) {
      const nid = cached.novel_id;
      const tocReady =
        readerNovelIdRef.current != null &&
        nid != null &&
        Number(readerNovelIdRef.current) === Number(nid) &&
        readerTocLengthRef.current > 0;
      if (tocReady) {
        setChapter(cached);
        setLoading(false);
        return;
      }
      setChapter(cached);
      setLoading(false);
      if (nid != null) {
        void (async () => {
          try {
            const { data: novelData, error: novelError } = await supabase
              .from('novels')
              .select(READER_NOVEL_SELECT)
              .eq('id', nid)
              .single();
            if (gen !== novelTocFetchGenRef.current) return;
            if (!novelError && novelData) setNovel(novelData);
          } catch (e) {
            console.error('[v0] novel fetch:', e);
          }
          if (gen !== novelTocFetchGenRef.current) return;
          await applyTocForNovel(nid, gen);
        })();
      }
      return;
    }

    try {
      setLoading(true);

      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select(READER_CHAPTER_SELECT)
        .eq('id', numId)
        .single();

      if (chapterError || !chapterData) {
        console.error('[v0] Error fetching chapter:', chapterError);
        setChapter(null);
        setNovel(null);
        setAllChapters([]);
        setLoading(false);
        return;
      }

      chapterCacheTouch(chapterBodyCacheRef.current, chapterData);

      if (gen !== novelTocFetchGenRef.current) return;

      const novelId = chapterData.novel_id;
      const sameBookTocReady =
        readerNovelIdRef.current != null &&
        novelId != null &&
        Number(readerNovelIdRef.current) === Number(novelId) &&
        readerTocLengthRef.current > 0;

      if (sameBookTocReady) {
        setChapter(chapterData);
        setLoading(false);
        if (allChapters.length > 0 && novelId != null) {
          setCachedTocRows(novelId, allChapters);
        }
        return;
      }

      if (novel?.id != null && novelId != null && Number(novel.id) !== Number(novelId)) {
        setNovel(null);
        setAllChapters([]);
      }

      setChapter(chapterData);
      setLoading(false);

      if (novelId == null) return;

      void (async () => {
        try {
          const { data: novelData, error: novelError } = await supabase
            .from('novels')
            .select(READER_NOVEL_SELECT)
            .eq('id', novelId)
            .single();

          if (gen !== novelTocFetchGenRef.current) return;
          if (!novelError && novelData) {
            setNovel(novelData);
          }
        } catch (e) {
          console.error('[v0] novel fetch:', e);
        }

        if (gen !== novelTocFetchGenRef.current) return;
        await applyTocForNovel(novelId, gen);
      })();
    } catch (error) {
      console.error('[v0] Error fetching chapter:', error);
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

  /** Prefetch trước/sau — lần bấm Tiếp/Trước thường trúng LRU cache. */
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !chapter || loading) return;
    const ids = [prevChapter?.id, nextChapter?.id]
      .filter((x) => x != null)
      .map((x) => Number(x))
      .filter((n) => !Number.isNaN(n));
    for (const cid of ids) {
      if (chapterBodyCacheRef.current.has(cid)) continue;
      supabase
        .from('chapters')
        .select(READER_CHAPTER_SELECT)
        .eq('id', cid)
        .single()
        .then(({ data, error }) => {
          if (!error && data) chapterCacheTouch(chapterBodyCacheRef.current, data);
        });
    }
  }, [chapter?.id, prevChapter?.id, nextChapter?.id, loading]);

  if (loading && !chapter) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Đang tải chương...</p>
        </div>
      </div>
    );
  }

  const isStaleChapterView =
    Boolean(
      loading &&
        chapter &&
        routeChapterIdNum != null &&
        Number(chapter.id) !== routeChapterIdNum
    );

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
        ref={readingProgressBarRef}
        className="reading-progress"
        style={{ width: "0%" }}
        aria-hidden
      />

      <div className="max-w-4xl mx-auto min-w-0 w-full pb-24">
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
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Trước</span>
            </Link>
          ) : (
            <div className="w-20" />
          )}

          {novel && (
            <button
              type="button"
              onClick={() => setShowTocDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Mục lục</span>
            </button>
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Trước
              </Link>
            ) : (
              <span className="px-3 py-2 text-xs text-muted-foreground/50">Trước</span>
            )}
            {novel && (
              <button
                type="button"
                onClick={() => setShowTocDrawer(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-foreground border border-border bg-card hover:bg-secondary transition-colors"
              >
                <List className="w-3.5 h-3.5" />
                Mục lục
              </button>
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

        <AdSlot
          placement="chapterTop"
          compact
          className="mb-4"
          minHeightClass="min-h-[52px] sm:min-h-[60px]"
        />

        {/* Chapter Content — chặn copy/paste trên nội dung (không chặn toàn site; không phải DRM tuyệt đối). */}
        <div className="relative">
          {isStaleChapterView && (
            <div
              className="absolute inset-0 z-10 flex items-start justify-center pt-16 sm:pt-20 rounded-lg bg-background/55 backdrop-blur-[1px] pointer-events-none"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 shadow-md text-sm text-foreground">
                <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                Đang tải chương…
              </div>
            </div>
          )}
        <div
          className={`min-w-0 overflow-x-hidden border rounded-lg p-5 sm:p-6 md:p-8 transition-colors select-none [-webkit-touch-callout:none] ${themeClasses[readingTheme] || themeClasses.light}`}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <article
            className="w-full max-w-full select-none break-words [word-break:normal]"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight,
              maxWidth: `min(${contentWidth}px, 100%)`,
              margin: "0 auto",
            }}
          >
            {(() => {
              const { paragraphs, insertAfter } = splitChapterParagraphs(chapter.content);
              const bookTitle = novel?.title?.trim() || branding.siteName;
              const siteUrl = `https://${branding.domain}`;
              return paragraphs.map((paragraph, index) => (
                <Fragment key={index}>
                  <p className="mb-5 text-justify [hyphens:none]">{paragraph}</p>
                  {index === insertAfter && (
                    <p className="mb-5 break-words border-y border-border/70 py-3 text-center text-[0.85em] leading-relaxed text-muted-foreground [word-break:normal]">
                      —— Nguồn: 《{bookTitle}》 tại{" "}
                      <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-accent underline underline-offset-2 hover:opacity-90"
                      >
                        mitruyen.me
                      </a>
                      {" — Vui lòng ghi rõ nguồn khi chia sẻ hoặc đăng tải lại."}
                    </p>
                  )}
                </Fragment>
              ));
            })()}
          </article>
        </div>
        </div>

        <AdSlot placement="chapterBottom" className="mb-4" minHeightClass="min-h-[52px] sm:min-h-[60px]" />

        {/* Navigation Bottom */}
        <div className="flex items-center justify-between gap-3 mb-4">
          {prevChapter ? (
            <Link
              to={`/chapter/${prevChapter.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Chương trước</span>
            </Link>
          ) : (
            <div className="w-24" />
          )}

          {novel && (
            <button
              type="button"
              onClick={() => setShowTocDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:bg-secondary transition-colors"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Mục lục</span>
            </button>
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
                          src={avatarImageUrl(comment.user.avatar)}
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

      <ShopeeChapterGateModal open={showShopeeGate} onClose={() => setShowShopeeGate(false)} />

      {showTocDrawer && novel && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="toc-drawer-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowTocDrawer(false)}
            aria-label="Đóng mục lục"
          />
          <div className="relative mx-auto w-full max-w-lg rounded-t-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[min(75vh,560px)] motion-safe:animate-[reader-toc-up_0.22s_ease-out]">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
              <div className="min-w-0">
                <h2 id="toc-drawer-title" className="text-sm font-semibold text-foreground truncate">
                  Mục lục
                </h2>
                <p className="text-xs text-muted-foreground truncate">{novel.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTocDrawer(false)}
                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {allChapters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Chưa có danh sách chương.</p>
              ) : (
                <ul className="space-y-0.5">
                  {allChapters.map((ch) => {
                    const isCurrent = chapter && ch.id === chapter.id;
                    const isLastRead =
                      lastReadChapterIdForNovel != null &&
                      String(ch.id) === String(lastReadChapterIdForNovel);
                    return (
                      <li key={ch.id} id={`toc-row-${ch.id}`}>
                        <Link
                          to={`/chapter/${ch.id}`}
                          onClick={() => setShowTocDrawer(false)}
                          title={isLastRead ? "Chương đọc gần nhất" : undefined}
                          className={`block rounded-lg px-3 py-2.5 text-sm border transition-colors ${
                            isCurrent
                              ? "bg-accent/15 text-accent border-accent/40 font-medium"
                              : "border-transparent text-foreground hover:bg-secondary"
                          }`}
                        >
                          <span className="flex items-start gap-2 min-w-0">
                            {isLastRead ? <LastReadChapterBadge /> : null}
                            <span className="line-clamp-2 min-w-0 flex-1">
                              Chương {ch.chapter_number}
                              {ch.title ? `: ${ch.title}` : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
