"use client";

import { AlertTriangle } from "lucide-react";

export function SetupBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      role="status"
      className="border-b border-bounty-border bg-bounty-surface px-4 py-2 text-xs sm:text-sm text-bounty-foreground"
    >
      <div className="container flex items-center gap-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-bounty" />
        <p className="leading-snug">
          <strong>Chế độ xem trước (Demo Mode):</strong> Sau khi điền khóa
          Supabase vào <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">key.txt</code>, chạy{" "}
          <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">npm run setup</code> để
          kết nối cơ sở dữ liệu thật.
        </p>
      </div>
    </div>
  );
}
