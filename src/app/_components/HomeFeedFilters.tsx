import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildHomeFilterUrl } from "@/lib/format";
import type { Category, ThreadType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_TABS: { key: ThreadType | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "question", label: "Hỏi bài" },
  { key: "challenge", label: "Thử thách" },
  { key: "news", label: "News" },
  { key: "research", label: "Research" },
];

const STATUS_OPTIONS = [
  { key: "all", label: "Mọi trạng thái" },
  { key: "open", label: "Chờ giải" },
  { key: "solved", label: "Đã giải" },
] as const;

interface HomeFeedFiltersProps {
  activeType: ThreadType | "all";
  activeCat: string;
  activeStatus: "all" | "open" | "solved";
  searchQuery: string;
  pageSize?: number;
  threadCount: number;
  categories: Category[];
}

export function HomeFeedFilters({
  activeType,
  activeCat,
  activeStatus,
  searchQuery,
  pageSize = 20,
  threadCount,
  categories,
}: HomeFeedFiltersProps) {
  return (
    <>
      <form method="GET" action="/" className="flex items-center gap-2">
        {activeType !== "all" && (
          <input type="hidden" name="type" value={activeType} />
        )}
        {activeCat && <input type="hidden" name="cat" value={activeCat} />}
        {activeStatus !== "all" && (
          <input type="hidden" name="status" value={activeStatus} />
        )}
        {pageSize !== 20 && (
          <input type="hidden" name="pageSize" value={pageSize} />
        )}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={searchQuery}
            name="q"
            defaultValue={searchQuery}
            placeholder="Tìm kiếm bài toán, bài News, Research hoặc phương pháp giải..."
            className="h-10 pl-9 pr-9"
          />
          {searchQuery && (
            <Link
              href={buildHomeFilterUrl({
                type: activeType,
                cat: activeCat,
                status: activeStatus,
                pageSize,
              })}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
        <Button type="submit" variant="secondary" className="h-10 px-4">
          Tìm
        </Button>
      </form>

      {/* Hàng 1: Tab phân loại bài viết + Bộ lọc trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="-mb-px flex items-center gap-5 text-sm">
          {TYPE_TABS.map((tab) => {
            const isActive = activeType === tab.key;
            return (
              <Link
                key={tab.key}
                href={buildHomeFilterUrl({
                  type: tab.key,
                  cat: activeCat,
                  status:
                    tab.key === "news" || tab.key === "research"
                      ? "all"
                      : activeStatus,
                  q: searchQuery,
                  pageSize,
                })}
                className={cn(
                  "border-b-2 pb-2.5 text-[13.5px] transition-colors",
                  isActive
                    ? "border-primary font-semibold text-foreground"
                    : "border-transparent font-normal text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pb-2 text-xs">
          {(activeType === "all" || activeType === "question") && (
            <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5">
              {STATUS_OPTIONS.map((st) => {
                const active = activeStatus === st.key;
                return (
                  <Link
                    key={st.key}
                    href={buildHomeFilterUrl({
                      type: activeType,
                      cat: activeCat,
                      status: st.key,
                      q: searchQuery,
                      pageSize,
                    })}
                    className={cn(
                      "rounded px-2 py-0.5 transition-colors",
                      active
                        ? "bg-card font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {st.label}
                  </Link>
                );
              })}
            </div>
          )}

          <span className="tabular-nums text-muted-foreground">
            {threadCount} bài
          </span>
        </div>
      </div>

      {/* Hàng 2: Bộ lọc chuyên mục Toán phẳng */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={buildHomeFilterUrl({
              type: activeType,
              status: activeStatus,
              q: searchQuery,
              pageSize,
            })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs transition-colors",
              !activeCat
                ? "bg-primary/12 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Tất cả chuyên mục
          </Link>
          {categories.map((c) => {
            const selected = activeCat === c.slug;
            return (
              <Link
                key={c.id}
                href={buildHomeFilterUrl({
                  type: activeType,
                  cat: c.slug,
                  status: activeStatus,
                  q: searchQuery,
                  pageSize,
                })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs transition-colors",
                  selected
                    ? "bg-primary/12 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
