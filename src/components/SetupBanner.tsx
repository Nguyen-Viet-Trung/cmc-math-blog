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
          <strong>Thông báo hệ thống:</strong> Kết nối cơ sở dữ liệu hiện đang
          tạm gián đoạn. Một số tính năng đăng nhập và lưu dữ liệu có thể chưa
          khả dụng.
        </p>
      </div>
    </div>
  );
}
