"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVisiblePageNumbers } from "@/lib/pagination";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalCount: number;
  itemLabel?: string;
  isLoading?: boolean;
  onPageChange: (nextPage: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  totalCount,
  itemLabel = "mục",
  isLoading = false,
  onPageChange,
}: PaginationBarProps) {
  if (totalPages <= 1 && totalCount === 0) return null;
  if (totalPages <= 1) return null;

  const pageNumbers = getVisiblePageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs"
    >
      <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Trang {page} / {totalPages} ({totalCount} {itemLabel})
      </span>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(page - 1)}
          className="h-7 px-2 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Trước</span>
        </Button>

        {pageNumbers.map((entry, idx) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1.5 text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={entry}
              type="button"
              variant={entry === page ? "default" : "outline"}
              size="sm"
              disabled={isLoading}
              onClick={() => onPageChange(entry)}
              className="h-7 min-w-[28px] px-2 text-xs tabular-nums"
            >
              {entry}
            </Button>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isLoading}
          onClick={() => onPageChange(page + 1)}
          className="h-7 px-2 text-xs"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}
