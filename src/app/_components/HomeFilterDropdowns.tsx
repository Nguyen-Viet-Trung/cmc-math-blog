"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, Filter, Layers, RotateCcw } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { buildHomeFilterUrl } from "@/lib/format";
import type { Category, HomeThreadStatusFilter, ThreadType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { key: ThreadType | "all"; label: string }[] = [
  { key: "all", label: "Tất cả loại bài" },
  { key: "question", label: "Hỏi bài" },
  { key: "challenge", label: "Thử thách" },
  { key: "news", label: "News" },
  { key: "research", label: "Research" },
];

const BASE_STATUS_OPTIONS: { key: HomeThreadStatusFilter; label: string }[] = [
  { key: "all", label: "Mọi trạng thái" },
  { key: "open", label: "Chờ giải" },
  { key: "unanswered", label: "Chưa có lời giải" },
  { key: "solved", label: "Đã giải" },
];

interface HomeFilterDropdownsProps {
  activeType: ThreadType | "all";
  activeCat: string;
  activeStatus: HomeThreadStatusFilter;
  searchQuery: string;
  pageSize: number;
  categories: Category[];
}

export function HomeFilterDropdowns({
  activeType,
  activeCat,
  activeStatus,
  searchQuery,
  pageSize,
  categories,
}: HomeFilterDropdownsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const unansweredEnabled = isFeatureEnabled("unansweredFilter");
  const statusOptions = unansweredEnabled
    ? BASE_STATUS_OPTIONS
    : BASE_STATUS_OPTIONS.filter((opt) => opt.key !== "unanswered");

  const showStatusDropdown = activeType === "all" || activeType === "question";
  const hasDropdownFilter =
    activeType !== "all" ||
    Boolean(activeCat) ||
    (showStatusDropdown && activeStatus !== "all");

  function navigateWith(next: {
    type?: ThreadType | "all";
    cat?: string;
    status?: HomeThreadStatusFilter;
  }) {
    const resolvedType = next.type ?? activeType;
    const resolvedCat = next.cat !== undefined ? next.cat : activeCat;
    const resolvedStatus =
      next.status ??
      (resolvedType !== "all" && resolvedType !== "question"
        ? "all"
        : activeStatus);

    const url = buildHomeFilterUrl({
      type: resolvedType,
      cat: resolvedCat || undefined,
      status: resolvedStatus,
      q: searchQuery,
      pageSize,
    });

    startTransition(() => {
      router.push(url);
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 transition-opacity",
        isPending && "opacity-70"
      )}
    >
      {/* Dropdown 1: Phân loại bài viết */}
      <div className="relative w-full sm:w-[152px]">
        <Filter
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2",
            activeType !== "all" ? "text-primary" : "text-muted-foreground"
          )}
        />
        <NativeSelect
          aria-label="Lọc theo loại bài viết"
          value={activeType}
          onChange={(e) =>
            navigateWith({ type: e.target.value as ThreadType | "all" })
          }
          className={cn(
            "h-8 pl-8 pr-7 text-xs",
            activeType !== "all"
              ? "border-primary/50 bg-primary/5 font-semibold text-foreground"
              : "text-muted-foreground"
          )}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Dropdown 2: Danh sách chuyên mục Toán */}
      {categories.length > 0 && (
        <div className="relative w-full sm:w-[205px]">
          <Layers
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2",
              activeCat ? "text-primary" : "text-muted-foreground"
            )}
          />
          <NativeSelect
            aria-label="Lọc theo chuyên mục Toán"
            value={activeCat}
            onChange={(e) => navigateWith({ cat: e.target.value })}
            className={cn(
              "h-8 pl-8 pr-7 text-xs",
              activeCat
                ? "border-primary/50 bg-primary/5 font-semibold text-foreground"
                : "text-muted-foreground"
            )}
          >
            <option value="">Tất cả chuyên mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {/* Dropdown 3: Trạng thái bài viết */}
      {showStatusDropdown && (
        <div className="relative w-full sm:w-[164px]">
          <CircleDot
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2",
              activeStatus !== "all" ? "text-primary" : "text-muted-foreground"
            )}
          />
          <NativeSelect
            aria-label="Lọc theo trạng thái bài viết"
            value={activeStatus}
            onChange={(e) =>
              navigateWith({
                status: e.target.value as HomeThreadStatusFilter,
              })
            }
            className={cn(
              "h-8 pl-8 pr-7 text-xs",
              activeStatus !== "all"
                ? "border-primary/50 bg-primary/5 font-semibold text-foreground"
                : "text-muted-foreground"
            )}
          >
            {statusOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {hasDropdownFilter && (
        <button
          type="button"
          onClick={() => navigateWith({ type: "all", cat: "", status: "all" })}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Đặt lại toàn bộ bộ lọc"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  );
}
