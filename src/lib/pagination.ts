export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function normalizePagination(
  pageRaw?: string | number | null,
  pageSizeRaw?: string | number | null,
  defaultPageSize = 10,
  maxPageSize = 50
): { page: number; pageSize: number; offset: number } {
  const parsedPage = Number(pageRaw);
  const parsedSize = Number(pageSizeRaw);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1
      ? Math.floor(parsedPage)
      : 1;
  const pageSize =
    Number.isFinite(parsedSize) && parsedSize >= 1
      ? Math.min(maxPageSize, Math.floor(parsedSize))
      : defaultPageSize;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const safeTotal = Math.max(0, Math.floor(totalCount));
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  return {
    items,
    totalCount: safeTotal,
    page: safePage,
    pageSize: safeSize,
    totalPages,
  };
}

export function paginateSlice<T>(
  allItems: readonly T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalCount = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safeSize));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeSize;
  return {
    items: allItems.slice(start, start + safeSize),
    totalCount,
    page: safePage,
    pageSize: safeSize,
    totalPages,
  };
}

export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}
