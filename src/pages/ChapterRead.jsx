import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, List, MessageSquare } from 'lucide-react';
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
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchChapter();
  }, [slug, chapterNumber]);

  const fetchChapter = async () => {
    try {
      setLoading(true);
      const response = await novelAPI.getChapter(slug, chapterNumber);
      setChapter(response.data.chapter);
      
      // Fetch comments for this chapter
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
      alert('Không thể đăng bình luận. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-gray-600">Không tìm thấy chương</h2>
        <Link to={`/truyen/${slug}`} className="text-blue-500 hover:underline mt-4 inline-block">
          Quay lại trang truyện
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Chapter Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between">
          <Link 
            to={`/truyen/${slug}`}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">{chapter.novel?.title}</span>
          </Link>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-500"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Bình luận ({comments.length})</span>
          </button>
        </div>
        <h1 className="text-xl font-bold text-center mt-4">
          Chương {chapter.chapterNumber}: {chapter.title}
        </h1>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {chapter.prevChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.prevChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Chương trước</span>
          </Link>
        ) : (
          <div></div>
        )}

        <Link
          to={`/truyen/${slug}`}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <List className="w-5 h-5" />
          <span className="hidden sm:inline">Danh sách</span>
        </Link>

        {chapter.nextChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.nextChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <span className="hidden sm:inline">Chương sau</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        ) : (
          <div></div>
        )}
      </div>

      {/* Chapter Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="prose prose-lg max-w-none">
          {chapter.content.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-800 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Navigation Bottom */}
      <div className="flex items-center justify-between gap-4 mt-4">
        {chapter.prevChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.prevChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Chương trước</span>
          </Link>
        ) : (
          <div></div>
        )}

        <Link
          to={`/truyen/${slug}`}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <List className="w-5 h-5" />
          <span className="hidden sm:inline">Danh sách</span>
        </Link>

        {chapter.nextChapter ? (
          <Link
            to={`/truyen/${slug}/chuong-${chapter.nextChapter.chapterNumber}`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <span className="hidden sm:inline">Chương sau</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        ) : (
          <div></div>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
          <h3 className="text-lg font-bold mb-4">Bình luận ({comments.length})</h3>
          
          {isAuthenticated ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận của bạn..."
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                type="submit"
                className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                Đăng bình luận
              </button>
            </form>
          ) : (
            <div className="text-center py-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-gray-600">
                Vui lòng{' '}
                <Link to="/login" className="text-blue-500 hover:underline">
                  đăng nhập
                </Link>{' '}
                để bình luận
              </p>
            </div>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
                <img
                  src={comment.user?.avatar || '/default-avatar.png'}
                  alt={comment.user?.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {comment.user?.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChapterRead;
