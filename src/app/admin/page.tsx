import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { listAllFeedbacksForAdmin } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isDatabaseConfigured } from "@/lib/env";
import {
  getCurrentUserProfile,
  getSiteSettings,
  listAllRedemptionsForAdmin,
  listAllRepliesForAdmin,
  listAllRewardsForAdmin,
  listAllStudentsForAdmin,
  listAllThreadsForAdmin,
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
          Hãy đăng nhập bằng tài khoản email trùng với cấu hình{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
            ADMIN_EMAIL
          </code>{" "}
          trong file <code className="font-mono text-foreground">key.txt</code>{" "}
          để được hệ thống tự động cấp quyền Admin.
        </p>
        <div className="pt-1">
          <Button asChild size="sm">
            <Link href="/login">Đi tới Đăng nhập</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const [settings, rewards, redemptions, students, feedbacks, replies, threads] =
    await Promise.all([
      getSiteSettings(),
      listAllRewardsForAdmin(),
      listAllRedemptionsForAdmin(),
      listAllStudentsForAdmin(),
      listAllFeedbacksForAdmin(),
      listAllRepliesForAdmin(200),
      listAllThreadsForAdmin(150),
    ]);

  return (
    <AdminDashboardClient
      isDemo={!dbReady}
      settings={settings}
      rewards={rewards}
      redemptions={redemptions}
      students={students}
      feedbacks={feedbacks}
      replies={replies}
      threads={threads}
    />
  );
}
