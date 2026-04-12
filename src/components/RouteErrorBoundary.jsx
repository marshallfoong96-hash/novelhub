import { Component } from 'react';

/**
 * Catches render errors from lazy routes (e.g. failed chunk after deploy) and runtime bugs.
 * Remounts clean when `key` changes (e.g. new pathname), so navigation can recover without full reload.
 */
export class RouteErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[MiTruyen] route error:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center"
          role="alert"
        >
          <p className="max-w-md text-sm text-muted-foreground">
            Đã xảy ra lỗi khi tải trang. Bạn có thể thử tải lại hoặc chuyển sang trang khác.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
            >
              Tải lại trang
            </button>
            <a
              href="/"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
