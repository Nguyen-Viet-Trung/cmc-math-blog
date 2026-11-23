"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboardCounts } from "@/lib/admin-list-service";
import type { PaginatedResult } from "@/lib/pagination";
import type { RewardItem, SiteSettings } from "@/lib/types";
import { AdminRewardsTab, type AdminNotice } from "./_components/AdminRewardsTab";

function AdminTabSkeleton() {
  return (
    <Card className="space-y-3 p-5">
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </Card>
  );
}

const AdminRedemptionsTab = dynamic(
  () =>
    import("./_components/AdminRedemptionsTab").then(
      (m) => m.AdminRedemptionsTab
    ),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminStudentsTab = dynamic(
  () =>
    import("./_components/AdminStudentsTab").then((m) => m.AdminStudentsTab),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminThreadsTab = dynamic(
  () => import("./_components/AdminThreadsTab").then((m) => m.AdminThreadsTab),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminRepliesAuditTab = dynamic(
  () =>
    import("./_components/AdminRepliesAuditTab").then(
      (m) => m.AdminRepliesAuditTab
    ),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminFeedbacksTab = dynamic(
  () =>
    import("./_components/AdminFeedbacksTab").then((m) => m.AdminFeedbacksTab),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminSettingsTab = dynamic(
  () =>
    import("./_components/AdminSettingsTab").then((m) => m.AdminSettingsTab),
  { loading: () => <AdminTabSkeleton /> }
);

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
}: {
  isDemo: boolean;
  settings: SiteSettings;
  counts: AdminDashboardCounts;
  initialRewards: PaginatedResult<RewardItem>;
}) {
  const [tab, setTab] = useState<AdminTabId>("rewards");
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const [replySearch, setReplySearch] = useState("");
  const [detectedSuspiciousCount, setDetectedSuspiciousCount] = useState<
    number | null
  >(null);

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
        detectedSuspiciousCount && detectedSuspiciousCount > 0
          ? `Kiểm duyệt Bình luận (${counts.repliesCount} · ${detectedSuspiciousCount} nghi vấn)`
          : `Kiểm duyệt Bình luận (${counts.repliesCount})`,
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
              {detectedSuspiciousCount !== null ? "Nghi vấn buff" : "Bình luận"}
            </span>
            <strong
              className={`text-base font-bold ${
                detectedSuspiciousCount !== null
                  ? detectedSuspiciousCount > 0
                    ? "text-destructive"
                    : "text-success"
                  : "text-foreground"
              }`}
            >
              {detectedSuspiciousCount !== null
                ? detectedSuspiciousCount
                : counts.repliesCount}
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
              onClick={() => {
                setTab(t.id);
                setNotice(null);
              }}
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
          totalRedemptionsCount={counts.redemptionsCount}
          onNotice={setNotice}
        />
      )}
      {tab === "students" && (
        <AdminStudentsTab
          totalStudentsCount={counts.studentsCount}
          onNotice={setNotice}
          onInspectStudentReplies={(email) => {
            setReplySearch(email);
            setTab("replies");
          }}
        />
      )}
      {tab === "threads" && (
        <AdminThreadsTab
          totalThreadsCount={counts.threadsCount}
          onNotice={setNotice}
        />
      )}
      {tab === "replies" && (
        <AdminRepliesAuditTab
          search={replySearch}
          onSearchChange={setReplySearch}
          onSuspiciousCountChange={setDetectedSuspiciousCount}
          onNotice={setNotice}
        />
      )}
      {tab === "feedbacks" && (
        <AdminFeedbacksTab
          totalFeedbacksCount={counts.feedbacksCount}
          onNotice={setNotice}
        />
      )}
      {tab === "settings" && (
        <AdminSettingsTab settings={settings} onNotice={setNotice} />
      )}
    </div>
  );
}
