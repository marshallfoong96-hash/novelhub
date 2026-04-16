import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function GoogleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Supabase Auth — Google OAuth. Enable in Dashboard → Authentication → Providers → Google.
 */
export default function GoogleSignInButton({
  onError,
  disabled = false,
  label = 'Tiếp tục với Google',
}) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    onError?.('');
    setBusy(true);
    const result = await loginWithGoogle();
    if (!result.success) {
      onError?.(result.message || 'Không thể đăng nhập bằng Google.');
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-lg text-sm font-medium border border-border bg-background text-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {busy ? (
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
      ) : (
        <GoogleIcon className="w-5 h-5 shrink-0" />
      )}
      {busy ? 'Đang chuyển hướng...' : label}
    </button>
  );
}
