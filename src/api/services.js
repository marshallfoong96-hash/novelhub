import { supabase } from "../lib/supabase";

// =====================
// Auth（先簡化版）
// =====================
export const authAPI = {
  register: async (email, password) => {
    return await supabase.auth.signUp({ email, password });
  },

  login: async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  loginWithGoogle: async () => {
    /** Phải khớp một mục trong Supabase → Authentication → URL Configuration → Redirect URLs (vd. http://localhost:3000/**) */
    const redirectTo = window.location.href.split("#")[0];

    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: false,
      },
    });
  },

  getMe: async () => {
    return await supabase.auth.getUser();
  }
};

// =====================
// Novel Services
// =====================
export const novelAPI = {
  // 全部小說
  getAll: async (limit = null) => {
    let query = supabase
      .from("novels")
      .select("*");
    if (typeof limit === "number" && limit > 0) {
      query = query.limit(limit);
    }
    return await query;
  },

  // 用 slug 找小說
  getBySlug: async (slug) => {
    return await supabase
      .from("novels")
      .select("*")
      .eq("slug", slug)
      .single();
  },

  // 章節列表
  getChapters: async (novelId, limit = 50) => {
    return await supabase
      .from("chapters")
      .select("*")
      .eq("novel_id", novelId)
      .order("chapter_number", { ascending: true })
      .limit(limit);
  },

  // 單章
  getChapter: async (novelId, chapterNumber) => {
    return await supabase
      .from("chapters")
      .select("*")
      .eq("novel_id", novelId)
      .eq("chapter_number", chapterNumber)
      .single();
  },

  // 🔥 熱門
  getHot: async (limit = null) => {
    let query = supabase
      .from("novels")
      .select("*")
      .order("view_count", { ascending: false });
    if (typeof limit === "number" && limit > 0) {
      query = query.limit(limit);
    }
    return await query;
  },

  // 🆕 最新更新
  getRecentUpdates: async (limit = null) => {
    let query = supabase
      .from("novels")
      .select("*")
      .order("created_at", { ascending: false });
    if (typeof limit === "number" && limit > 0) {
      query = query.limit(limit);
    }
    return await query;
  },

  // 建立小說
  create: async (data) => {
    return await supabase
      .from("novels")
      .insert([data]);
  },

  // 新增章節
  addChapter: async (data) => {
    return await supabase
      .from("chapters")
      .insert([data]);
  }
};

// =====================
// Genre Services
// =====================
export const genreAPI = {
  getAll: async () => {
    return await supabase
      .from("genres")
      .select("*");
  },

  getBySlug: async (slug) => {
    return await supabase
      .from("genres")
      .select("*")
      .eq("slug", slug)
      .single();
  }
};

// =====================
// Comment Services
// =====================
export const commentAPI = {
  getAll: async (novelId) => {
    return await supabase
      .from("comments")
      .select("*")
      .eq("novel_id", novelId)
      .order("created_at", { ascending: false });
  },

  create: async (data) => {
    return await supabase
      .from("comments")
      .insert([data]);
  },

  update: async (id, data) => {
    return await supabase
      .from("comments")
      .update(data)
      .eq("id", id);
  },

  delete: async (id) => {
    return await supabase
      .from("comments")
      .delete()
      .eq("id", id);
  }
};