"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const resolvedOptions =
    pageSize && !pageSizeOptions.includes(pageSize)
      ? [...pageSizeOptions, pageSize].sort((a, b) => a - b)
      : pageSizeOptions;

  const rangeStart = pageSize ? (safePage - 1) * pageSize + 1 : null;
  const rangeEnd = pageSize ? Math.min(safePage * pageSize, totalCount) : null;

  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-col gap-3 border-t border-border/70 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Trái: Thông tin số bản ghi đang hiển thị */}
      <div className="flex items-center gap-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {rangeStart !== null && rangeEnd !== null ? (
          <span>
            Hiển thị{" "}
            <span className="font-medium text-foreground">
              {rangeStart}–{rangeEnd}
            </span>{" "}
            trong{" "}
            <span className="font-medium text-foreground">{totalCount}</span>{" "}
            {itemLabel}
          </span>
        ) : (
          <span>
            Tổng{" "}
            <span className="font-medium text-foreground">{totalCount}</span>{" "}
            {itemLabel}
          </span>
        )}
      </div>

      {/* Phải: Số dòng mỗi trang | Trang X / Y | « ‹ › » */}
      <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end sm:gap-6">
        {onPageSizeChange && pageSize !== undefined && (
          <label className="inline-flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap font-medium text-muted-foreground">
              Số dòng / trang
            </span>
            <span className="relative inline-flex items-center">
              <select
                aria-label={`Số ${itemLabel} mỗi trang`}
                value={pageSize}
                disabled={isLoading}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 w-[68px] cursor-pointer appearance-none rounded-md border border-input bg-background pl-2.5 pr-7 text-xs font-medium tabular-nums text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resolvedOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronsUpDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground"
              />
            </span>
          </label>
        )}

        <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
          Trang {safePage} / {safeTotalPages}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Trang đầu"
            title="Trang đầu"
            disabled={safePage <= 1 || isLoading}
            onClick={() => onPageChange(1)}
            className="h-8 w-8"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Trang trước"
            title="Trang trước"
            disabled={safePage <= 1 || isLoading}
            onClick={() => onPageChange(safePage - 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Trang sau"
            title="Trang sau"
            disabled={safePage >= safeTotalPages || isLoading}
            onClick={() => onPageChange(safePage + 1)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Trang cuối"
            title="Trang cuối"
            disabled={safePage >= safeTotalPages || isLoading}
            onClick={() => onPageChange(safeTotalPages)}
            className="h-8 w-8"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
