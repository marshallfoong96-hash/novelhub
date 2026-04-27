import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Send, FileText, Clock3, CheckCircle2, XCircle, History } from "lucide-react";
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

function draftStorageKey(uid) {
  return `mi_submit_novel_draft__uid_${uid}`;
}

function SubmitNovel() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [genres, setGenres] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [revisionsBySubmissionId, setRevisionsBySubmissionId] = useState({});
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
        .select("id,title,author_pen_name,description,cover_url,genre_ids,submission_status,status,created_at,reviewed_at,moderation_note")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (submissionsRes.error) {
      setError(submissionsRes.error.message || "Không tải được danh sách bài gửi.");
      setSubmissions([]);
      setRevisionsBySubmissionId({});
    } else {
      const list = submissionsRes.data || [];
      setSubmissions(list);
      const ids = list.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) {
        setRevisionsBySubmissionId({});
      } else {
        const { data: revRows, error: revErr } = await supabase
          .from("novel_submission_revisions")
          .select(
            "id,submission_id,snapshot,previous_submission_status,moderation_note,reviewed_at,created_at"
          )
          .in("submission_id", ids)
          .order("created_at", { ascending: false });
        if (revErr) {
          console.warn("[SubmitNovel] revisions:", revErr.message);
          setRevisionsBySubmissionId({});
        } else {
          const map = {};
          (revRows || []).forEach((rev) => {
            const sid = rev.submission_id;
            if (!map[sid]) map[sid] = [];
            map[sid].push(rev);
          });
          setRevisionsBySubmissionId(map);
        }
      }
    }
    setGenres(Array.isArray(genreRows) ? genreRows : []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(draftStorageKey(user.id));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      setForm((prev) => ({
        ...prev,
        title: parsed.title || prev.title,
        author_pen_name: parsed.author_pen_name || prev.author_pen_name,
        description: parsed.description || prev.description,
        cover_url: parsed.cover_url || prev.cover_url,
        status: parsed.status || prev.status,
        genre_ids: Array.isArray(parsed.genre_ids) ? parsed.genre_ids : prev.genre_ids,
      }));
    } catch {
      /* ignore invalid draft */
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(draftStorageKey(user.id), JSON.stringify(form));
    } catch {
      /* ignore storage quota errors */
    }
  }, [form, user?.id]);

  const onSelectGenres = (event) => {
    const next = Array.from(event.target.selectedOptions).map((opt) => Number(opt.value));
    setForm((prev) => ({ ...prev, genre_ids: next.filter((n) => Number.isFinite(n)) }));
  };

  const persistSubmission = async (targetStatus) => {
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
      submission_status: targetStatus,
    };
    const request = editingId
      ? supabase.from("novel_submissions").update(payload).eq("id", editingId)
      : supabase.from("novel_submissions").insert([payload]);
    const { error: upsertError } = await request;
    setSubmitting(false);

    if (upsertError) {
      setError(upsertError.message || "Lưu truyện thất bại.");
      return;
    }

    setNotice(
      targetStatus === "draft"
        ? "Đã lưu nháp thành công."
        : editingId
        ? "Đã cập nhật và gửi lại duyệt thành công."
        : "Đã gửi truyện thành công. Trạng thái hiện tại: pending_review."
    );
    setEditingId(null);
    setForm((prev) => ({
      ...EMPTY_FORM,
      author_pen_name: prev.author_pen_name || displayName,
    }));
    if (user?.id) {
      try {
        localStorage.removeItem(draftStorageKey(user.id));
      } catch {
        /* ignore */
      }
    }
    loadData();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await persistSubmission("pending_review");
  };

  const onSaveDraft = async () => {
    await persistSubmission("draft");
  };

  const onLoadForEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || "",
      author_pen_name: row.author_pen_name || displayName || "",
      description: row.description || "",
      cover_url: row.cover_url || "",
      status: row.status || "ongoing",
      genre_ids: Array.isArray(row.genre_ids) ? row.genre_ids : [],
    });
    setNotice("Đã nạp bài gửi vào form để chỉnh sửa.");
    setError("");
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      author_pen_name: displayName || "",
    });
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
            {editingId ? `Chỉnh sửa bài gửi #${editingId}` : "Thông tin tác phẩm"}
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Đang gửi..." : editingId ? "Cập nhật & gửi duyệt" : "Gửi duyệt"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onSaveDraft}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              Lưu nháp
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground"
              >
                Hủy chỉnh sửa
              </button>
            ) : null}
          </div>
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
              <div key={row.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">{row.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tạo lúc: {new Date(row.created_at).toLocaleString("vi-VN")}
                    </p>
                    {row.moderation_note ? (
                      <p className="text-xs text-rose-600 mt-1">Ghi chú duyệt: {row.moderation_note}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
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
                    {row.submission_status === "rejected" || row.submission_status === "draft" ? (
                      <button
                        type="button"
                        onClick={() => onLoadForEdit(row)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                      >
                        Sửa & gửi lại
                      </button>
                    ) : null}
                  </div>
                </div>
                <NovelRejectionHistory revisions={revisionsBySubmissionId[row.id]} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SubmitNovel;
