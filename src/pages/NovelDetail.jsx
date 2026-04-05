import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, BookOpen, User, Clock, MessageSquare, ArrowRight, CheckCircle, Send, ChevronRight, Heart, Share2, Bookmark } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, formatDate } from '../utils/helpers';
import { AdBanner, AdSidebar, AdInline, ShopeeDeals } from '../components/AdSpace';

function NovelDetail() {
  const { slug } = useParams(); // This is now the novel ID
  const [novel, setNovel] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chapters');
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    fetchNovelData();
  }, [slug]);

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
        return;
      }

      setNovel(novelData);

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
      {/* Top Banner Ad */}
      <AdBanner type="leaderboard" className="hidden md:flex" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Trang chủ</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground line-clamp-1">{novel.title}</span>
      </nav>

      {/* Main Content with Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Novel Header */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Cover */}
                <div className="w-40 flex-shrink-0 mx-auto sm:mx-0">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={novel.cover_url || '/default-cover.jpg'}
                      alt={novel.title}
                      className="w-full h-full object-contain"
                    />
                    {novel.status === 'completed' && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 bg-[hsl(var(--success))] text-white text-[10px] font-bold rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        FULL
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 text-balance">{novel.title}</h1>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{novel.description}</p>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{novel.author || 'Đang cập nhật'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>{chapters.length} chương</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>{formatNumber(novel.view_count || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(novel.created_at)}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {novel.status && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mb-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        novel.status === 'completed' 
                          ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' 
                          : 'bg-accent/10 text-accent'
                      }`}>
                        {novel.status === 'completed' ? 'Hoàn thành' : 'Đang tiến hành'}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    {chapters.length > 0 && (
                      <Link
                        to={`/chapter/${chapters[0].id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                      >
                        <BookOpen className="w-4 h-4" />
                        Đọc từ đầu
                      </Link>
                    )}
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                      <Bookmark className="w-4 h-4" />
                      Đánh dấu
                    </button>
                    <button className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
                      <Heart className="w-4 h-4" />
                      Yêu thích
                    </button>
                    <button className="inline-flex items-center gap-2 px-3 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:bg-secondary transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Ad */}
          <AdInline />

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

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <ShopeeDeals novelTitle={novel.title} />
          <AdSidebar />
        </aside>
      </div>
    </div>
  );
}

export default NovelDetail;
