import { ExternalLink, Sparkles, BookOpen, Sword, Heart, Utensils, Briefcase, Gamepad2 } from 'lucide-react';

/**
 * Ad Space Component for Google AdSense CPM and Shopee Affiliate
 * Replace the placeholder content with actual ad code when ready
 */

export function AdBanner({ type = 'horizontal', className = '' }) {
  const sizes = {
    horizontal: { width: '100%', height: '90px', label: 'Banner 728x90' },
    leaderboard: { width: '100%', height: '90px', label: 'Leaderboard 728x90' },
    mobile: { width: '100%', height: '50px', label: 'Mobile Banner 320x50' },
    large: { width: '100%', height: '250px', label: 'Large Rectangle 336x280' },
  };

  const size = sizes[type] || sizes.horizontal;

  return (
    <div 
      className={`ad-banner ${className}`}
      style={{ minHeight: size.height }}
    >
      {/* Replace this div with actual Google AdSense code */}
      <div className="flex flex-col items-center justify-center gap-1 py-4">
        <span className="text-xs text-muted-foreground">Advertisement</span>
        <span className="text-[10px] text-muted-foreground/60">{size.label}</span>
      </div>
    </div>
  );
}

export function AdSidebar({ className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Shopee Affiliate Banner */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-accent/10 px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-accent flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Shopee Deals
          </span>
        </div>
        <div className="p-3">
          {/* Replace with actual Shopee affiliate code */}
          <div className="ad-container aspect-square">
            <span className="text-xs">Shopee Affiliate 300x300</span>
          </div>
        </div>
      </div>

      {/* Google AdSense Rectangle */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-secondary px-3 py-2 border-b border-border">
          <span className="text-xs text-muted-foreground">Sponsored</span>
        </div>
        <div className="p-3">
          {/* Replace with actual Google AdSense code */}
          <div className="ad-container" style={{ minHeight: '250px' }}>
            <span className="text-xs">Google Ads 300x250</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdInline({ className = '' }) {
  return (
    <div className={`my-6 ${className}`}>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Advertisement</span>
        </div>
        {/* Replace with actual ad code */}
        <div className="ad-container" style={{ minHeight: '100px' }}>
          <span className="text-xs">In-content Ad 468x60</span>
        </div>
      </div>
    </div>
  );
}

// AI-powered product recommendations based on novel genre/content
const genreProductMap = {
  'Tiên Hiệp': {
    icon: Sword,
    products: [
      { id: 1, name: 'Kiếm Gỗ Trang Trí Phong Cách Cổ Trang', price: '159.000đ', discount: '-35%', image: '⚔️' },
      { id: 2, name: 'Bộ Sưu Tập Tranh Tiên Hiệp', price: '89.000đ', discount: '-20%', image: '🖼️' },
      { id: 3, name: 'Đèn LED Phong Cách Đông Phương', price: '249.000đ', discount: '-40%', image: '🏮' },
    ]
  },
  'Ngôn Tình': {
    icon: Heart,
    products: [
      { id: 1, name: 'Set Bookmark Tình Yêu Lãng Mạn', price: '49.000đ', discount: '-25%', image: '💕' },
      { id: 2, name: 'Hộp Quà Tặng Valentine', price: '199.000đ', discount: '-30%', image: '🎁' },
      { id: 3, name: 'Gối Ôm Cặp Đôi Cute', price: '129.000đ', discount: '-45%', image: '💑' },
    ]
  },
  'Đô Thị': {
    icon: Briefcase,
    products: [
      { id: 1, name: 'Balo Laptop Thời Trang', price: '299.000đ', discount: '-35%', image: '💼' },
      { id: 2, name: 'Đồng Hồ Nam Cao Cấp', price: '599.000đ', discount: '-50%', image: '⌚' },
      { id: 3, name: 'Tai Nghe Bluetooth Premium', price: '449.000đ', discount: '-40%', image: '🎧' },
    ]
  },
  'Game': {
    icon: Gamepad2,
    products: [
      { id: 1, name: 'Bàn Phím Gaming RGB', price: '899.000đ', discount: '-30%', image: '⌨️' },
      { id: 2, name: 'Chuột Gaming Pro', price: '459.000đ', discount: '-25%', image: '🖱️' },
      { id: 3, name: 'Ghế Gaming Ergonomic', price: '1.999.000đ', discount: '-35%', image: '🎮' },
    ]
  },
  'Ẩm Thực': {
    icon: Utensils,
    products: [
      { id: 1, name: 'Bộ Dụng Cụ Nấu Ăn Cao Cấp', price: '399.000đ', discount: '-40%', image: '🍳' },
      { id: 2, name: 'Sách Nấu Ăn Truyền Thống', price: '149.000đ', discount: '-20%', image: '📖' },
      { id: 3, name: 'Máy Xay Sinh Tố Đa Năng', price: '599.000đ', discount: '-45%', image: '🥤' },
    ]
  },
  'default': {
    icon: BookOpen,
    products: [
      { id: 1, name: 'Bộ Light Novel Bestseller', price: '299.000đ', discount: '-30%', image: '📚' },
      { id: 2, name: 'Đèn Đọc Sách LED Chống Cận', price: '189.000đ', discount: '-35%', image: '💡' },
      { id: 3, name: 'Kệ Sách Mini Để Bàn', price: '129.000đ', discount: '-25%', image: '📖' },
    ]
  }
};

export function ShopeeDeals({ className = '', genre = null, novelTitle = null }) {
  // Get products based on genre, or use default
  const getRecommendations = () => {
    if (genre && genreProductMap[genre]) {
      return genreProductMap[genre];
    }
    // Randomly select a genre for homepage variety
    const genres = Object.keys(genreProductMap).filter(g => g !== 'default');
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    return genreProductMap[randomGenre] || genreProductMap['default'];
  };

  const recommendations = getRecommendations();
  const IconComponent = recommendations.icon;

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header with AI badge */}
      <div className="bg-gradient-to-r from-accent to-accent/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2 py-0.5">
              <Sparkles className="w-3 h-3 text-accent-foreground" />
              <span className="text-[10px] font-semibold text-accent-foreground">AI</span>
            </div>
            <span className="text-sm font-semibold text-accent-foreground">Gợi Ý Cho Bạn</span>
          </div>
          <a 
            href="https://shopee.vn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-accent-foreground/80 hover:text-accent-foreground flex items-center gap-1"
          >
            Xem thêm
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {/* AI recommendation context */}
        <p className="text-[10px] text-accent-foreground/70 mt-1.5 flex items-center gap-1">
          <IconComponent className="w-3 h-3" />
          {genre ? `Dựa trên thể loại: ${genre}` : 'Dựa trên sở thích đọc truyện của bạn'}
        </p>
      </div>

      {/* Products */}
      <div className="p-3 space-y-2">
        {recommendations.products.map((product, index) => (
          <a
            key={product.id}
            href={`https://shopee.vn/search?keyword=${encodeURIComponent(product.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group border border-transparent hover:border-border"
          >
            {/* Product image/emoji placeholder */}
            <div className="w-14 h-14 bg-secondary rounded-lg flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform">
              {product.image}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors font-medium">
                {product.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-accent">{product.price}</span>
                <span className="text-[10px] text-white bg-accent px-1.5 py-0.5 rounded font-semibold">
                  {product.discount}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2.5 bg-secondary/30 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI phân tích nội dung truyện để gợi ý sản phẩm phù hợp
        </p>
      </div>
    </div>
  );
}

export default { AdBanner, AdSidebar, AdInline, ShopeeDeals };
