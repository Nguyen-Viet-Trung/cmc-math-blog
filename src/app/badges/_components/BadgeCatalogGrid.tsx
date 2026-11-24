import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Gift,
  Sparkles,
  Users,
} from "lucide-react";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCampaignPhase } from "@/lib/campaign-rules";
import type { PublicBadgeCatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const PHASE_BADGE_MAP = {
  active: { label: "Đang mở", variant: "success" as const },
  upcoming: { label: "Sắp mở", variant: "bounty" as const },
  ended: { label: "Đã kết thúc", variant: "subtle" as const },
};

export function BadgeCatalogGrid({
  badges,
  earnedAwardIds,
  nowMs,
}: {
  badges: PublicBadgeCatalogItem[];
  earnedAwardIds: ReadonlySet<string>;
  nowMs: number;
}) {
  if (badges.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Award aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Chưa có huy hiệu nào được công bố</EmptyTitle>
          <EmptyDescription>
            Khi giáo viên phát động Giải đấu kèm Award và Huy hiệu, toàn bộ bộ
            sưu tập sẽ xuất hiện tại đây để bạn theo dõi và chinh phục.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {badges.map((item) => {
        const owned = earnedAwardIds.has(item.awardId);
        const phase = getCampaignPhase(
          item.campaignStartsAt,
          item.campaignEndsAt,
          nowMs
        );
        const phaseMeta = PHASE_BADGE_MAP[phase];

        return (
          <Link
            key={item.awardId}
            href={`/campaigns/${item.campaignSlug}`}
            prefetch={false}
            className="group block"
          >
            <Card
              className={cn(
                "flex h-full flex-col justify-between gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-muted/20",
                owned && "border-success-border/70 bg-success-surface/15"
              )}
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CampaignBadgePill
                    name={item.badgeName}
                    icon={item.badgeIcon}
                    color={item.badgeColor}
                    size="md"
                  />
                  {owned ? (
                    <Badge variant="success" className="text-[10px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Đã sở hữu
                    </Badge>
                  ) : (
                    <Badge variant={phaseMeta.variant} className="text-[10px]">
                      {phaseMeta.label}
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                    {item.awardTitle}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                    Giải đấu: {item.campaignTitle}
                  </p>
                  {item.awardDescription && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.awardDescription}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-2.5 text-[11px]">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-medium text-foreground">
                    Điều kiện: {item.requiredCompletedCount} thử thách
                  </span>
                  {item.bonusPoints > 0 && (
                    <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-bounty">
                      <Sparkles className="h-3 w-3" />+{item.bonusPoints}đ
                    </span>
                  )}
                </div>

                {item.rewardName && (
                  <p className="inline-flex max-w-full items-center gap-1 font-medium text-foreground">
                    <Gift className="h-3 w-3 shrink-0 text-bounty" />
                    <span className="truncate">Quà: {item.rewardName}</span>
                  </p>
                )}

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Users className="h-3 w-3" />
                    {item.grantedCount} thành viên đã đạt
                  </span>
                  <span className="font-medium text-primary opacity-80 group-hover:opacity-100">
                    Xem giải đấu →
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
