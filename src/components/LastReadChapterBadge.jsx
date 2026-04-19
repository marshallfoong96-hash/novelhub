import { Check } from "lucide-react";

/** Mục lục / danh sách chương — đánh dấu chương đọc gần nhất */
export default function LastReadChapterBadge() {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 mt-0.5 h-8 w-8 rounded-lg border-2 border-red-200 bg-red-50 text-red-600 shadow-sm dark:bg-red-950/45 dark:border-red-400/40 dark:text-red-300"
      title="Chương đọc gần nhất"
      aria-label="Chương đọc gần nhất"
    >
      <Check className="w-5 h-5" strokeWidth={2.75} aria-hidden />
    </span>
  );
}
