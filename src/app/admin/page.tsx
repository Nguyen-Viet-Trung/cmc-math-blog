import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getAdminDashboardCounts,
  listAdminRewardsPaginated,
} from "@/lib/admin-list-service";
import { getForumRules } from "@/lib/document-service";
import { isDatabaseConfigured } from "@/lib/env";
import {
  getCurrentUserProfile,
  getSiteSettings,
} from "@/lib/forum-service";
import { AdminDashboardClient } from "./AdminDashboardClient";
import { normalizeAdminTab } from "./_components/admin-tabs";

export default async function AdminPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; create?: string }>;
}) {
  const dbReady = isDatabaseConfigured();
  const [user, sp] = await Promise.all([
    getCurrentUserProfile(),
    searchParams,
  ]);

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
            <Link href="/login?next=/admin">Đi tới Đăng nhập</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const initialTab = normalizeAdminTab(sp.tab);
  const autoOpenCreate = sp.create === "1";

  // Chỉ tải cấu hình, bộ đếm tổng quan và dữ liệu của đúng tab đang mở ở SSR;
  // các tab khác được code-split và lazy-fetch qua /api/admin/list khi Admin chuyển tab.
  const [settings, counts, initialRewards, initialRules] = await Promise.all([
    getSiteSettings(),
    getAdminDashboardCounts(),
    initialTab === "rewards"
      ? listAdminRewardsPaginated({ page: 1, pageSize: 8 })
      : Promise.resolve(undefined),
    initialTab === "rules" ? getForumRules() : Promise.resolve(undefined),
  ]);

  return (
    <AdminDashboardClient
      isDemo={!dbReady}
      settings={settings}
      counts={counts}
      initialRewards={initialRewards}
      initialRules={initialRules}
      initialTab={initialTab}
      autoOpenCreate={autoOpenCreate}
    />
  );
}
