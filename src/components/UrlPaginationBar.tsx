import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrlPageSizeSelect } from "@/components/UrlPageSizeSelect";

interface UrlPaginationBarProps {
  ariaLabel?: string;
  basePath: string;
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  defaultPageSize: number;
  pageSizeOptions?: number[];
  queryParams?: Record<string, string | undefined>;
  itemLabel?: string;
}

function buildPageHref(
  basePath: string,
  targetPage: number,
  pageSize: number,
  defaultPageSize: number,
  queryParams: Record<string, string | undefined>
): string {
  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(queryParams)) {
    if (val && val.trim() !== "") {
      sp.set(key, val.trim());
    }
  }
  if (targetPage > 1) {
    sp.set("page", String(targetPage));
  }
  if (pageSize !== defaultPageSize) {
    sp.set("pageSize", String(pageSize));
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function UrlPaginationBar({
  ariaLabel = "Phân trang",
  basePath,
  page,
  totalPages,
  totalCount,
  pageSize,
  defaultPageSize,
  pageSizeOptions = [10, 20, 30, 50],
  queryParams = {},
  itemLabel = "mục",
}: UrlPaginationBarProps) {
  if (totalCount === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);

  const canPrev = safePage > 1;
  const canNext = safePage < safeTotalPages;

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-col gap-3 border-t border-border/70 pt-3 text-xs sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Trái: Khoảng bản ghi đang hiển thị */}
      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
        Hiển thị{" "}
        <span className="font-medium text-foreground">
          {rangeStart}–{rangeEnd}
        </span>{" "}
        trong{" "}
        <span className="font-medium text-foreground">{totalCount}</span>{" "}
        {itemLabel}
      </span>

      {/* Phải: Số dòng mỗi trang | Trang X / Y | « ‹ › » */}
      <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end sm:gap-6">
        <UrlPageSizeSelect
          basePath={basePath}
          pageSize={pageSize}
          defaultPageSize={defaultPageSize}
          options={pageSizeOptions}
          queryParams={queryParams}
          itemLabel={itemLabel}
        />

        <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
          Trang {safePage} / {safeTotalPages}
        </span>

        <div className="flex items-center gap-1.5">
          {canPrev ? (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Trang đầu"
            >
              <Link
                href={buildPageHref(
                  basePath,
                  1,
                  pageSize,
                  defaultPageSize,
                  queryParams
                )}
                aria-label="Trang đầu"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label="Trang đầu"
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
          )}

          {canPrev ? (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Trang trước"
            >
              <Link
                href={buildPageHref(
                  basePath,
                  safePage - 1,
                  pageSize,
                  defaultPageSize,
                  queryParams
                )}
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label="Trang trước"
              className="h-8 w-8"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}

          {canNext ? (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Trang sau"
            >
              <Link
                href={buildPageHref(
                  basePath,
                  safePage + 1,
                  pageSize,
                  defaultPageSize,
                  queryParams
                )}
                aria-label="Trang sau"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label="Trang sau"
              className="h-8 w-8"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {canNext ? (
            <Button
              asChild
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title="Trang cuối"
            >
              <Link
                href={buildPageHref(
                  basePath,
                  safeTotalPages,
                  pageSize,
                  defaultPageSize,
                  queryParams
                )}
                aria-label="Trang cuối"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              disabled
              aria-label="Trang cuối"
              className="h-8 w-8"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
