import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  TrendingUp, 
  Eye, 
  ChevronRight, 
  BookOpen, 
  Zap,
  PenTool,
  ArrowRight,
  Star,
  Crown,
  CheckCircle,
  BookMarked,
  History,
  Heart
} from 'lucide-react';

import NovelCard from '../components/NovelCard';
import { AdBanner, AdSidebar, ShopeeDeals, AdInline } from '../components/AdSpace';
import { formatNumber, formatDate } from '../utils/helpers';

function getGenreMeta(genre) {
  return {
    ...genre,
    image: genre.image || genre.cover_url || genre.banner_url || '/default-cover.jpg'
  };
}

function Home() {
  const HOME_TABS = ['hot', 'new', 'full'];
  const [featuredNovels, setFeaturedNovels] = useState([]);
  const [hotNovels, setHotNovels] = useState([]);
  const [newUpdates, setNewUpdates] = useState([]);
  const [completedNovels, setCompletedNovels] = useState([]);
  const [rankings, setRankings] = useState({ day: [], week: [], month: [] });
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRankTab, setActiveRankTab] = useState('day');
  const [activeHomeTab, setActiveHomeTab] = useState(() => {
    const saved = localStorage.getItem('mi_home_tab');
    return saved && HOME_TABS.includes(saved) ? saved : 'hot';
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!HOME_TABS.includes(activeHomeTab)) {
      setActiveHomeTab('hot');
      return;
    }
    localStorage.setItem('mi_home_tab', activeHomeTab);
  }, [activeHomeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!isSupabaseConfigured || !supabase) {
        console.error('[v0] Supabase not configured');
        setLoading(false);
        return;
      }

      const { data: novels, error } = await supabase
        .from("novels")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: genresData, error: genresError } = await supabase
        .from("genres")
        .select("*")
        .order("name", { ascending: true });

      if (genresError) {
        console.error(genresError);
      }


      if (error) {
        console.error(error);
        return;
      }

      const novelIds = (novels || []).map((novel) => novel.id);
      let chapterRows = [];
      if (novelIds.length > 0) {
        const chapterResult = await supabase
          .from("chapters")
          .select("id,novel_id,chapter_number")
          .in("novel_id", novelIds)
          .order("chapter_number", { ascending: true });
        chapterRows = chapterResult.data || [];
      }

      const firstChapterMap = {};
      (chapterRows || []).forEach((chapter) => {
        if (!firstChapterMap[chapter.novel_id]) {
          firstChapterMap[chapter.novel_id] = chapter.id;
        }
      });

      const novelsWithFirstChapter = (novels || []).map((novel) => ({
        ...novel,
        first_chapter_id: firstChapterMap[novel.id] || null
      }));

      setHotNovels(novelsWithFirstChapter);
      setNewUpdates(novelsWithFirstChapter);
      setGenres((genresData || []).map(getGenreMeta));
      setCompletedNovels(
        novelsWithFirstChapter.filter((novel) => String(novel.status || "").toLowerCase() === "completed").slice(0, 6)
      );

      setRankings({
        day: novelsWithFirstChapter,
        week: novelsWithFirstChapter,
        month: novelsWithFirstChapter
      });

      setFeaturedNovels(novelsWithFirstChapter.slice(0, 5));

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-8">
      {/* Top Banner Ad */}
      <AdBanner type="leaderboard" className="hidden md:flex" />
      <AdBanner type="mobile" className="md:hidden" />

      {/* Hero Section with Featured Novels */}
      <HeroSection featuredNovels={featuredNovels} />

      {/* Quick Stats */}
      <QuickStats />

      {/* Main Content with Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-base font-bold text-foreground">Khám phá truyện</h2>
                  <p className="text-xs text-muted-foreground">Chuyển tab để xem nhanh theo nhu cầu</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-xl border border-border">
                {[
                  { key: 'hot', label: 'Hot' },
                  { key: 'new', label: 'Mới cập nhật' },
                  { key: 'full', label: 'Truyện Full' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveHomeTab(tab.key)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      activeHomeTab === tab.key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[360px]">
              {activeHomeTab === 'hot' && (
                hotNovels.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {hotNovels.slice(0, 12).map((novel) => (
                      <NovelCard key={novel.id} novel={novel} showStatus variant="compact" />
                    ))}
                  </div>
                ) : (
                  <EmptyTabNotice />
                )
              )}

              {activeHomeTab === 'new' && (
                newUpdates.length > 0 ? (
                  <div className="section-shell overflow-hidden">
                    <div className="divide-y divide-border">
                      {newUpdates.slice(0, 20).map((novel) => (
                        <UpdateRow key={novel.id} novel={novel} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyTabNotice />
                )
              )}

              {activeHomeTab === 'full' && (
                completedNovels.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {completedNovels.slice(0, 12).map((novel) => (
                      <NovelCard key={novel.id} novel={novel} showStatus variant="compact" />
                    ))}
                  </div>
                ) : (
                  <EmptyTabNotice text="Chua co truyen full trong he thong." />
                )
              )}
            </div>
          </section>

          {/* Another Inline Ad */}
          <AdInline />

          {/* Scrolling Feed Section */}
          <section>
            <SectionHeader
              icon={<TrendingUp className="w-5 h-5 text-accent" />}
              title="Dong cap nhat lien tuc"
              subtitle="Phong cach cuon trang nhu cac web truyen lon"
              link="/truyen-moi"
            />
            <div className="section-shell overflow-hidden">
              <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
                {newUpdates.map((novel) => (
                  <UpdateRow key={`stream-${novel.id}`} novel={novel} />
                ))}
              </div>
            </div>
          </section>

          {/* Genre Grid */}
          <section>
            <SectionHeader 
              icon={<BookOpen className="w-5 h-5 text-accent" />}
              title="Thể Loại"
              subtitle="Khám phá theo sở thích"
              link="/the-loai"
            />
            <div className="section-shell p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/the-loai/${genre.slug}`}
                    className="relative h-28 rounded-lg overflow-hidden border border-border group"
                  >
                    <img
                      src={genre.image}
                      alt={genre.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">{genre.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {/* Rankings */}
          <div className="section-shell overflow-hidden sticky top-20">
            <div className="p-3 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[hsl(var(--warning))]" />
                <h3 className="font-semibold text-foreground text-sm">Bảng Xếp Hạng</h3>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { key: 'day', label: 'Ngày' },
                { key: 'week', label: 'Tuần' },
                { key: 'month', label: 'Tháng' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveRankTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    activeRankTab === tab.key
                      ? 'text-accent border-b-2 border-accent -mb-px bg-accent/5'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ranking List */}
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {rankings[activeRankTab]?.slice(0, 10).map((novel, index) => (
                <Link
                  key={novel.id}
                  to={`/truyen/${novel.id}`}
                  className="flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors"
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                    index < 3 
                      ? index === 0 
                        ? 'bg-[hsl(var(--warning))] text-foreground' 
                        : index === 1 
                          ? 'bg-muted-foreground/30 text-foreground'
                          : 'bg-[#CD7F32] text-white'
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground line-clamp-1">
                      {novel.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{novel.view_count || 0} lượt xem</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Top Views Section */}
          <TopViewsSection novels={hotNovels} />

          {/* Sidebar Ad */}
          <AdSidebar />
          
          {/* Shopee Affiliate */}
          <ShopeeDeals />
        </aside>
      </div>

      {/* Bottom Banner Ad */}
      <AdBanner type="large" />

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}

function HeroSection({ featuredNovels }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (featuredNovels.length === 0) return;
    setShowFullDescription(false);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(featuredNovels.length, 5));
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredNovels.length]);

  useEffect(() => {
    setShowFullDescription(false);
  }, [currentSlide]);

  if (featuredNovels.length === 0) {
    return (
      <section className="bg-card border border-border rounded-lg p-8 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Chao mung den MI Truyen</h2>
        <p className="text-muted-foreground">Khám phá thế giới tiểu thuyết hấp dẫn</p>
      </section>
    );
  }

  const featured = featuredNovels[currentSlide];

  return (
    <section className="relative section-shell overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        {/* Featured Novel Image */}
        <div className="relative aspect-[4/3] md:aspect-auto md:h-[320px]">
        <img
          src={featured?.cover_url || '/default-cover.jpg'}
          alt={featured?.title}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card md:block hidden" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent md:hidden" />
          
          {/* Badge */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-2 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded flex items-center gap-1">
              <Flame className="w-3 h-3" />
              HOT
            </span>
            {featured?.status === 'completed' && (
              <span className="px-2 py-1 bg-[hsl(var(--success))] text-white text-xs font-semibold rounded">
                FULL
              </span>
            )}
          </div>
        </div>

        {/* Featured Novel Info */}
        <div className="p-6 flex flex-col justify-center">
          <div className="mb-3">
            <span className="text-xs text-accent font-medium uppercase tracking-wider">Đề cử hôm nay</span>
          </div>
          <Link to={`/truyen/${featured?.id}`}>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3 hover:text-accent transition-colors line-clamp-2">
              {featured?.title}
            </h2>
          </Link>
          <p className={`text-sm text-muted-foreground mb-2 ${showFullDescription ? '' : 'line-clamp-3'}`}>
            {featured?.description}
          </p>
          {featured?.description && featured.description.length > 120 && (
            <button
              type="button"
              onClick={() => setShowFullDescription((prev) => !prev)}
              className="text-xs text-accent hover:underline mb-4"
            >
              {showFullDescription ? 'Less' : 'More'}
            </button>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(featured?.view_count || 0)}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {featured?.totalChapters || 0} chương
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {formatNumber(featured?.likes || 0)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={featured?.first_chapter_id || featured?.chapter_1_id || featured?.firstChapterId
                ? `/chapter/${featured?.first_chapter_id || featured?.chapter_1_id || featured?.firstChapterId}`
                : `/truyen/${featured?.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Đọc ngay
            </Link>
            <Link
              to={`/truyen/${featured?.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
            >
              Chi tiết
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      {featuredNovels.length > 1 && (
        <div className="absolute bottom-3 left-3 md:left-auto md:right-3 flex gap-1.5">
          {featuredNovels.slice(0, 5).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-accent w-6' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function QuickStats() {
  const stats = [
    { value: '10K+', label: 'Truyện', icon: BookOpen, color: 'text-accent' },
    { value: '500K+', label: 'Chương', icon: BookMarked, color: 'text-[hsl(var(--success))]' },
    { value: '1M+', label: 'Lượt đọc', icon: Eye, color: 'text-[hsl(var(--warning))]' },
    { value: '50K+', label: 'Thành viên', icon: Star, color: 'text-accent' },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className="bg-card border border-border rounded-lg p-4 text-center hover:border-accent/30 transition-colors"
        >
          <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
          <div className="text-lg font-bold text-foreground">{stat.value}</div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}

function SectionHeader({ icon, title, subtitle, link }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {link && (
        <Link 
          to={link} 
          className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 font-medium transition-colors"
        >
          Xem tất cả
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function EmptyTabNotice({ text = "Dang cap nhat du lieu cho muc nay." }) {
  return (
    <div className="section-shell p-8 text-center">
      <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function UpdateRow({ novel }) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors">
      <Link to={`/truyen/${novel.id}`} className="flex-shrink-0">
        <img
          src={novel.cover_url || '/default-cover.jpg'}
          alt={novel.title}
          className="w-10 h-14 object-contain rounded"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/truyen/${novel.id}`}>
          <h3 className="text-sm font-medium text-foreground line-clamp-1 hover:text-accent transition-colors">
            {novel.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1">
          {novel.status === 'completed' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded font-medium">
              FULL
            </span>
          )}
          <span className="text-xs text-muted-foreground">{novel.author}</span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="text-xs text-muted-foreground">{novel.view_count || 0} lượt xem</span>
        <span className="text-[10px] text-muted-foreground block mt-0.5">
          {formatDate(novel.created_at)}
        </span>
      </div>
    </div>
  );
}

function TopViewsSection({ novels }) {
  // Sort novels by view count to show most viewed
  const topViewed = [...novels]
    .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    .slice(0, 5);

  if (topViewed.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-border bg-accent/5">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-foreground text-sm">Lượt Xem Cao Nhất</h3>
        </div>
      </div>
      
      <div className="divide-y divide-border">
        {topViewed.map((novel, index) => (
          <Link
            key={novel.id}
            to={`/truyen/${novel.id}`}
            className="flex gap-3 p-3 hover:bg-secondary/30 transition-colors group"
          >
            <img
              src={novel.cover_url || '/default-cover.jpg'}
              alt={novel.title}
              className="w-12 h-16 object-contain rounded flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                {novel.title}
              </h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Eye className="w-3 h-3" />
                  {formatNumber(novel.view_count || 0)}
                </span>
              </div>
              {novel.status === 'completed' && (
                <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] rounded font-medium">
                  FULL
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      
      <Link
        to="/hot"
        className="flex items-center justify-center gap-1 p-2.5 text-xs text-accent hover:bg-accent/5 transition-colors border-t border-border"
      >
        Xem tất cả
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function CTASection() {
  return (
    <section className="relative overflow-hidden rounded-lg bg-foreground text-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)),transparent_50%)] opacity-20" />
      
      <div className="relative px-6 py-12 text-center">
        <h2 className="text-2xl font-bold mb-3 text-balance">
          Bắt đầu hành trình sáng tác của bạn
        </h2>
        <p className="text-background/70 max-w-xl mx-auto mb-6 text-sm">
          Tham gia cùng hàng nghìn tác giả đang sử dụng công cụ AI để tạo nên những câu chuyện tuyệt vời. 
          Đăng ký miễn phí ngay hôm nay.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-background text-foreground rounded-lg text-sm font-medium hover:bg-background/90 transition-colors"
          >
            Đăng ký miễn phí
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/truyen-sang-tac"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-background/30 text-background rounded-lg text-sm font-medium hover:bg-background/10 transition-colors"
          >
            <PenTool className="w-4 h-4" />
            Tìm hiểu thêm
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Home;
