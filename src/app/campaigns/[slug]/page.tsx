import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCampaignDetailBySlug,
  getViewerCampaignProgressBySlug,
  type ViewerCampaignProgress,
} from "@/lib/campaign-service";
import { formatDateVNLocal } from "@/lib/format";
import {
  getCurrentUserId,
  getCurrentUserProfile,
} from "@/lib/forum-service";
import { CampaignsAdminAction } from "../_components/CampaignsAdminAction";
import { CampaignAwardsSection } from "./_components/CampaignAwardsSection";
import { CampaignHallOfFame } from "./_components/CampaignHallOfFame";
import { CampaignHeroCard } from "./_components/CampaignHeroCard";
import { CampaignThreadsSection } from "./_components/CampaignThreadsSection";

const EMPTY_PROGRESS: ViewerCampaignProgress = {
  completedThreadIds: [],
  grantedAwards: {},
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const camp = await getCampaignDetailBySlug(slug);
  if (!camp) {
    return { title: "Không tìm thấy Giải đấu" };
  }
  return {
    title: camp.title,
    description:
      camp.description ||
      `Giải đấu Toán học diễn ra từ ${formatDateVNLocal(camp.startsAt)} đến ${formatDateVNLocal(camp.endsAt)} với ${camp.threadCount} thử thách và ${camp.awardCount} mốc thưởng.`,
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewerId = await getCurrentUserId();

  const [publicCamp, progress] = await Promise.all([
    getCampaignDetailBySlug(slug),
    viewerId
      ? getViewerCampaignProgressBySlug(slug, viewerId)
      : Promise.resolve(EMPTY_PROGRESS),
  ]);

  let camp = publicCamp;
  if (!camp && viewerId) {
    const profile = await getCurrentUserProfile();
    if (profile?.role === "admin") {
      camp = await getCampaignDetailBySlug(slug, true);
    }
  }

  if (!camp) {
    notFound();
  }

  const completedSet = new Set(progress.completedThreadIds);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/campaigns" prefetch={false}>
            <ArrowLeft className="h-4 w-4" />
            Tất cả Giải đấu
          </Link>
        </Button>
        <CampaignsAdminAction label="Chỉnh sửa Giải đấu" />
      </div>

      <CampaignHeroCard
        camp={camp}
        viewerId={viewerId}
        completedCount={completedSet.size}
      />

      <CampaignAwardsSection
        awards={camp.awards}
        viewerId={viewerId}
        completedCount={completedSet.size}
        grantedAwards={progress.grantedAwards}
      />

      <CampaignThreadsSection
        items={camp.items}
        completedThreadIds={completedSet}
      />

      <CampaignHallOfFame grants={camp.recentGrants} />
    </div>
  );
}
