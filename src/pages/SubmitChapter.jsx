import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Send, FilePenLine } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function SubmitChapter() {
  const { user } = useAuth();
  const [novels, setNovels] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    submission_id: "",
    novel_id: "",
    chapter_number: "",
    title: "",
    content: "",
  });

  const selectedNovel = useMemo(
    () => novels.find((n) => String(n.novel_id) === String(form.novel_id)),
    [novels, form.novel_id]
  );

  const loadData = async () => {
    setLoading(true);
    setError("");
    if (!isSupabaseConfigured || !supabase || !user?.id) {
      setError("Supabase hoặc đăng nhập chưa sẵn sàng.");
      setLoading(false);
      return;
    }

    const [novelsRes, chapterSubRes] = await Promise.all([
      supabase
        .from("novel_submissions")
        .select("id,title,published_novel_id,submission_status")
        .eq("author_user_id", user.id)
        .not("published_novel_id", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("chapter_submissions")
        .select("id,novel_id,chapter_number,title,submission_status,created_at,moderation_note")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (novelsRes.error) {
      setError(novelsRes.error.message || "Không tải được danh sách truyện đã phát hành.");
      setLoading(false);
      return;
    }
    if (chapterSubRes.error) {
      setError(chapterSubRes.error.message || "Không tải được danh sách chương đã gửi.");
      setLoading(false);
      return;
    }

    const list = (novelsRes.data || []).map((r) => ({
      submission_id: r.id,
      novel_id: r.published_novel_id,
      title: r.title,
    }));
    setNovels(list);
    setRows(chapterSubRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const onPickNovel = (value) => {
    const picked = novels.find((n) => String(n.novel_id) === String(value));
    setForm((prev) => ({
      ...prev,
      novel_id: value,
      submission_id: picked ? String(picked.submission_id) : "",
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.novel_id || !form.submission_id) {
      setError("Vui lòng chọn truyện đã phát hành.");
      return;
    }
    const chNum = Number(form.chapter_number);
    if (!Number.isFinite(chNum) || chNum <= 0) {
      setError("Số chương không hợp lệ.");
      return;
    }
    if (!form.title.trim() || form.content.trim().length < 20) {
      setError("Tên chương và nội dung là bắt buộc (nội dung >= 20 ký tự).");
      return;
    }

    setSubmitting(true);
    const payload = {
      submission_id: Number(form.submission_id),
      novel_id: Number(form.novel_id),
      author_user_id: user.id,
      chapter_number: chNum,
      title: form.title.trim(),
      content: form.content.trim(),
      submission_status: "pending_review",
    };

    const { error: insertError } = await supabase.from("chapter_submissions").insert([payload]);
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message || "Gửi chương thất bại.");
      return;
    }

    setNotice("Đã gửi chương thành công. Trạng thái: pending_review.");
    setForm((prev) => ({
      ...prev,
      chapter_number: "",
      title: "",
      content: "",
    }));
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đăng chương mới</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chỉ hỗ trợ cho truyện đã được phát hành. Chương sẽ vào hàng chờ duyệt.
          </p>
        </div>
        <Link to="/dang-truyen" className="text-sm text-accent hover:underline">
          Về đăng truyện
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <FilePenLine className="w-4 h-4 text-accent" />
          Nội dung chương
        </h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : novels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Bạn chưa có truyện nào đã phát hành, nên chưa thể gửi chương.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3">
            <select
              value={form.novel_id}
              onChange={(e) => onPickNovel(e.target.value)}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
            >
              <option value="">Chọn truyện</option>
              {novels.map((n) => (
                <option key={n.novel_id} value={n.novel_id}>
                  #{n.novel_id} - {n.title}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              placeholder="Số chương (ví dụ: 12)"
              value={form.chapter_number}
              onChange={(e) => setForm((prev) => ({ ...prev, chapter_number: e.target.value }))}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Tiêu đề chương"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
            />
            <textarea
              rows={12}
              placeholder="Nội dung chương"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
            />
            {selectedNovel ? (
              <p className="text-xs text-muted-foreground">
                Truyện đang chọn: #{selectedNovel.novel_id} - {selectedNovel.title}
              </p>
            ) : null}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-emerald-600">{notice}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Đang gửi..." : "Gửi duyệt chương"}
            </button>
          </form>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground mb-3">Chương đã gửi gần đây</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có chương nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    Chương {r.chapter_number}: {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Novel #{r.novel_id} · {new Date(r.created_at).toLocaleString("vi-VN")}
                  </p>
                  {r.moderation_note ? (
                    <p className="text-xs text-rose-600 mt-1">Ghi chú: {r.moderation_note}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {r.submission_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SubmitChapter;
