"use client";

import {
  Bug,
  CheckCircle2,
  FileText,
  Gift,
  Layers,
  MessageSquareWarning,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import type { AdminDashboardCounts } from "@/lib/admin-list-service";
import { cn } from "@/lib/utils";

export type AdminTabId =
  | "rewards"
  | "redemptions"
  | "students"
  | "threads"
  | "collections"
  | "replies"
  | "feedbacks"
  | "settings";

export interface AdminNavItem {
  id: AdminTabId;
  label: string;
  description: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeTone?: "default" | "bounty" | "destructive";
}

export interface AdminNavGroup {
  heading: string;
  items: AdminNavItem[];
}

export function buildAdminNavGroups(
  counts: AdminDashboardCounts,
  detectedSuspiciousCount: number | null
): AdminNavGroup[] {
  const hasSuspicious =
    detectedSuspiciousCount !== null && detectedSuspiciousCount > 0;
  return [
    {
      heading: "Cộng đồng & Nội dung",
      items: [
        {
          id: "students",
          label: "Học sinh",
          description:
            "Quản lý tài khoản, điều chỉnh điểm đổi quà, ngày gia nhập và phân quyền khóa.",
          icon: Users,
          badgeText: String(counts.studentsCount),
        },
        {
          id: "threads",
          label: "Bài viết & Thưởng",
          description:
            "Phân loại bài viết và trao điểm thưởng khuyến khích cho tác giả bài hay.",
          icon: FileText,
          badgeText: String(counts.threadsCount),
        },
        {
          id: "collections",
          label: "Chuyên đề",
          description:
            "Tạo lộ trình ôn tập và sắp xếp các bài toán tiêu biểu theo chủ đề.",
          icon: Layers,
          badgeText: String(counts.collectionsCount),
        },
        {
          id: "replies",
          label: "Kiểm duyệt Bình luận",
          description:
            "Rà soát dấu hiệu trao điểm chéo (buff điểm), thu hồi điểm hoặc xóa bình luận vi phạm.",
          icon: MessageSquareWarning,
          badgeText: hasSuspicious
            ? `${detectedSuspiciousCount} nghi vấn`
            : String(counts.repliesCount),
          badgeTone: hasSuspicious ? "destructive" : "default",
        },
      ],
    },
    {
      heading: "Cửa hàng & Phản hồi",
      items: [
        {
          id: "rewards",
          label: "Quà tặng",
          description:
            "Thiết lập danh mục phần quà, mốc điểm quy đổi và số lượng tồn kho.",
          icon: Gift,
          badgeText: String(counts.rewardsCount),
        },
        {
          id: "redemptions",
          label: "Đổi quà",
          description:
            "Duyệt đơn yêu cầu đổi quà, xác nhận đã trao hoặc từ chối hoàn điểm.",
          icon: CheckCircle2,
          badgeText:
            counts.pendingRedemptionsCount > 0
              ? `${counts.pendingRedemptionsCount} mới`
              : String(counts.redemptionsCount),
          badgeTone:
            counts.pendingRedemptionsCount > 0 ? "bounty" : "default",
        },
        {
          id: "feedbacks",
          label: "Góp ý & Báo lỗi",
          description:
            "Tiếp nhận, phản hồi công khai và cập nhật tiến độ xử lý góp ý từ thành viên.",
          icon: Bug,
          badgeText:
            counts.openFeedbacksCount > 0
              ? `${counts.openFeedbacksCount} mở`
              : String(counts.feedbacksCount),
          badgeTone: counts.openFeedbacksCount > 0 ? "bounty" : "default",
        },
      ],
    },
    {
      heading: "Hệ thống",
      items: [
        {
          id: "settings",
          label: "Cài đặt",
          description:
            "Tên diễn đàn, điểm thưởng mặc định khi giải bài và thông báo ghim trang chủ.",
          icon: Settings,
        },
      ],
    },
  ];
}

export function AdminSubNav({
  groups,
  activeTab,
  onSelect,
}: {
  groups: AdminNavGroup[];
  activeTab: AdminTabId;
  onSelect: (tab: AdminTabId) => void;
}) {
  return (
    <>
      {/* Mobile / Tablet: Compact dropdown switcher — không xếp chồng 2 hàng nút */}
      <div className="lg:hidden">
        <NativeSelect
          aria-label="Chọn mục quản trị"
          value={activeTab}
          onChange={(e) => onSelect(e.target.value as AdminTabId)}
          className="h-10 font-medium"
        >
          {groups.map((group) => (
            <optgroup key={group.heading} label={group.heading}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.badgeText ? ` (${item.badgeText})` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </NativeSelect>
      </div>

      {/* Desktop: Sticky grouped vertical sub-sidebar (216px) */}
      <aside
        aria-label="Phân mục Admin Portal"
        className="hidden lg:block"
      >
        <div className="sticky top-[68px] space-y-5 rounded-lg border border-border bg-card p-3">
          {groups.map((group) => (
            <div key={group.heading} className="space-y-1">
              <p className="section-label px-2 pb-1">{group.heading}</p>
              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                        active
                          ? "bg-muted font-semibold text-foreground"
                          : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {active && (
                        <span className="absolute bottom-1.5 left-0 top-1.5 w-[2.5px] rounded-full bg-primary" />
                      )}
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badgeText && (
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                            item.badgeTone === "destructive"
                              ? "bg-destructive/15 text-destructive"
                              : item.badgeTone === "bounty"
                                ? "bg-bounty-surface text-bounty-foreground"
                                : active
                                  ? "bg-background text-foreground"
                                  : "bg-muted text-muted-foreground"
                          )}
                        >
                          {item.badgeText}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
