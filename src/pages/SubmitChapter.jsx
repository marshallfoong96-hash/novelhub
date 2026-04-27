import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Send, FileText, History } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function chapterDraftStorageKey(uid) {
  return `mi_submit_chapter_draft__uid_${uid}`;
}

function ChapterRejectionHistory({ revisions }) {
  const [open, setOpen] = useState(false);
  if (!revisions?.length) return null;
  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-accent"
      >
        <History className="h-3.5 w-3.5 shrink-0" />
        Lịch sử phiên bản khi bị từ chối ({revisions.length})
      </button>
      {open ? (
        <ul className="mt-2 space-y-3 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
          {revisions.map((rev) => {
            const snap = rev.snapshot || {};
            return (
              <li key={rev.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <p className="font-medium text-foreground">
                  {new Date(rev.created_at).toLocaleString("vi-VN")}
                  {rev.previous_submission_status ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      (trước đó: {rev.previous_submission_status})
                    </span>
                  ) : null}
                </p>
                {rev.moderation_note ? (
                  <p className="mt-1 text-rose-600">Lý do: {rev.moderation_note}</p>
                ) : null}
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Chương:</span> {snap.chapter_number} — {snap.title || "—"}
                </p>
                <details className="mt-1">
                  <summary className="cursor-pointer text-accent hover:underline">Nội dung đã gửi</summary>
                  <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded bg-card p-2 text-[11px] text-foreground ring-1 ring-border/60">
                    {snap.content || "—"}
                  </pre>
                </details>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function SubmitChapter() {
  const { user } = useAuth();
  const [novels, setNovels] = useState([]);
  const [rows, setRows] = useState([]);
  const [revisionsByChapterId, setRevisionsByChapterId] = useState({});
  const [editingId, setEditingId] = useState(null);
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
        .select("id,submission_id,novel_id,chapter_number,title,content,submission_status,created_at,moderation_note")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (novelsRes.error) {
      setError(novelsRes.error.message || "Không tải được danh sách truyện đã phát hành.");
      setRevisionsByChapterId({});
      setLoading(false);
      return;
    }
    if (chapterSubRes.error) {
      setError(chapterSubRes.error.message || "Không tải được danh sách chương đã gửi.");
      setRevisionsByChapterId({});
      setLoading(false);
      return;
    }

    const list = (novelsRes.data || []).map((r) => ({
      submission_id: r.id,
      novel_id: r.published_novel_id,
      title: r.title,
    }));
    setNovels(list);
    const chapterList = chapterSubRes.data || [];
    setRows(chapterList);
    const cids = chapterList.map((r) => r.id).filter(Boolean);
    if (cids.length === 0) {
      setRevisionsByChapterId({});
    } else {
      const { data: revRows, error: revErr } = await supabase
        .from("chapter_submission_revisions")
        .select(
          "id,chapter_submission_id,snapshot,previous_submission_status,moderation_note,reviewed_at,created_at"
        )
        .in("chapter_submission_id", cids)
        .order("created_at", { ascending: false });
      if (revErr) {
        console.warn("[SubmitChapter] revisions:", revErr.message);
        setRevisionsByChapterId({});
      } else {
        const map = {};
        (revRows || []).forEach((rev) => {
          const cid = rev.chapter_submission_id;
          if (!map[cid]) map[cid] = [];
          map[cid].push(rev);
        });
        setRevisionsByChapterId(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(chapterDraftStorageKey(user.id));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      setForm((prev) => ({
        ...prev,
        submission_id: parsed.submission_id || prev.submission_id,
        novel_id: parsed.novel_id || prev.novel_id,
        chapter_number: parsed.chapter_number || prev.chapter_number,
        title: parsed.title || prev.title,
        content: parsed.content || prev.content,
      }));
    } catch {
      /* ignore invalid draft */
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(chapterDraftStorageKey(user.id), JSON.stringify(form));
    } catch {
      /* ignore */
    }
  }, [form, user?.id]);

  const onPickNovel = (value) => {
    const picked = novels.find((n) => String(n.novel_id) === String(value));
    setForm((prev) => ({
      ...prev,
      novel_id: value,
      submission_id: picked ? String(picked.submission_id) : "",
    }));
  };

  const persistChapter = async (targetStatus) => {
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
      submission_status: targetStatus,
    };
    const request = editingId
      ? supabase.from("chapter_submissions").update(payload).eq("id", editingId)
      : supabase.from("chapter_submissions").insert([payload]);
    const { error: upsertError } = await request;
    setSubmitting(false);
    if (upsertError) {
      setError(upsertError.message || "Lưu chương thất bại.");
      return;
    }

    setNotice(
      targetStatus === "draft"
        ? "Đã lưu nháp chương thành công."
        : editingId
        ? "Đã cập nhật và gửi lại chương thành công."
        : "Đã gửi chương thành công. Trạng thái: pending_review."
    );
    setEditingId(null);
    setForm((prev) => ({
      ...prev,
      chapter_number: "",
      title: "",
      content: "",
    }));
    if (user?.id) {
      try {
        localStorage.removeItem(chapterDraftStorageKey(user.id));
      } catch {
        /* ignore */
      }
    }
    loadData();
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    await persistChapter("pending_review");
  };

  const onSaveDraft = async () => {
    await persistChapter("draft");
  };

  const onLoadForEdit = (row) => {
    setEditingId(row.id);
    setForm({
      submission_id: String(row.submission_id || ""),
      novel_id: String(row.novel_id || ""),
      chapter_number: String(row.chapter_number || ""),
      title: row.title || "",
      content: row.content || "",
    });
    setNotice("Đã nạp chương vào form để chỉnh sửa.");
    setError("");
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...prev,
      chapter_number: "",
      title: "",
      content: "",
    }));
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
          <FileText className="w-4 h-4 text-accent" />
            {editingId ? `Chỉnh sửa chương gửi #${editingId}` : "Nội dung chương"}
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Đang gửi..." : editingId ? "Cập nhật & gửi duyệt" : "Gửi duyệt chương"}
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
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground mb-3">Chương đã gửi gần đây</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có chương nào.</p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
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
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {r.submission_status}
                    </span>
                    {r.submission_status === "rejected" || r.submission_status === "draft" ? (
                      <button
                        type="button"
                        onClick={() => onLoadForEdit(r)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary"
                      >
                        Sửa & gửi lại
                      </button>
                    ) : null}
                  </div>
                </div>
                <ChapterRejectionHistory revisions={revisionsByChapterId[r.id]} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SubmitChapter;
