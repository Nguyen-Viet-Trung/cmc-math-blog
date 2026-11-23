import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getAdminDashboardCounts,
  listAdminFeedbacksPaginated,
  listAdminRedemptionsPaginated,
  listAdminRewardsPaginated,
  listAdminStudentsPaginated,
  listAdminThreadsPaginated,
} from "@/lib/admin-list-service";
import { isDatabaseConfigured } from "@/lib/env";
import {
  getCurrentUserProfile,
  getSiteSettings,
  listAllRepliesForAdmin,
} from "@/lib/forum-service";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminPortalPage() {
  const dbReady = isDatabaseConfigured();
  const user = await getCurrentUserProfile();

  if (dbReady && (!user || user.role !== "admin")) {
    return (
      <Card className="mx-auto max-w-lg space-y-3 border-destructive/30 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="heading-3">
          Khu vực dành riêng cho Quản trị viên (Admin Portal)
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Trang này chỉ dành cho tài khoản Ban Quản Trị câu lạc bộ. Vui lòng
          đăng nhập bằng tài khoản Quản trị viên hoặc liên hệ Ban Chủ Nhiệm nếu
          bạn cần được cấp quyền truy cập.
        </p>
        <div className="pt-1">
          <Button asChild size="sm">
            <Link href="/login">Đi tới Đăng nhập</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const [
    settings,
    counts,
    initialRewards,
    initialRedemptions,
    initialStudents,
    initialFeedbacks,
    initialThreads,
    replies,
  ] = await Promise.all([
    getSiteSettings(),
    getAdminDashboardCounts(),
    listAdminRewardsPaginated({ page: 1, pageSize: 8 }),
    listAdminRedemptionsPaginated({ page: 1, pageSize: 10 }),
    listAdminStudentsPaginated({ page: 1, pageSize: 15 }),
    listAdminFeedbacksPaginated({ page: 1, pageSize: 10 }),
    listAdminThreadsPaginated({ page: 1, pageSize: 12 }),
    listAllRepliesForAdmin(200),
  ]);

  return (
    <AdminDashboardClient
      isDemo={!dbReady}
      settings={settings}
      counts={counts}
      initialRewards={initialRewards}
      initialRedemptions={initialRedemptions}
      initialStudents={initialStudents}
      initialFeedbacks={initialFeedbacks}
      initialThreads={initialThreads}
      replies={replies}
    />
  );
}
