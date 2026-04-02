import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, BookOpen, User, Clock, MessageSquare, ArrowRight, CheckCircle, Send, ChevronRight } from 'lucide-react';
import { novelAPI, commentAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, formatDate } from '../utils/helpers';

function NovelDetail() {
  const { slug } = useParams();
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
      const [novelRes, chaptersRes, commentsRes] = await Promise.all([
        novelAPI.getBySlug(slug),
        novelAPI.getChapters(slug, { limit: 50 }),
        commentAPI.getAll({ novelId: 'temp' })
      ]);

      setNovel(novelRes.data.novel);
      setChapters(chaptersRes.data.chapters || []);
      
      if (novelRes.data.novel?.id) {
        const commentsResponse = await commentAPI.getAll({ 
          novelId: novelRes.data.novel.id 
        });
        setComments(commentsResponse.data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching novel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !novel?.id) return;

    try {
      const response = await commentAPI.create({
        novelId: novel.id,
        content: newComment
      });
      
      setComments([response.data.comment, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Could not post comment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading novel...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Novel Not Found</h2>
          <p className="text-muted-foreground mb-6">The novel you&apos;re looking for doesn&apos;t exist.</p>
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

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground line-clamp-1">{novel.title}</span>
      </nav>

      {/* Novel Header */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cover */}
            <div className="w-full sm:w-56 flex-shrink-0 mx-auto lg:mx-0">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary">
                <img
                  src={novel.cover || '/default-cover.jpg'}
                  alt={novel.title}
                  className="w-full h-full object-cover"
                />
                {novel.status === 'completed' && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded-md flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Complete
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 text-balance">{novel.title}</h1>
              <p className="text-muted-foreground mb-6 line-clamp-4">{novel.description}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-xs">Author</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{novel.author}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs">Chapters</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{novel.totalChapters}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs">Views</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatNumber(novel.viewCount)}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Updated</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatDate(novel.updatedAt)}</p>
                </div>
              </div>

              {/* Genres */}
              {novel.Genres?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {novel.Genres.map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/the-loai/${genre.slug}`}
                      className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center gap-4 mb-6">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  novel.status === 'completed' 
                    ? 'bg-accent/10 text-accent' 
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {novel.status === 'completed' ? 'Completed' : 'Ongoing'}
                </span>
              </div>

              {/* Read Button */}
              {chapters.length > 0 && (
                <Link
                  to={`/truyen/${novel.slug}/chuong-1`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
                >
                  <BookOpen className="w-5 h-5" />
                  Start Reading
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'chapters'
                ? 'text-accent border-b-2 border-accent -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" />
              Chapters
            </span>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'comments'
                ? 'text-accent border-b-2 border-accent -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'chapters' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to={`/truyen/${novel.slug}/chuong-${chapter.chapterNumber}`}
                  className="group flex items-center justify-between p-4 hover:bg-secondary/50 rounded-lg border border-border hover:border-accent/50 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-1">
                      Chapter {chapter.chapterNumber}: {chapter.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 ml-4 text-xs text-muted-foreground">
                    <span className="hidden sm:flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {formatNumber(chapter.viewCount)}
                    </span>
                    <span className="whitespace-nowrap">{formatDate(chapter.createdAt)}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleSubmitComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this novel..."
                    className="w-full p-4 bg-secondary text-foreground placeholder:text-muted-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Post Comment
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 bg-secondary/30 rounded-lg border border-border">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Sign in to join the conversation
                  </p>
                  <Link 
                    to="/login" 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:bg-foreground/90 transition-colors"
                  >
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No comments yet. Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 p-4 bg-secondary/30 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {comment.user?.avatar ? (
                          <img
                            src={comment.user.avatar}
                            alt={comment.user?.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {comment.user?.username || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
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
  );
}

export default NovelDetail;
