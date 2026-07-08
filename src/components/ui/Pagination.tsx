import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3">
      <p className="text-[12px] text-text-muted">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-muted hover:bg-[#f5f5f5] hover:text-text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-[12px] font-medium text-text-primary tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-muted hover:bg-[#f5f5f5] hover:text-text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
