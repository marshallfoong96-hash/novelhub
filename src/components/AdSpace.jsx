import { ExternalLink } from 'lucide-react';

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

export function ShopeeDeals({ className = '' }) {
  // Sample affiliate products - replace with actual Shopee affiliate links
  const products = [
    { id: 1, name: 'Light Novel Set', price: '299.000đ', discount: '-30%' },
    { id: 2, name: 'Manga Collection', price: '199.000đ', discount: '-25%' },
    { id: 3, name: 'Reading Light', price: '89.000đ', discount: '-40%' },
  ];

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      <div className="bg-accent px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-accent-foreground">Hot Deals</span>
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
      <div className="p-3 space-y-2">
        {products.map((product) => (
          <a
            key={product.id}
            href="#"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center text-muted-foreground">
              <span className="text-[10px]">IMG</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground line-clamp-1">{product.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-accent">{product.price}</span>
                <span className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">{product.discount}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default { AdBanner, AdSidebar, AdInline, ShopeeDeals };
