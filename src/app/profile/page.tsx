import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ChangePasswordCard } from "@/app/profile/_components/ChangePasswordCard";
import { NotificationPreferencesCard } from "@/app/profile/_components/NotificationPreferencesCard";
import { UserBadgesCabinet } from "@/components/CampaignBadgePill";
import { Button } from "@/components/ui/button";
import { listUserEarnedBadges } from "@/lib/campaign-service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getCurrentUserId,
  getCurrentUserProfile,
} from "@/lib/forum-service";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login?next=/profile");
  }
  const [user, badges] = await Promise.all([
    getCurrentUserProfile(),
    listUserEarnedBadges(userId),
  ]);
  if (!user) {
    redirect("/login?next=/profile");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="heading-1">Hồ sơ cá nhân</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quản lý thông tin học sinh và tủ huy hiệu hiển thị công khai.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href={`/members/${user.id}`} prefetch={false}>
            <ExternalLink className="h-3.5 w-3.5" />
            Xem hồ sơ công khai
          </Link>
        </Button>
      </div>
      <ProfileForm user={user} />
      <UserBadgesCabinet id="badges" badges={badges} showRewardStatus />
      {isFeatureEnabled("notificationPrefs") && (
        <NotificationPreferencesCard initialPrefs={user.notificationPrefs} />
      )}
      <ChangePasswordCard />
    </div>
  );
}
