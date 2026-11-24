"use client";

import { History, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTimeVN } from "@/lib/format";

interface DraftRestoreNoticeProps {
  restoredAt: number;
  onDiscard: () => void;
  onDismiss: () => void;
}

export function DraftRestoreNotice({
  restoredAt,
  onDiscard,
  onDismiss,
}: DraftRestoreNoticeProps) {
  const restoredDate = Number.isFinite(restoredAt)
    ? new Date(restoredAt)
    : null;
  const formattedTime =
    restoredDate && !Number.isNaN(restoredDate.getTime())
      ? formatDateTimeVN(restoredDate.toISOString())
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/45 px-3 py-2 text-xs text-muted-foreground"
    >
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <History
          className="h-3.5 w-3.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <span>
          {formattedTime ? (
            <>
              Đã khôi phục bản nháp lưu tự động lúc{" "}
              <strong className="font-medium tabular-nums text-foreground">
                {formattedTime}
              </strong>
              .
            </>
          ) : (
            "Đã khôi phục bản nháp lưu tự động gần đây."
          )}
        </span>
      </span>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          Xóa nháp
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          aria-label="Ẩn thông báo khôi phục bản nháp"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
