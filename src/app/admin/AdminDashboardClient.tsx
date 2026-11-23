"use client";

import { useMemo, useState } from "react";
import {
  Bug,
  CheckCircle2,
  FileText,
  Gift,
  MessageSquareWarning,
  Settings,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { AdminDashboardCounts } from "@/lib/admin-list-service";
import type { PaginatedResult } from "@/lib/pagination";
import { analyzeAdminReplyAudits } from "@/lib/rules";
import type {
  AdminReplyAuditItem,
  AdminThreadManageItem,
  FeedbackItem,
  RedemptionItem,
  RewardItem,
  SiteSettings,
  UserProfile,
} from "@/lib/types";
import { AdminFeedbacksTab } from "./_components/AdminFeedbacksTab";
import { AdminRedemptionsTab } from "./_components/AdminRedemptionsTab";
import { AdminRepliesAuditTab } from "./_components/AdminRepliesAuditTab";
import { AdminRewardsTab, type AdminNotice } from "./_components/AdminRewardsTab";
import { AdminSettingsTab } from "./_components/AdminSettingsTab";
import { AdminStudentsTab } from "./_components/AdminStudentsTab";
import { AdminThreadsTab } from "./_components/AdminThreadsTab";

type AdminTabId =
  | "rewards"
  | "redemptions"
  | "students"
  | "threads"
  | "replies"
  | "feedbacks"
  | "settings";

export function AdminDashboardClient({
  isDemo,
  settings,
  counts,
  initialRewards,
  initialRedemptions,
  initialStudents,
  initialFeedbacks,
  initialThreads,
  replies,
}: {
  isDemo: boolean;
  settings: SiteSettings;
  counts: AdminDashboardCounts;
  initialRewards: PaginatedResult<RewardItem>;
  initialRedemptions: PaginatedResult<RedemptionItem>;
  initialStudents: PaginatedResult<UserProfile>;
  initialFeedbacks: PaginatedResult<FeedbackItem>;
  initialThreads: PaginatedResult<AdminThreadManageItem>;
  replies: AdminReplyAuditItem[];
}) {
  const [tab, setTab] = useState<AdminTabId>("rewards");
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const [replySearch, setReplySearch] = useState("");

  const { flagsByReplyId, suspiciousPairs } = useMemo(
    () => analyzeAdminReplyAudits(replies),
    [replies]
  );

  const suspiciousRepliesCount = Object.keys(flagsByReplyId).length;

  const tabs: { id: AdminTabId; label: string; icon: typeof Gift }[] = [
    { id: "rewards", label: `Quà tặng (${counts.rewardsCount})`, icon: Gift },
    {
      id: "redemptions",
      label: `Đổi quà (${counts.pendingRedemptionsCount} mới)`,
      icon: CheckCircle2,
    },
    { id: "students", label: `Học sinh (${counts.studentsCount})`, icon: Users },
    {
      id: "threads",
      label: `Bài viết & Thưởng (${counts.threadsCount})`,
      icon: FileText,
    },
    {
      id: "replies",
      label:
        suspiciousRepliesCount > 0
          ? `Kiểm duyệt Bình luận (${replies.length} · ${suspiciousRepliesCount} nghi vấn)`
          : `Kiểm duyệt Bình luận (${replies.length})`,
      icon: MessageSquareWarning,
    },
    {
      id: "feedbacks",
      label: `Góp ý (${counts.openFeedbacksCount} mở)`,
      icon: Bug,
    },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <h1 className="heading-1">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">
            {isDemo
              ? "Đang ở chế độ chưa kết nối cơ sở dữ liệu."
              : "Quản lý học sinh, kiểm duyệt bình luận chống buff điểm, thưởng tác giả bài viết và cửa hàng đổi quà."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 rounded-lg border border-border bg-card px-4 py-2.5 text-xs tabular-nums">
          <div>
            <span className="block text-[11px] text-muted-foreground">
              Học sinh
            </span>
            <strong className="text-base font-bold text-foreground">
              {counts.studentsCount}
            </strong>
          </div>
          <div className="border-l border-border pl-4">
            <span className="block text-[11px] text-muted-foreground">
              Đơn chờ duyệt
            </span>
            <strong className="text-base font-bold text-bounty">
              {counts.pendingRedemptionsCount}
            </strong>
          </div>
          <div className="border-l border-border pl-4">
            <span className="block text-[11px] text-muted-foreground">
              Nghi vấn buff
            </span>
            <strong
              className={`text-base font-bold ${
                suspiciousRepliesCount > 0
                  ? "text-destructive"
                  : "text-success"
              }`}
            >
              {suspiciousRepliesCount}
            </strong>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <Button
              key={t.id}
              type="button"
              variant={tab === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {notice && (
        <Alert
          variant={notice.type === "success" ? "success" : "destructive"}
          className="font-medium"
        >
          {notice.text}
        </Alert>
      )}

      {tab === "rewards" && (
        <AdminRewardsTab
          initialRewards={initialRewards}
          onNotice={setNotice}
        />
      )}
      {tab === "redemptions" && (
        <AdminRedemptionsTab
          initialRedemptions={initialRedemptions}
          onNotice={setNotice}
        />
      )}
      {tab === "students" && (
        <AdminStudentsTab
          initialStudents={initialStudents}
          onNotice={setNotice}
          onInspectStudentReplies={(email) => {
            setReplySearch(email);
            setTab("replies");
          }}
        />
      )}
      {tab === "threads" && (
        <AdminThreadsTab
          initialThreads={initialThreads}
          onNotice={setNotice}
        />
      )}
      {tab === "replies" && (
        <AdminRepliesAuditTab
          replies={replies}
          flagsByReplyId={flagsByReplyId}
          suspiciousPairs={suspiciousPairs}
          search={replySearch}
          onSearchChange={setReplySearch}
          onNotice={setNotice}
        />
      )}
      {tab === "feedbacks" && (
        <AdminFeedbacksTab
          initialFeedbacks={initialFeedbacks}
          onNotice={setNotice}
        />
      )}
      {tab === "settings" && (
        <AdminSettingsTab settings={settings} onNotice={setNotice} />
      )}
    </div>
  );
}
