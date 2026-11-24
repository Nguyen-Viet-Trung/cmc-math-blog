import type { Metadata } from "next";
import Link from "next/link";
import { Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { listPublishedCampaigns } from "@/lib/campaign-service";
import { CampaignCard } from "./_components/CampaignCard";
import { CampaignsAdminAction } from "./_components/CampaignsAdminAction";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Giải đấu & Huy hiệu",
  description:
    "Tham gia các giải đấu Toán học theo mùa, chinh phục thử thách được Ban Quản Trị phê duyệt để nhận điểm thưởng, phần quà và Huy hiệu danh dự.",
};

export default async function CampaignsPage() {
  const campaigns = await listPublishedCampaigns();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="heading-1">Giải đấu &amp; Huy hiệu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hoàn thành các bài thử thách trong thời gian diễn ra giải đấu để tự
            động nhận Award (điểm thưởng, quà tặng) và Huy hiệu gắn lên hồ sơ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {campaigns.length} giải đấu
          </span>
          <CampaignsAdminAction label="Quản lý Giải đấu" />
        </div>
      </header>

      {campaigns.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Medal aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Chưa có Giải đấu Toán học nào được mở</EmptyTitle>
            <EmptyDescription>
              Ban Quản Trị sẽ sớm phát động các chiến dịch giải Toán kèm hệ
              thống Award (điểm thưởng, quà tặng) và Huy hiệu vinh danh tại đây.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm">
              <Link href="/" prefetch={false}>
                Quay lại Diễn đàn
              </Link>
            </Button>
            <CampaignsAdminAction label="Tạo giải đấu đầu tiên" openCreate />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {campaigns.map((camp) => (
            <CampaignCard key={camp.id} camp={camp} />
          ))}
        </div>
      )}
    </div>
  );
}
