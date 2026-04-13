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
        data: { username }
      }
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }

    setUser(data.user);

    return {
      success: true,
      user: data.user
    };
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