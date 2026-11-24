"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboardCounts } from "@/lib/admin-list-service";
import type { PaginatedResult } from "@/lib/pagination";
import type { ForumDocument, RewardItem, SiteSettings } from "@/lib/types";
import { AdminRewardsTab, type AdminNotice } from "./_components/AdminRewardsTab";
import {
  AdminSubNav,
  buildAdminNavGroups,
  type AdminTabId,
} from "./_components/AdminSubNav";

function AdminTabSkeleton() {
  return (
    <Card className="space-y-3 p-5">
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
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

const AdminRulesTab = dynamic(
  () => import("./_components/AdminRulesTab").then((m) => m.AdminRulesTab),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminCollectionsTab = dynamic(
  () =>
    import("./_components/AdminCollectionsTab").then(
      (m) => m.AdminCollectionsTab
    ),
  { loading: () => <AdminTabSkeleton /> }
);

const AdminCampaignsTab = dynamic(
  () =>
    import("./_components/AdminCampaignsTab").then(
      (m) => m.AdminCampaignsTab
    ),
  { loading: () => <AdminTabSkeleton /> }
);

export function AdminDashboardClient({
  isDemo,
  settings,
  counts,
  initialRewards,
  initialRules,
  initialTab = "rewards",
  autoOpenCreate = false,
}: {
  isDemo: boolean;
  settings: SiteSettings;
  counts: AdminDashboardCounts;
  initialRewards?: PaginatedResult<RewardItem>;
  initialRules?: ForumDocument;
  initialTab?: AdminTabId;
  autoOpenCreate?: boolean;
}) {
  const [tab, setTab] = useState<AdminTabId>(initialTab);
  const [pendingCreate, setPendingCreate] = useState(autoOpenCreate);
  const [notice, setNotice] = useState<AdminNotice | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (autoOpenCreate) {
      setPendingCreate(true);
    }
  }, [autoOpenCreate]);
  const [replySearch, setReplySearch] = useState("");
  const [detectedSuspiciousCount, setDetectedSuspiciousCount] = useState<
    number | null
  >(null);

  const navGroups = useMemo(
    () => buildAdminNavGroups(counts, detectedSuspiciousCount),
    [counts, detectedSuspiciousCount]
  );

  const activeMeta = useMemo(() => {
    for (const g of navGroups) {
      const found = g.items.find((i) => i.id === tab);
      if (found) return found;
    }
    return navGroups[0].items[0];
  }, [navGroups, tab]);

  function handleSelectTab(next: AdminTabId) {
    setTab(next);
    setPendingCreate(false);
    setNotice(null);
    if (typeof window !== "undefined") {
      const nextUrl = next === "rewards" ? "/admin" : `/admin?tab=${next}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }

  const handleConsumedCollectionsCreate = useCallback(() => {
    setPendingCreate(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/admin?tab=collections");
    }
  }, []);

  const handleConsumedCampaignsCreate = useCallback(() => {
    setPendingCreate(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/admin?tab=campaigns");
    }
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <h1 className="heading-1">Admin Portal</h1>
          <p className="text-sm text-muted-foreground">
            {isDemo
              ? "Đang ở chế độ chưa kết nối cơ sở dữ liệu."
              : "Trung tâm quản trị thành viên, kiểm duyệt nội dung, chuyên đề và cửa hàng đổi quà."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 rounded-lg border border-border bg-card px-4 py-2 text-xs tabular-nums">
          <button
            type="button"
            onClick={() => handleSelectTab("students")}
            className="text-left transition-opacity hover:opacity-80"
          >
            <span className="block text-[11px] text-muted-foreground">
              Học sinh
            </span>
            <strong className="text-base font-bold text-foreground">
              {counts.studentsCount}
            </strong>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab("redemptions")}
            className="border-l border-border pl-4 text-left transition-opacity hover:opacity-80"
          >
            <span className="block text-[11px] text-muted-foreground">
              Đơn chờ duyệt
            </span>
            <strong className="text-base font-bold text-bounty">
              {counts.pendingRedemptionsCount}
            </strong>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab("replies")}
            className="border-l border-border pl-4 text-left transition-opacity hover:opacity-80"
          >
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
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[216px_minmax(0,1fr)]">
        <AdminSubNav
          groups={navGroups}
          activeTab={tab}
          onSelect={handleSelectTab}
        />

        <section className="min-w-0 space-y-4">
          <div className="border-b border-border/70 pb-3">
            <h2 className="heading-3">{activeMeta.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activeMeta.description}
            </p>
          </div>

          {notice && (
            <Alert
              variant={notice.type === "success" ? "success" : "destructive"}
              className="flex items-start justify-between gap-3 font-medium"
            >
              <span>{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Đóng thông báo"
                className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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
          {tab === "collections" && (
            <AdminCollectionsTab
              onNotice={setNotice}
              autoOpenCreate={pendingCreate}
              onConsumedAutoOpen={handleConsumedCollectionsCreate}
            />
          )}
          {tab === "campaigns" && (
            <AdminCampaignsTab
              onNotice={setNotice}
              autoOpenCreate={pendingCreate}
              onConsumedAutoOpen={handleConsumedCampaignsCreate}
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
          {tab === "rules" && (
            <AdminRulesTab initialRules={initialRules} onNotice={setNotice} />
          )}
          {tab === "settings" && (
            <AdminSettingsTab settings={settings} onNotice={setNotice} />
          )}
        </section>
      </div>
    </div>
  );
}
