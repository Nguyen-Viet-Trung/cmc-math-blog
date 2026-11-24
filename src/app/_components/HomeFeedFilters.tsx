import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildHomeFilterUrl } from "@/lib/format";
import type { Category, ThreadType } from "@/lib/types";
import { HomeFilterDropdowns } from "./HomeFilterDropdowns";

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

      {/* Một thanh lọc duy nhất: Loại bài + Chuyên mục + Trạng thái | Tổng số bài */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <HomeFilterDropdowns
          activeType={activeType}
          activeCat={activeCat}
          activeStatus={activeStatus}
          searchQuery={searchQuery}
          pageSize={pageSize}
          categories={categories}
        />

        <span className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground">
          {threadCount} bài viết
        </span>
      </div>
    </>
  );
}
