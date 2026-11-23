import type { BadgeProps } from "@/components/ui/badge";
import type { FeedbackCategory, FeedbackStatus } from "@/lib/types";

export const CATEGORY_META: Record<
  FeedbackCategory,
  { label: string; variant: BadgeProps["variant"] }
> = {
  bug: { label: "Báo lỗi (Bug)", variant: "destructive" },
  feature: { label: "Đề xuất tính năng", variant: "subtle" },
  ui_ux: { label: "Giao diện / Trải nghiệm", variant: "bounty" },
  other: { label: "Góp ý khác", variant: "secondary" },
};

export const STATUS_META: Record<
  FeedbackStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  open: { label: "Mới tiếp nhận", variant: "secondary" },
  in_progress: { label: "Đang xử lý / Nâng cấp", variant: "subtle" },
  resolved: { label: "Đã hoàn thành cập nhật", variant: "success" },
  closed: { label: "Đã đóng", variant: "outline" },
};
