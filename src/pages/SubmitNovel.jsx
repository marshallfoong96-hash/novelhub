import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Send, FileText, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { fetchGenresCached } from "../lib/cachedQueries";

const EMPTY_FORM = {
  title: "",
  author_pen_name: "",
  description: "",
  cover_url: "",
  status: "ongoing",
  genre_ids: [],
};

const STATUS_BADGE = {
  draft: "bg-secondary text-muted-foreground",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  published: "bg-sky-100 text-sky-800",
  archived: "bg-slate-200 text-slate-700",
};

function SubmitNovel() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [genres, setGenres] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const displayName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      ""
    );
  }, [user]);

  useEffect(() => {
    if (!form.author_pen_name && displayName) {
      setForm((prev) => ({ ...prev, author_pen_name: displayName }));
    }
  }, [displayName, form.author_pen_name]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    if (!isSupabaseConfigured || !supabase || !user?.id) {
      setError("Supabase hoặc phiên đăng nhập chưa sẵn sàng.");
      setLoading(false);
      return;
    }

    const [genreRows, submissionsRes] = await Promise.all([
      fetchGenresCached(),
      supabase
        .from("novel_submissions")
        .select("id,title,submission_status,status,created_at,reviewed_at,moderation_note")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (submissionsRes.error) {
      setError(submissionsRes.error.message || "Không tải được danh sách bài gửi.");
    } else {
      setSubmissions(submissionsRes.data || []);
    }
    setGenres(Array.isArray(genreRows) ? genreRows : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const onSelectGenres = (event) => {
    const next = Array.from(event.target.selectedOptions).map((opt) => Number(opt.value));
    setForm((prev) => ({ ...prev, genre_ids: next.filter((n) => Number.isFinite(n)) }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!user?.id) {
      setError("Bạn cần đăng nhập để gửi tác phẩm.");
      return;
    }
    if (!form.title.trim()) {
      setError("Vui lòng nhập tên truyện.");
      return;
    }
    if (form.description.trim().length < 30) {
      setError("Mô tả truyện nên từ 30 ký tự trở lên.");
      return;
    }

    setSubmitting(true);
    const payload = {
      author_user_id: user.id,
      title: form.title.trim(),
      author_pen_name: form.author_pen_name.trim() || null,
      description: form.description.trim(),
      cover_url: form.cover_url.trim() || null,
      status: form.status,
      genre_ids: form.genre_ids,
      submission_status: "pending_review",
    };

    const { error: insertError } = await supabase.from("novel_submissions").insert([payload]);
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message || "Gửi truyện thất bại.");
      return;
    }

    setNotice("Đã gửi truyện thành công. Trạng thái hiện tại: pending_review.");
    setForm((prev) => ({
      ...EMPTY_FORM,
      author_pen_name: prev.author_pen_name || displayName,
    }));
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đăng truyện mới</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Truyện bạn gửi sẽ vào hàng chờ duyệt trước khi xuất bản công khai.
          </p>
        </div>
        <Link to="/profile" className="text-sm text-accent hover:underline">
          Về trung tâm thành viên
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          Thông tin tác phẩm
        </h2>

        <form onSubmit={onSubmit} className="grid gap-3">
          <input
            type="text"
            placeholder="Tên truyện"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Bút danh tác giả"
            value={form.author_pen_name}
            onChange={(e) => setForm((prev) => ({ ...prev, author_pen_name: e.target.value }))}
            className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
          />
          <textarea
            rows={5}
            placeholder="Mô tả truyện"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
          />
          <input
            type="url"
            placeholder="URL ảnh bìa (tùy chọn)"
            value={form.cover_url}
            onChange={(e) => setForm((prev) => ({ ...prev, cover_url: e.target.value }))}
            className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
            >
              <option value="ongoing">Đang ra</option>
              <option value="completed">Hoàn thành</option>
            </select>
            <select
              multiple
              value={form.genre_ids}
              onChange={onSelectGenres}
              className="w-full h-28 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
            >
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-emerald-600">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Đang gửi..." : "Gửi duyệt"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground mb-3">Bài gửi gần đây</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Bạn chưa có bài gửi nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {submissions.map((row) => (
              <div key={row.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{row.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tạo lúc: {new Date(row.created_at).toLocaleString("vi-VN")}
                  </p>
                  {row.moderation_note ? (
                    <p className="text-xs text-rose-600 mt-1">Ghi chú duyệt: {row.moderation_note}</p>
                  ) : null}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {row.submission_status === "pending_review" && <Clock3 className="w-4 h-4 text-amber-600" />}
                  {row.submission_status === "approved" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {row.submission_status === "rejected" && <XCircle className="w-4 h-4 text-rose-600" />}
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      STATUS_BADGE[row.submission_status] || "bg-secondary text-foreground"
                    }`}
                  >
                    {row.submission_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SubmitNovel;
