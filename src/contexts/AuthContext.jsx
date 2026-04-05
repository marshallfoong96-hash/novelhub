import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/services';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =====================
  // 初始化：檢查登入狀態
  // =====================
  useEffect(() => {
    checkAuth();

    // 監聽登入/登出
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data?.user || null);
    setLoading(false);
  };

  // =====================
  // 登入
  // =====================
  const login = async (email, password) => {
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
  const register = async (email, password) => {
    const { data, error } = await authAPI.register(email, password);

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
    await supabase.auth.signOut();
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