import { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';
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
      
      const [hotRes, updatesRes, genresRes] = await Promise.all([
        novelAPI.getHot({ period: 'month', limit: 6 }),
        novelAPI.getRecentUpdates({ limit: 8 }),
        genreAPI.getAll()
      ]);

      setHotNovels(hotRes.data.novels || []);
      setNewUpdates(updatesRes.data.novels || []);
      setGenres(genresRes.data.genres || []);

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

      setFeaturedNovels(hotRes.data.novels?.slice(0, 3) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading novels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <StatsSection />

      {/* Featured Novels */}
      {featuredNovels.length > 0 && (
        <section>
          <SectionHeader 
            icon={<Sparkles className="w-5 h-5" />}
            title="Featured Today"
            link="/featured"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredNovels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Hot Novels */}
      <section>
        <SectionHeader 
          icon={<Flame className="w-5 h-5 text-accent" />}
          title="Trending This Month"
          link="/hot"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {hotNovels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} showStatus />
          ))}
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-12">
          {/* New Updates */}
          <section>
            <SectionHeader 
              icon={<Clock className="w-5 h-5 text-accent" />}
              title="Recently Updated"
              link="/truyen-moi"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {newUpdates.map((novel) => (
                <UpdateCard key={novel.id} novel={novel} />
              ))}
            </div>
          </section>

          {/* Genres Grid */}
          <section>
            <SectionHeader 
              icon={<BookOpen className="w-5 h-5 text-accent" />}
              title="Browse by Genre"
              link="/the-loai"
            />
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {genres.map((genre) => (
                  <Link
                    key={genre.id}
                    to={`/the-loai/${genre.slug}`}
                    className="group flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                  >
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
                    <span>{genre.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column - Rankings */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl overflow-hidden sticky top-24">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">Top Rankings</h3>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { key: 'day', label: 'Today' },
                { key: 'week', label: 'Week' },
                { key: 'month', label: 'Month' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveRankTab(tab.key)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeRankTab === tab.key
                      ? 'text-accent border-b-2 border-accent -mb-px'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ranking List */}
            <div className="divide-y divide-border">
              {rankings[activeRankTab]?.map((novel, index) => (
                <Link
                  key={novel.id}
                  to={`/truyen/${novel.slug}`}
                  className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                    index < 3 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-secondary text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground line-clamp-1">
                      {novel.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{novel.totalChapters} chapters</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {formatNumber(novel.viewCount)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-card border border-border">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)/0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.05),transparent_50%)]" />
      
      <div className="relative px-8 py-16 sm:py-24 lg:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Novel Platform
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight text-balance mb-6">
            Discover and Create
            <span className="block text-accent">Amazing Stories</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            Read thousands of novels or unleash your creativity with our AI writing assistant. 
            Your next favorite story is just a click away.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/truyen-moi"
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors"
            >
              Start Reading
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/truyen-sang-tac"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-secondary transition-colors"
            >
              <PenTool className="w-4 h-4" />
              Write with AI
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: '10K+', label: 'Novels', icon: BookOpen },
    { value: '500K+', label: 'Chapters', icon: Star },
    { value: '1M+', label: 'Readers', icon: Users },
    { value: '99%', label: 'Satisfaction', icon: Zap },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div 
          key={index}
          className="bg-card border border-border rounded-xl p-6 text-center hover:border-accent/50 transition-colors"
        >
          <div className="inline-flex items-center justify-center w-10 h-10 bg-accent/10 text-accent rounded-lg mb-3">
            <stat.icon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </section>
  );
}

function SectionHeader({ icon, title, link }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {link && (
        <Link 
          to={link} 
          className="text-sm text-muted-foreground hover:text-accent flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function UpdateCard({ novel }) {
  return (
    <div className="group bg-card border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-all">
      <Link to={`/truyen/${novel.slug}`}>
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={novel.cover || '/default-cover.jpg'}
            alt={novel.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {novel.status === 'completed' && (
            <span className="absolute top-2 right-2 px-2 py-0.5 bg-accent text-accent-foreground text-xs font-semibold rounded">
              Complete
            </span>
          )}
        </div>
      </Link>
      <div className="p-3">
        <Link to={`/truyen/${novel.slug}`}>
          <h3 className="font-medium text-sm text-foreground line-clamp-1 mb-1 group-hover:text-accent transition-colors">
            {novel.title}
          </h3>
        </Link>
        {novel.chapters?.[0] && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link 
              to={`/truyen/${novel.slug}/chuong-${novel.chapters[0].chapterNumber}`}
              className="text-accent hover:underline truncate"
            >
              {novel.chapters[0].title}
            </Link>
            <span className="ml-2 whitespace-nowrap">{formatDate(novel.chapters[0].createdAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CTASection() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-foreground text-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--accent)),transparent_50%)] opacity-20" />
      
      <div className="relative px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4 text-balance">
          Ready to Start Your Writing Journey?
        </h2>
        <p className="text-background/70 max-w-xl mx-auto mb-8">
          Join thousands of writers using our AI-powered tools to create compelling stories. 
          Start writing for free today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-lg font-medium hover:bg-background/90 transition-colors"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/truyen-sang-tac"
            className="inline-flex items-center gap-2 px-6 py-3 border border-background/30 text-background rounded-lg font-medium hover:bg-background/10 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Home;
