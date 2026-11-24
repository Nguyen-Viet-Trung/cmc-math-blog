"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import type { ReportTargetType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ReportContentModal = dynamic(
  () =>
    import("@/components/ReportContentModal").then(
      (m) => m.ReportContentModal
    ),
  { ssr: false }
);

const TARGET_LABEL_LOWER: Record<ReportTargetType, string> = {
  thread: "bài viết",
  reply: "bình luận",
  user: "thành viên",
};

export function ReportContentDialog({
  targetType,
  targetId,
  targetTitle,
  triggerLabel = "Báo cáo",
  compact = true,
  className,
}: {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  triggerLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!FEATURE_FLAGS.communitySafety) {
    return null;
  }

  const labelLower = TARGET_LABEL_LOWER[targetType];

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={
          targetTitle
            ? `Báo cáo ${labelLower} ${targetTitle}`
            : `Báo cáo ${labelLower}`
        }
        title={`Báo cáo ${labelLower} vi phạm`}
        className={cn(
          compact ? "h-7 px-2 text-xs" : "h-8 px-2.5 text-xs",
          "text-muted-foreground hover:text-destructive",
          className
        )}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{triggerLabel}</span>
      </Button>

      {open && (
        <ReportContentModal
          open={open}
          onOpenChange={setOpen}
          target={{ targetType, targetId, targetTitle }}
        />
      )}
    </>
  );
}
