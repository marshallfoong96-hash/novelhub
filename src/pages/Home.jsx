import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Flame, Clock, TrendingUp, Eye, ChevronRight, Users, BookOpen } from 'lucide-react';
import { novelAPI, genreAPI } from '../api/services';
import NovelCard from '../components/NovelCard';
import { formatNumber, formatDate } from '../utils/helpers';

function Home() {
  const [featuredNovels, setFeaturedNovels] = useState([]);
  const [hotNovels, setHotNovels] = useState([]);
  const [newUpdates, setNewUpdates] = useState([]);
  const [rankings, setRankings] = useState({ day: [], week: [], month: [] });
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRankTab, setActiveRankTab] = useState('day');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [hotRes, updatesRes, genresRes] = await Promise.all([
        novelAPI.getHot({ period: 'month', limit: 6 }),
        novelAPI.getRecentUpdates({ limit: 8 }),
        genreAPI.getAll()
      ]);

      setHotNovels(hotRes.data.novels || []);
      setNewUpdates(updatesRes.data.novels || []);
      setGenres(genresRes.data.genres || []);

      // Fetch rankings for different periods
      const [dayRes, weekRes, monthRes] = await Promise.all([
        novelAPI.getHot({ period: 'day', limit: 10 }),
        novelAPI.getHot({ period: 'week', limit: 10 }),
        novelAPI.getHot({ period: 'month', limit: 10 })
      ]);

      setRankings({
        day: dayRes.data.novels || [],
        week: weekRes.data.novels || [],
        month: monthRes.data.novels || []
      });

      // Use first 3 hot novels as featured
      setFeaturedNovels(hotRes.data.novels?.slice(0, 3) || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Featured Section */}
      {featuredNovels.length > 0 && <FeaturedSection novels={featuredNovels} />}

      {/* Hot Novels */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">TRUYỆN HOT THÁNG NÀY</h2>
          </div>
          <Link to="/hot" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
            Xem thêm <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {hotNovels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* New Updates */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-bold text-gray-900">TRUYỆN MỚI CẬP NHẬT</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {newUpdates.map((novel) => (
                <div key={novel.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <Link to={`/truyen/${novel.slug}`}>
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={novel.cover || '/default-cover.jpg'}
                        alt={novel.title}
                        className="w-full h-full object-cover"
                      />
                      {novel.status === 'completed' && (
                        <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                          FULL
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <Link to={`/truyen/${novel.slug}`}>
                      <h3 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1 hover:text-blue-500">
                        {novel.title}
                      </h3>
                    </Link>
                    {novel.chapters?.[0] && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <Link 
                          to={`/truyen/${novel.slug}/chuong-${novel.chapters[0].chapterNumber}`}
                          className="text-blue-500 hover:underline"
                        >
                          {novel.chapters[0].title}
                        </Link>
                        <span>{formatDate(novel.chapters[0].createdAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Genres */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-gray-900">THỂ LOẠI</h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/the-loai/${genre.slug}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    {genre.name}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column - Rankings */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-900">BẢNG XẾP HẠNG</h3>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b">
              {['day', 'week', 'month'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveRankTab(tab)}
                  className={`flex-1 py-2 text-xs font-medium capitalize ${
                    activeRankTab === tab
                      ? 'text-blue-500 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'day' ? 'Ngày' : tab === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>

            {/* Ranking List */}
            <div className="divide-y">
              {rankings[activeRankTab]?.map((novel, index) => (
                <Link
                  key={novel.id}
                  to={`/truyen/${novel.slug}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                    index < 3 
                      ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {novel.title}
                    </h4>
                    <p className="text-xs text-gray-500">{novel.totalChapters} chương</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye className="w-3 h-3" />
                    {formatNumber(novel.viewCount)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Featured Section Component
function FeaturedSection({ novels }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!novels.length) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold text-gray-900">ĐỀ CỬ HÔM NAY</h2>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Featured Novel */}
          <div className="p-6 flex gap-4">
            <img
              src={novels[currentSlide]?.cover}
              alt={novels[currentSlide]?.title}
              className="w-32 h-48 object-cover rounded-lg shadow-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 line-clamp-2 mb-2">
                {novels[currentSlide]?.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {novels[currentSlide]?.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Users className="w-4 h-4" />
                <span>{novels[currentSlide]?.author}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatNumber(novels[currentSlide]?.viewCount)}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {novels[currentSlide]?.totalChapters} chương
                </span>
              </div>
            </div>
          </div>

          {/* Side List */}
          <div className="border-t md:border-t-0 md:border-l border-gray-100">
            {novels.map((novel, index) => (
              <button
                key={novel.id}
                onClick={() => setCurrentSlide(index)}
                className={`w-full p-4 text-left flex gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  index === currentSlide ? 'bg-blue-50' : ''
                }`}
              >
                <img
                  src={novel.cover}
                  alt={novel.title}
                  className="w-16 h-24 object-cover rounded flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm line-clamp-2 mb-1 ${
                    index === currentSlide ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {novel.title}
                  </h4>
                  <p className="text-xs text-gray-500">{novel.author}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 p-4">
          {novels.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;
