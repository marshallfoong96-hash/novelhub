import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/** @param {number} start @param {number} end */
function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Compact page list: [1,2,3,...,last] style when there are many pages.
 * @param {number} current 1-based
 * @param {number} totalPages
 * @returns {(number | "ellipsis")[]}
 */
export function getPaginationItems(current, totalPages) {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) return range(1, totalPages);
  if (current <= 4) return [...range(1, 5), "ellipsis", totalPages];
  if (current >= totalPages - 3) return [1, "ellipsis", ...range(totalPages - 4, totalPages)];
  return [1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages];
}

const btnBase =
  "inline-flex min-w-[2.25rem] items-center justify-center rounded-md border border-border bg-background px-2 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-secondary disabled:pointer-events-none disabled:opacity-40";

const activeBtn = "border-accent bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground";

/**
 * @param {{
 *   currentPage: number;
 *   totalPages: number;
 *   onPageChange: (page: number) => void;
 *   className?: string;
 * }} props
 */
export default function Pagination({ currentPage, totalPages, onPageChange, className = "" }) {
  if (totalPages <= 1) return null;

  const items = getPaginationItems(currentPage, totalPages);
  const go = (p) => {
    if (p < 1 || p > totalPages || p === currentPage) return;
    onPageChange(p);
  };

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`.trim()}
      aria-label="Phân trang"
    >
      <button
        type="button"
        className={btnBase}
        aria-label="Trang đầu"
        disabled={currentPage <= 1}
        onClick={() => go(1)}
      >
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnBase}
        aria-label="Trang trước"
        disabled={currentPage <= 1}
        onClick={() => go(currentPage - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {items.map((item, idx) =>
        item === "ellipsis" ? (
          <span
            key={`e-${idx}`}
            className="inline-flex min-w-[2.25rem] select-none items-center justify-center px-1 py-1.5 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`${btnBase} ${item === currentPage ? activeBtn : ""}`}
            aria-label={`Trang ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            onClick={() => go(item)}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        className={btnBase}
        aria-label="Trang sau"
        disabled={currentPage >= totalPages}
        onClick={() => go(currentPage + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnBase}
        aria-label="Trang cuối"
        disabled={currentPage >= totalPages}
        onClick={() => go(totalPages)}
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
