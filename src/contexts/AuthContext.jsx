import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/services';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =====================
  // 初始化：檢查登入狀態
  // =====================
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return undefined;
    }

    checkAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    } catch (e) {
      console.error('[Auth] getUser failed:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // 登入
  // =====================
  const login = async (email, password) => {
    if (!supabase) {
      return { success: false, message: 'Chưa cấu hình đăng nhập.' };
    }
    const { data, error } = await authAPI.login(email, password);

    if (error) {
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }

    setUser(data.user);

    return {
      success: true,
      user: data.user
    };
  };

  // =====================
  // 註冊
  // =====================
  const register = async (username, email, password) => {
    if (!supabase) {
      return { success: false, message: 'Chưa cấu hình đăng nhập.' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }

    /** Có session → đã đăng nhập (thường gặp khi tắt “Confirm email” trong Supabase). */
    if (data.session?.user) {
      setUser(data.session.user);
      return { success: true, user: data.session.user };
    }

    /** Không có session: thử đăng nhập ngay (khi không bắt xác nhận email). */
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInData?.session?.user) {
      setUser(signInData.session.user);
      return { success: true, user: signInData.session.user };
    }

    /**
     * signUp thành công nhưng không có session + đăng nhập ngay không được
     * → thường là Supabase bật “Confirm email”: user phải bấm link trong mail trước.
     */
    if (data.user) {
      return {
        success: true,
        needsEmailConfirmation: true,
        message:
          'Đã tạo tài khoản. Vui lòng kiểm tra email và bấm link xác nhận, sau đó đăng nhập tại đây.',
      };
    }

    return {
      success: false,
      message:
        signInError?.message ||
        'Không thể hoàn tất đăng nhập sau khi đăng ký. Vui lòng thử đăng nhập thủ công.',
    };
  };

  const resendSignupConfirmation = async (email) => {
    if (!supabase) {
      return { success: false, message: 'Chưa cấu hình đăng nhập.' };
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    if (error) {
      return { success: false, message: error.message || 'Không thể gửi lại email.' };
    }
    return { success: true, message: 'Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư.' };
  };

  // =====================
  // 登出
  // =====================
  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    resendSignupConfirmation,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};