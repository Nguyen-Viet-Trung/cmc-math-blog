"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

interface UrlPageSizeSelectProps {
  basePath: string;
  pageSize: number;
  defaultPageSize: number;
  options?: number[];
  queryParams?: Record<string, string | undefined>;
  itemLabel?: string;
}

export function UrlPageSizeSelect({
  basePath,
  pageSize,
  defaultPageSize,
  options = [10, 20, 30, 50],
  queryParams = {},
  itemLabel = "mục",
}: UrlPageSizeSelectProps) {
  const router = useRouter();
  const resolvedOptions = options.includes(pageSize)
    ? options
    : [...options, pageSize].sort((a, b) => a - b);

  function handleChange(nextSize: number) {
    const sp = new URLSearchParams();
    for (const [key, val] of Object.entries(queryParams)) {
      if (val && val.trim() !== "") {
        sp.set(key, val.trim());
      }
    }
    if (nextSize !== defaultPageSize) {
      sp.set("pageSize", String(nextSize));
    }
    const qs = sp.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <label className="inline-flex shrink-0 items-center gap-2">
      <span className="whitespace-nowrap font-medium text-muted-foreground">
        Số dòng / trang
      </span>
      <span className="relative inline-flex items-center">
        <select
          aria-label={`Số ${itemLabel} mỗi trang`}
          value={pageSize}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="h-8 w-[68px] cursor-pointer appearance-none rounded-md border border-input bg-background pl-2.5 pr-7 text-xs font-medium tabular-nums text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  );
}
