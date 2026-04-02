import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, BookOpen, User, Clock, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
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
        commentAPI.getAll({ novelId: 'temp' }) // Will need actual novel ID
      ]);

      setNovel(novelRes.data.novel);
      setChapters(chaptersRes.data.chapters || []);
      
      // Fetch comments with actual novel ID
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

  if (!novel) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-gray-600">Không tìm thấy truyện</h2>
        <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Novel Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover */}
            <div className="w-full md:w-48 flex-shrink-0">
              <img
                src={novel.cover || '/default-cover.jpg'}
                alt={novel.title}
                className="w-full aspect-[2/3] object-cover rounded-lg shadow-md"
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{novel.title}</h1>
              <p className="text-gray-600 mb-4">{novel.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{novel.author}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span>{novel.totalChapters} chương</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(novel.viewCount)} lượt xem</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(novel.updatedAt)}</span>
                </div>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-4">
                {novel.Genres?.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/the-loai/${genre.slug}`}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  novel.status === 'completed' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {novel.status === 'completed' ? 'Đã hoàn thành' : 'Đang cập nhật'}
                </span>
              </div>

              {/* Read Button */}
              {chapters.length > 0 && (
                <div className="mt-6">
                  <Link
                    to={`/truyen/${novel.slug}/chuong-1`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                  >
                    <BookOpen className="w-5 h-5" />
                    Đọc từ đầu
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'chapters'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Danh sách chương
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === 'comments'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bình luận ({comments.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'chapters' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to={`/truyen/${novel.slug}/chuong-${chapter.chapterNumber}`}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      Chương {chapter.chapterNumber}: {chapter.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatNumber(chapter.viewCount)}
                    </span>
                    <span>{formatDate(chapter.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Comment Form */}
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
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">
                    Vui lòng{' '}
                    <Link to="/login" className="text-blue-500 hover:underline">
                      đăng nhập
                    </Link>{' '}
                    để bình luận
                  </p>
                </div>
              )}

              {/* Comments List */}
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
      </div>
    </div>
  );
}

export default NovelDetail;
