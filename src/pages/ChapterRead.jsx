import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, List, MessageSquare, User, Send, ArrowRight, Settings, Minus, Plus } from 'lucide-react';
import { novelAPI, commentAPI } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/helpers';

function ChapterRead() {
  const { slug, chapterNumber } = useParams();
  const [chapter, setChapter] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchChapter();
  }, [slug, chapterNumber]);

  const fetchChapter = async () => {
    try {
      setLoading(true);
      const response = await novelAPI.getChapter(slug, chapterNumber);
      setChapter(response.data.chapter);
      
      if (response.data.chapter?.id) {
        const commentsRes = await commentAPI.getAll({
          novelId: response.data.chapter.novelId,
          chapterId: response.data.chapter.id
        });
        setComments(commentsRes.data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !chapter) return;

    try {
      const response = await commentAPI.create({
        novelId: chapter.novelId,
        chapterId: chapter.id,
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
          <p className="text-muted-foreground text-sm">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">Chapter Not Found</h2>
          <p className="text-muted-foreground mb-6">This chapter doesn&apos;t exist or has been removed.</p>
          <Link 
            to={`/truyen/${slug}`} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
          >
            Back to Novel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Chapter Header */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <Link 
            to={`/truyen/${slug}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium line-clamp-1">{chapter.novel?.title}</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              aria-label="Reading settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showComments ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">{comments.length}</span>
            </button>
          </div>
        </div>
        
        <h1 className="text-xl font-bold text-foreground text-center mt-4 text-balance">
          Chapter {chapter.chapterNumber}: {chapter.title}
        </h1>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground">Font Size:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                  className="p-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  aria-label="Decrease font size"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground w-8 text-center">{fontSize}</span>
                <button
                  onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                  className="p-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  aria-label="Increase font size"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {chapter.prevChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.prevChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Previous</span>
          </Link>
        ) : (
          <div className="w-24" />
        )}

        <Link
          to={`/truyen/${slug}`}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
        >
          <List className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">Chapters</span>
        </Link>

        {chapter.nextChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.nextChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <span className="hidden sm:inline text-sm">Next</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        ) : (
          <div className="w-24" />
        )}
      </div>

      {/* Chapter Content */}
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 md:p-10">
        <div 
          className="max-w-none text-foreground leading-relaxed"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        >
          {chapter.content.split('\n').map((paragraph, index) => (
            paragraph.trim() && (
              <p key={index} className="mb-6">
                {paragraph}
              </p>
            )
          ))}
        </div>
      </div>

      {/* Navigation Bottom */}
      <div className="flex items-center justify-between gap-4 mt-6">
        {chapter.prevChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.prevChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Previous</span>
          </Link>
        ) : (
          <div className="w-24" />
        )}

        <Link
          to={`/truyen/${slug}`}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
        >
          <List className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">Chapters</span>
        </Link>

        {chapter.nextChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.nextChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
          >
            <span className="hidden sm:inline text-sm">Next</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        ) : (
          <div className="w-24" />
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            Comments ({comments.length})
          </h3>
          
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="mb-6 space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this chapter..."
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
            <div className="text-center py-8 bg-secondary/30 rounded-lg mb-6 border border-border">
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
  );
}

export default ChapterRead;
