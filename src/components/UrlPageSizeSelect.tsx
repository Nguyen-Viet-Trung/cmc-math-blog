"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

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
    <label className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="hidden sm:inline">Hiển thị</span>
      <NativeSelect
        aria-label={`Số ${itemLabel} mỗi trang`}
        value={pageSize}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="h-8 w-auto min-w-[96px] text-xs font-medium tabular-nums"
      >
        {resolvedOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt} / trang
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

