import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, CheckCircle2, XCircle, RefreshCcw, History } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function ModeratorChapterRevisions({ revisions }) {
  const [open, setOpen] = useState(false);
  if (!revisions?.length) return null;
  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-accent"
      >
        <History className="h-3.5 w-3.5" />
        Snapshot khi từ chối ({revisions.length})
      </button>
      {open ? (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-secondary/15 p-2 text-[11px]">
          {revisions.map((rev) => {
            const s = rev.snapshot || {};
            return (
              <li key={rev.id} className="rounded border border-border/50 bg-card/80 p-2">
                <p className="font-medium text-foreground">
                  {new Date(rev.created_at).toLocaleString("vi-VN")} · {rev.previous_submission_status}
                </p>
                {rev.moderation_note ? (
                  <p className="mt-0.5 text-rose-600">Ghi chú: {rev.moderation_note}</p>
                ) : null}
                <p className="mt-1 text-muted-foreground">
                  Chương {s.chapter_number}: {s.title}
                </p>
                <p className="mt-1 line-clamp-4 text-muted-foreground">{s.content}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const FILTERS = [
  { key: "pending_review", label: "Chờ duyệt" },
  { key: "rejected", label: "Đã từ chối" },
  { key: "published", label: "Đã phát hành" },
  { key: "all", label: "Tất cả" },
];

function ChapterSubmissionModeration() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [filter, setFilter] = useState("pending_review");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [revisionsByChapterSubmissionId, setRevisionsByChapterSubmissionId] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError("");
    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase chưa cấu hình.");
      setLoading(false);
      return;
    }

    const { data: checkData, error: checkError } = await supabase.rpc("is_submission_reviewer");
    if (checkError) {
      setError(checkError.message || "Không xác thực được quyền duyệt.");
      setLoading(false);
      return;
    }
    setCanReview(!!checkData);
    if (!checkData) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("chapter_submissions")
      .select(
        "id,novel_id,chapter_number,title,submission_status,created_at,reviewed_at,moderation_note,published_chapter_id"
      )
      .order("created_at", { ascending: false })
      .limit(160);

    if (fetchError) {
      setError(fetchError.message || "Không tải được danh sách chương gửi.");
      setRows([]);
      setRevisionsByChapterSubmissionId({});
    } else {
      const list = data || [];
      setRows(list);
      const ids = list.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) {
        setRevisionsByChapterSubmissionId({});
      } else {
        const { data: revRows, error: revErr } = await supabase
          .from("chapter_submission_revisions")
          .select(
            "id,chapter_submission_id,snapshot,previous_submission_status,moderation_note,created_at"
          )
          .in("chapter_submission_id", ids)
          .order("created_at", { ascending: false });
        if (revErr) {
          console.warn("[Moderation] chapter revisions:", revErr.message);
          setRevisionsByChapterSubmissionId({});
        } else {
          const map = {};
          (revRows || []).forEach((rev) => {
            const cid = rev.chapter_submission_id;
            if (!map[cid]) map[cid] = [];
            map[cid].push(rev);
          });
          setRevisionsByChapterSubmissionId(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((x) => x.submission_status === filter);
  }, [rows, filter]);

  const act = async (submissionId, action) => {
    setBusyId(submissionId);
    setError("");
    setNotice("");
    const note = window.prompt(
      action === "approve"
        ? "Ghi chú duyệt chương (tuỳ chọn):"
        : "Lý do từ chối chương (khuyến nghị nhập):",
      ""
    );

    const { data, error: rpcError } = await supabase.rpc("review_chapter_submission", {
      p_chapter_submission_id: submissionId,
      p_action: action,
      p_note: note || null,
    });
    setBusyId(null);

    if (rpcError) {
      setError(rpcError.message || "Xử lý duyệt chương thất bại.");
      return;
    }
    setNotice(
      action === "approve"
        ? `Đã duyệt chương. Chapter ID: ${data?.chapter_id ?? "-"}`
        : "Đã từ chối chương."
    );
    loadData();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Đang tải moderation chương...</p>;
  }

  if (!canReview) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Tài khoản này chưa có quyền reviewer/admin. Hãy thêm role trong `public.user_roles`.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            Duyệt chương cộng đồng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Duyệt chương vào bảng `chapters` hoặc từ chối kèm ghi chú.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          Làm mới
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === f.key
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-emerald-600">{notice}</p>}

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {filteredRows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Không có chương ở bộ lọc này.</p>
        ) : (
          filteredRows.map((row) => (
            <div key={row.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">
                    Novel #{row.novel_id} · Chương {row.chapter_number}: {row.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gửi lúc: {new Date(row.created_at).toLocaleString("vi-VN")}
                  </p>
                  {row.moderation_note ? (
                    <p className="text-xs text-rose-600 mt-1">Ghi chú: {row.moderation_note}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                  {row.submission_status}
                </span>
              </div>

              {row.submission_status === "pending_review" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => act(row.id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Duyệt chương
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => act(row.id, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </button>
                </div>
              ) : null}
              <ModeratorChapterRevisions revisions={revisionsByChapterSubmissionId[row.id]} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChapterSubmissionModeration;
