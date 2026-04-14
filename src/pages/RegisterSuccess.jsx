import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const RESEND_COOLDOWN_SEC = 60;

function RegisterSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resendSignupConfirmation } = useAuth();

  const email = location.state?.email?.trim() || '';

  const [resendMsg, setResendMsg] = useState('');
  const [resendError, setResendError] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResendError('');
    setResendMsg('');
    setResending(true);
    try {
      const result = await resendSignupConfirmation(email);
      if (result.success) {
        setResendMsg(result.message || 'Đã gửi lại email xác nhận.');
        setCooldown(RESEND_COOLDOWN_SEC);
      } else {
        setResendError(result.message || 'Không thể gửi lại email.');
      }
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Mi Truyện</span>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Đăng ký thành công</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Chúng tôi đã gửi link xác nhận đến email của bạn
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-sm text-emerald-800 dark:text-emerald-200">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Kiểm tra hộp thư</p>
              <p className="text-emerald-900/90 dark:text-emerald-100/90">
                Mở email <span className="font-mono break-all">{email}</span>, bấm link xác nhận,
                sau đó quay lại trang đăng nhập.
              </p>
            </div>
          </div>

          {resendMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-sm text-emerald-800 dark:text-emerald-200">
              {resendMsg}
            </div>
          )}
          {resendError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {resendError}
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resending ? (
              <>
                <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại email xác nhận'}
              </>
            )}
          </button>

          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Đến trang đăng nhập
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="mt-4 text-[10px] text-muted-foreground text-center leading-relaxed">
          Không thấy email? Kiểm tra Spam / Promotions (Gmail) / tab Social. Đợi 5–15 phút rồi bấm
          &quot;Gửi lại&quot;. Nếu vẫn không có sau nhiều lần, vui lòng liên hệ hỗ trợ trang.
        </p>
      </div>
    </div>
  );
}

export default RegisterSuccess;
