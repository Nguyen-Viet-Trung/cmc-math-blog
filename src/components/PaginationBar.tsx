"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVisiblePageNumbers } from "@/lib/pagination";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalCount: number;
  itemLabel?: string;
  isLoading?: boolean;
  onPageChange: (nextPage: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (nextPageSize: number) => void;
}

export function PaginationBar({
  page,
  totalPages,
  totalCount,
  itemLabel = "mục",
  isLoading = false,
  onPageChange,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
}: PaginationBarProps) {
  if (totalCount === 0) return null;
  if (totalPages <= 1 && !onPageSizeChange) return null;

  const pageNumbers = getVisiblePageNumbers(page, totalPages);
  const resolvedOptions =
    pageSize && !pageSizeOptions.includes(pageSize)
      ? [...pageSizeOptions, pageSize].sort((a, b) => a - b)
      : pageSizeOptions;

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Trang {page} / {totalPages} ({totalCount} {itemLabel})
        </span>

        {onPageSizeChange && pageSize !== undefined && (
          <label className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="hidden sm:inline">Hiển thị</span>
            <select
              aria-label={`Số ${itemLabel} mỗi trang`}
              value={pageSize}
              disabled={isLoading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-card px-2 text-xs font-medium tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {resolvedOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Trang trước"
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
                aria-current={entry === page ? "page" : undefined}
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
            aria-label="Trang sau"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
            className="h-7 px-2 text-xs"
          >
            <span className="hidden sm:inline">Sau</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </nav>
  );
}
